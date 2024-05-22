/*
 * Copyright 2024 LambdAurora <email@lambdaurora.dev>
 *
 * This file is part of lib.md.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const WHITESPACE_CHARACTER_REGEX = /^\s+$/;

/**
 * Represents the new line code point.
 */
export const NEW_LINE_CODE_POINT: number = "\n".codePointAt(0)!;
/**
 * Represents the underscore code point.
 */
export const UNDERSCORE_CODE_POINT: number = "_".codePointAt(0)!;

/*
 * Object stuff
 */

/**
 * Clones a regular expression object.
 *
 * @param input the regular expression to clone
 * @returns the cloned regular expression
 */
export function clone_regexp(input: RegExp): RegExp {
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

/**
 * Represents a suggestion of the HTML tags to purge in a user-editable document.
 *
 * @version 2.0.0
 * @since 1.9.0
 */
export const HTML_TAGS_TO_PURGE_SUGGESTION: readonly string[] = Object.freeze([
	"iframe", "noembed", "noframes", "plaintext", "script", "style", "svg", "textarea", "title", "xmp"
]);

/**
 * Purges the given HTML source of some specific tags in a markdown context.
 *
 * @param html the HTML to purge
 * @param disallowed_tags HTML tags to purge
 * @returns the purged HTML
 */
export function purge_inline_html(html: string, disallowed_tags: readonly string[] = HTML_TAGS_TO_PURGE_SUGGESTION): string {
	const regex = new RegExp(`</?(${disallowed_tags.join("|")}).*?>`, "gi");
	let current;
	while ((current = regex.exec(html))) {
		html = html.substring(0, current.index) + "&lt;" + html.substring(current.index + 1);
	}
	return html;
}

/**
 * Returns the given text as a valid anchor name.
 *
 * @param text the text to convert as a valid anchor name
 * @returns the anchor name
 * @version 2.0.0
 * @since 1.9.6
 */
export function to_anchor_name(text: string): string {
	return encodeURI(text).replace(/%20/g, "-").toLocaleLowerCase();
}

/*
 * Character stuff
 */

/**
 * Returns whether the character at the specified index in the input string is an alpha character.
 *
 * @param input the input string
 * @param index the character index in the input string
 * @returns `true` if the character is alpha, otherwise `false`
 * @since 1.4.0
 */
export function is_alpha(input: string, index: number = 0): boolean {
	if (index < 0 || index >= input.length) {
		return false;
	}

	const c = input.codePointAt(index)!;
	return (c >= 65 && c <= 90) || (c >= 97 && c <= 122);
}

/**
 * Returns whether the character at the specified index in the input string is a numeric character.
 *
 * @param input the input string
 * @param index the character index in the input string
 * @returns `true` if the character is numeric, otherwise `false`
 * @since 1.4.0
 */
export function is_numeric(input: string, index: number = 0): boolean {
	if (index < 0 || index >= input.length) {
		return false;
	}

	const c = input.codePointAt(index)!;
	return c >= 0x30 && c <= 0x39;
}

/**
 * Returns whether the character at the specified index in the input string is a non-ASCII character.
 *
 * @param input the input string
 * @param index the character index in the input string
 * @returns `true` if the character is non-ASCII, otherwise `false`
 * @since 1.4.0
 */
export function is_non_ascii(input: string, index: number = 0): boolean {
	if (index < 0 || index >= input.length) {
		return false;
	}

	return input.codePointAt(index)! >= 128; // ASCII only has 128 characters.
}

/**
 * Returns whether the given string is only made of whitespaces.
 *
 * @param input the input string
 * @return `true` if the input string is whitespaces, otherwise `false`
 */
export function is_whitespace(input: string): boolean {
	return WHITESPACE_CHARACTER_REGEX.test(input);
}
