/*
 * Copyright © 2021-2022 LambdAurora <email@lambdaurora.dev>
 *
 * This file is part of lib.md.
 *
 * Licensed under the MIT license. For more information,
 * see the LICENSE file.
 */

import { clone_regexp, is_character_match, is_whitespace, merge_objects, UNDERSCORE_CODE_POINT } from "./utils.mjs";

/**
 * Represents a token with a token type and the corresponding text for parsing.
 *
 * @version 1.4.0
 * @since 1.4.0
 */
export class Token {
	/* Class attributes:
	type: TokenType;
	text: string;
	offset: number;
	data: object;
	*/

	/**
	 * @param {TokenType} type the type of the token
	 * @param {string} text the text of the token
	 * @param {number} offset the offset of the token in the source
	 * @param {object} data additional data associated with the token
	 */
	constructor(type, text, offset, data = {}) {
		this.type = type;
		this.text = text;
		this.offset = offset;
		this.data = data;
	}

	toString() {
		return `Token { type: ${this.type.toString()}, text: "${this.text}", offset: ${this.offset}, data: ${this.data} }`;
	}
}

/**
 * Represents an unknown token exception.
 * <p>
 * Thrown when the lexer encounters a non-whitespace character and cannot associate it with a token type.
 *
 * @version  1.4.0
 * @since 1.4.0
 */
export class UnknownTokenError extends Error {
	/* Class attributes:
	error_offset: number;
	*/

	constructor(message, offset) {
		super(message + ", at " + offset);
		this.error_offset = offset;
	}
}

/*
 * Matchers
 */

export const TokenMatcher = Object.freeze({
	/**
	 * Returns a new token matcher from the given character.
	 *
	 * @param {string} character the character to match
	 * @param {boolean} require_whitespace_to_separate `true` if whitespace is required to separate tokens, otherwise `false`
	 * @returns {function(string): number} the matcher
	 */
	of_character: function(character, require_whitespace_to_separate = true) {
		const codePoint = character.codePointAt(0);
		return (input) => {
			if (is_character_match(input, codePoint)) {
				if (require_whitespace_to_separate && is_character_match(input, codePoint, 1)) return null; // Might be a double character token.
				return 1;
			} else return null;
		};
	},
	/**
	 * Returns a new token matcher from the given string.
	 *
	 * @param {string} string the string to match
	 * @returns {function(string): number} the matcher
	 */
	of_string: function(string) {
		return (input) => {
			if (input.startsWith(string)) return string.length;
			return null;
		}
	},
	/**
	 * Returns a new token matcher from the given regular expression.
	 *
	 * @param {RegExp} regex the regular expression to match
	 * @returns {function(string): number} the matcher
	 */
	of_regex: function(regex) {
		if (regex.global) {
			throw new Error("Cannot accept a global RegEx for a RegEx Token Matcher.");
		}

		return (input) => {
			const result = clone_regexp(regex).exec(input);
			if (result) return { length: result[0].length, regex_result: result };
			return null;
		}
	},
	/**
	 * Matches a newline character (CRLF, LF, CR, or `\f`).
	 *
	 * @param {string} input the input string to match
	 * @param {number} index the position where to match the newline in the input string
	 * @returns {number|null} the length of the matched newline character, otherwise `null`
	 */
	match_newline: function(input, index = 0) {
		if (input.startsWith("\r\n", index)) {
			return 2;
		} else if (is_character_match(input, "\n", index) || is_character_match(input, "\r", index) || is_character_match(input, "\f", index)) {
			return 1;
		} else {
			return null;
		}
	},
	/**
	 * Matches a whitespace character.
	 *
	 * @param {string} input the input string to match
	 * @param {number} index the position where to match the whitespace character in the input string
	 * @returns {number|null} the length of the matched whitespace character, otherwise `null`
	 */
	match_whitespace: function(input, index = 0) {
		if (is_character_match(input, 0x20, index) || is_character_match(input, "\t", index))
			return 1;
		return TokenMatcher.match_newline(input, index);
	},
	match_while: (input, char_matcher, i = 0) => {
		while (i < input.length) {
			if (!char_matcher(input.codePointAt(i))) break;
			i++;
		}

		return i;
	},
	match_binary: (input, i = 0) => TokenMatcher.match_while(input, is_valid_binary_character, i),
	match_octal: (input, i = 0) => TokenMatcher.match_while(input, is_valid_octal_character, i),
	match_hex: (input, i = 0) => TokenMatcher.match_while(input, is_valid_hex_character, i),
	match_decimal: (input, i = 0) => TokenMatcher.match_while(input, is_valid_decimal_character, i),
	match_decimal_literal: (input, i = 0) => {
		if (i >= input.length) return i;

		const c = input.codePointAt(i);
		if (!is_valid_decimal_character(c) || c === UNDERSCORE_CODE_POINT)
			return i;

		return TokenMatcher.match_decimal(input, i + 1);
	},
	of_number_literal: (options) => {
		options = merge_objects({ float: false, complex: false }, options);
		return (input) => {
			if (input.startsWith("0b"))
				return { length: TokenMatcher.match_binary(input, 2), get_number_text: (token) => token.text.substr(2) };
			else if (input.startsWith("0o"))
				return { length: TokenMatcher.match_octal(input, 2), get_number_text: (token) => token.text.substr(2) };
			else if (input.startsWith("0x"))
				return { length: TokenMatcher.match_hex(input, 2), get_number_text: (token) => token.text.substr(2) };

			let i = TokenMatcher.match_decimal_literal(input, 0);

			if (i === 0) return null;
			else if (i >= input.length) return { length: i, get_number_text: (token) => token.text };
			else if (is_character_match(input, ".", i)) {
				if (!options.float)
					return { length: i, get_number_text: (token) => token.text };
				// Attempts to match a decimal literal after a dot.
				i = TokenMatcher.match_decimal_literal(input, i + 1);
			}

			if (i >= input.length) return { length: i, get_number_text: (token) => token.text };

			let c = input.codePointAt(i);
			if (c === 69 || c === 0x65) { // e or E
				i++;

				if (i >= input.length) return { length: i, get_number_text: (token) => token.text };

				c = input.codePointAt(i);
				if (c === 0x2b || c === 0x2d) i++; // + or -

				i = TokenMatcher.match_decimal(input, i);
			}

			if (i >= input.length || !options.complex) return { length: i, get_number_text: (token) => token.text };

			c = input.codePointAt(i);
			if (c === 0x69) i++; // i for imaginary

			return { length: i, get_number_text: (token) => token.text };
		}
	}
});

