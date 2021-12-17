/*
 * Copyright © 2021 LambdAurora <aurora42lambda@gmail.com>
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

export function purge_inline_html(html) {
	let regex = /<\/?(?:(?:iframe)|(?:noembed)|(?:noframes)|(?:plaintext)|(?:script)|(?:style)|(?:textarea)|(?:title)|(?:xmp)).*?\>/gi;
	let current;
	while (current = regex.exec(html)) {
		html = html.substr(0, current.index) + "&lt;" + html.substr(current.index + 1);
	}
	return html;
}

/**
 * Returns whether the character at the specified index in the input string matches the given character.
 *
 * @param {string} input the input string
 * @param {string|number} character the character to compare
 * @param {number} index the character index in the input string
 * @returns `true` if it matches, otherwise `false
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
 * Returns whether the given string is only made of whitespaces.
 *
 * @param {string} input the input string
 * @return `true` if the input string is whitespaces, otherwise `false`
 */
export function is_whitespace(input) {
	return WHITESPACE_CHARACTER_REGEX.test(input);
}
