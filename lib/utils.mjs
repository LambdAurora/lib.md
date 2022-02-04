/*
 * Copyright © 2021-2022 LambdAurora <email@lambdaurora.dev>
 *
 * This file is part of lib.md.
 *
 * Licensed under the MIT license. For more information,
 * see the LICENSE file.
 */

const WHITESPACE_CHARACTER_REGEX = /^\s+$/;

export const NEW_LINE_CODE_POINT = "\n".codePointAt(0);
export const TAG_START_CODE_POINT = "<".codePointAt(0);
export const TAG_END_CODE_POINT = ">".codePointAt(0);
export const UNDERSCORE_CODE_POINT = "_".codePointAt(0);

/*
 * Object stuff
 */

/**
 * Merges the properties of two objects and will keep intact the properties of the target object.
 *
 * @param {Object} source the source object
 * @param {Object} target the target object
 * @return {Object} the merged object
 */
export function merge_objects(source, target) {
	if (source === null || source === undefined) {
		return target;
	} else if (target === null || target === undefined) {
		target = {};
	}
	Object.keys(source).forEach(key => {
		if (target[key] === undefined) {
			target[key] = source[key];
		} else if (typeof target[key] === "object")  {
			target[key] = merge_objects(source[key], target[key]);
		}
	});
	return target;
}

/**
 * Clones a regular expression object.
 *
 * @param {RegExp} input the regular expression to clone
 */
export function clone_regexp(input) {
	const pattern = input.source;
	let flags = "";

	if (input.global) {
		flags += "g";
	}
	if (input.ignoreCase) {
		flags += "i";
	}
	if (input.multiline) {
		flags += "m";
	}

	return new RegExp(pattern, flags);
}

/*
 * HTML stuff
 */

export function purge_inline_html(html) {
	let regex = /<\/?(?:(?:iframe)|(?:noembed)|(?:noframes)|(?:plaintext)|(?:script)|(?:style)|(?:textarea)|(?:title)|(?:xmp)).*?\>/gi;
	let current;
	while (current = regex.exec(html)) {
		html = html.substr(0, current.index) + "&lt;" + html.substr(current.index + 1);
	}
	return html;
}

/*
 * Character stuff
 */

/**
 * Returns whether the character at the specified index in the input string matches the given character.
 *
 * @param {string} input the input string
 * @param {string|number} character the character to compare
 * @param {number} index the character index in the input string
 * @returns `true` if it matches, otherwise `false`
 * @since 1.3.0
 */
export function is_character_match(input, character, index = 0) {
	if (index < 0 || index >= input.length) {
		return false;
	}

	if (typeof character === "number") { // it's a codepoint
		return input.codePointAt(index) === character;
	} else {
		return input[index] === character;
	}
}

/**
 * Returns whether the character at the specified index in the input string is an alpha character.
 *
 * @param {string} input the input string
 * @param {number} index the character index in the input string
 * @returns `true` if the character is alpha, otherwise `false`
 * @since 1.4.0
 */
export function is_alpha(input, index = 0) {
	if (index < 0 || index >= input.length) {
		return false;
	}

	let c = input.codePointAt(index);
	return (c >= 65 && c <= 90) || (c >= 97 && c <= 122);
}

/**
 * Returns whether the character at the specified index in the input string is a numeric character.
 *
 * @param {string} input the input string
 * @param {number} index the character index in the input string
 * @returns `true` if the character is numeric, otherwise `false`
 * @since 1.4.0
 */
export function is_numeric(input, index = 0) {
	if (index < 0 || index >= input.length) {
		return false;
	}

	let c = input.codePointAt(index);
	return c >= 0x30 && c <= 0x39;
}

/**
 * Returns whether the character at the specified index in the input string is a non-ASCII character.
 *
 * @param {string} input the input string
 * @param {number} index the character index in the input string
 * @returns `true` if the character is non-ASCII, otherwise `false`
 * @since 1.4.0
 */
export function is_non_ascii(input, index = 0) {
	if (index < 0 || index >= input.length) {
		return false;
	}

	return input.codePointAt(index) >= 128; // ASCII only has 128 characters.
}

/**
 * Returns whether the given string is only made of whitespaces.
 *
 * @param {string} input the input string
 * @return `true` if the input string is whitespaces, otherwise `false`
 */
export function is_whitespace(input) {
	return WHITESPACE_CHARACTER_REGEX.test(input);
}