function is_valid_binary_character(c) {
	if (typeof c === "string") {
		c = c.codePointAt(0);
	}

	return c === 0x30 || c === 0x31 || c === UNDERSCORE_CODE_POINT;
}

function is_valid_octal_character(c) {
	if (typeof c === "string") {
		c = c.codePointAt(0);
	}

	return (c >= 0x30 && c < 0x38) || c === UNDERSCORE_CODE_POINT;
}

function is_valid_hex_character(c) {
	if (typeof c === "string") {
		c = c.codePointAt(0);
	}

	return is_valid_decimal_character(c) || (c >= 65 && c <= 70) || (c >= 0x61 && c <= 0x66); // Between a and f, or A and F.
}

function is_valid_decimal_character(c) {
	if (typeof c === "string") {
		c = c.codePointAt(0);
	}

	return (c >= 0x30 && c <= 0x39) || c === UNDERSCORE_CODE_POINT;
}

/*
 * Token Types
 */

/**
 * Represents a token type.
 * <p>
 * Each token type has a {@link TokenMatcher} to match the token in a string.
 *
 * @version 1.4.0
 * @since 1.4.0
 */
export class TokenType {
	/* Class attributes:
	name: string;
	matcher: (input: string) => null|number|{length: number, optional_data?};
	options: any;
	*/

	/**
	 * @param {string} name the name of the token type
	 * @param {function(string): null|number|{length: number, optional_data?}} matcher the matcher of the token type
	 * @param {any} options additional data
	 */
	constructor(name, matcher, options = {}) {
		this.name = name;
		this.matcher = matcher;
		this.options = options;
	}

	/**
	 * Attempts to match this token type with the given input string.
	 *
	 * @param {string} input the input string to attempt to match
	 * @return {null|{length: number, optional_data?}} the result of the match
	 */
	match(input) {
		const result = this.matcher(input);

		if (typeof result === "number")
			return { length: result };

		return result;
	}

	toString() {
		return `TokenType { name: "${this.name}", options: ${this.options} }`;
	}
}

export const EOF_TOKEN_TYPE = new TokenType("EOF", TokenMatcher.of_character("\0"));

/*
 * Lexer
 */

/**
 * Represents a lexer.
 *
 * @version 1.4.0
 * @since 1.4.0
 */
export class Lexer {
	/* Class attributes:
	token_types: TokenType[];
	text: string;
	index: number;
	current: Token;
	*/

	/**
	 * @param {TokenType[]} token_types the token types this lexer accepts
	 * @param {string} text the input string
	 */
	constructor(token_types, text) {
		this.token_types = token_types;
		this.text = text;
		this.index = 0;
		this.current = new Token(EOF_TOKEN_TYPE, "", this.text.length);

		this.pick_next();
	}

	has_next() {
		return this.current.type !== EOF_TOKEN_TYPE;
	}

	next() {
		const current = this.current;
		this.pick_next();
		return { done: current.type === EOF_TOKEN_TYPE, value: current };
	}

	reset() {
		this.index = 0;
		this.pick_next();
	}

	to_array() {
		const last_index = this.index;
		const last_current = this.current;
		this.reset();

		const array = [...this];

		this.index = last_index;
		this.current = last_current;
		return array;
	}

	[Symbol.iterator]() {
		return this;
	}

	pick_next() {
		while (this.index < this.text.length) {
			const part = this.text.substr(this.index);

			for (const type of this.token_types) {
				const result = type.match(part);

				if (result && result.length > 0) {
					this.current = new Token(type, part.substr(0, result.length), this.index, result);

					this.index += result.length;

					return;
				}
			}

			if (!is_whitespace(part.charAt(0))) {
				throw new UnknownTokenError("Unknown token start character \"" + part.charAt(0) + "\"", this.index);
			}

			this.index++;
		}

		this.current = new Token(EOF_TOKEN_TYPE, "", this.text.length);
	}
}

/*
 * Parser
 */

export class TokenizedParser {

}
