/*
 * Copyright © 2021-2022 LambdAurora <email@lambdaurora.dev>
 *
 * This file is part of lib.md.
 *
 * Licensed under the MIT license. For more information,
 * see the LICENSE file.
 */

import * as md from "./markdown.mjs";
import * as html from "../html.mjs";
import {is_whitespace, merge_objects, purge_inline_html} from "../utils.mjs";

const DEFAULT_OPTIONS = {
	allow_escape: true,
	auto_link: false,
	checkbox: true,
	code_block_from_indent: false,
	emoji: {
		enabled: true,
		dictionary: [],
		skin_tones: true
	},
	highlight: true,
	image: true,
	latex: false,
	link: true,
	list: true,
	newline_as_linebreaks: false,
	spoiler: true,
	table: true,
	table_of_contents: true,
	underline: true
};

const CODE_BLOCK_INDENT_DETECTION_REGEX = /^(?:( {4})|(\t))(?!\s*\*\s*\S+)/
const HORIZONTAL_RULE_REGEX = /^\s*(---+|\*\*\*+|___+)\s*$/
const LIST_DETECTION_REGEX = /^ *(-|\*|\+|\d+\.) +.+/;
const LIST_CHECKBOX_REGEX = /^(\[([Xx ])]\s+).+/i;
const QUOTE_DETECTION_REGEX = /^>\s/;
const QUOTE_MULTILINE_REGEX = /\n\s*>\s/g;
const TABLE_DETECTION_REGEX = /^\s*\|.*\|/;
const TABLE_SEPARATOR_REGEX = /^\s*\|(?:[ \t]*\:?-+\:?[ \t]*\|)+(\s*)$/;
const TABLE_ALIGNMENT_REGEX = /^[ \t]*(:|-)-*(:|-)[ \t]*$/;

const ESCAPED_UNICODE = /^\\(?:u([0-9A-Fa-f]{4}))|(?:x([0-9A-Fa-f]{2}))|(?:U([0-9A-Fa-f]{8}))/;

const COMMENT_START_REGEX = /^\s*<!--/;
const COMMENT_END_REGEX = /-->/;
const INLINE_HTML_DETECTION_REGEX = /^\s*<(\/)?([A-z]+).*>/i;
const INLINE_HTML_OPENER_REGEX = /<([A-z]+).*?>/gi;
const INLINE_HTML_CLOSER_REGEX = /<\/([A-z]+)>/gi;
const INLINE_HTML_SKIP_REGEX = /^<(\/)?([A-z]+).*?>/;
const INLINE_HTML_BR_REGEX = /^<(br)(?: ?\/)?>/;
const INLINE_HTML_SINGLE_TAG = Object.values(html.Tag).filter(tag => tag.self_closing).map(tag => tag.name);
const INLINE_HTML_IGNORE_TAG = ["iframe", "noembed", "noframes", "plaintext", "script", "style", "svg", "textarea", "title", "xmp"];

const INLINE_CODE_REGEX = /^(?:```((?:.|\n)+?)```)|(?:`((?:.|\n)+?)`)/;
const EMOJI_REGEX = /^:([A-z\d\-_+]+):(?::skin-tone-([2-6]):)?/;

// Note: this regex is unused because Firefox doesn't support named groups :c
//const REFERENCE_REGEX = /^\[(?<name>[^\[\]]+)\]: (?<url>[a-z]+\:\/\/[.\S]+)(?: "(?<tooltip>[^"]+)")?$/;
const REFERENCE_REGEX = /^\[([^\[\]]+)]: ((?:(?:(?:[a-z]+\:\/\/)|(?:\.{0,2}\/))[.\S]+)|(?:data\:[.\S]+)|(?:#[.\S]+))(?: "([^"]+)")?$/;

function try_parse_link(input, start) {
	if (input[start] !== "[") {
		return null;
	}

	// Try to determine where the title/alt part ends.
	let counter = 0;
	let i;
	for (i = start + 1; (i < input.length && counter >= 0); i++) {
		if (input[i] === "[")
			counter++;
		else if (input[i] === "]")
			counter--;
	}

	if (counter >= 0)
		return null;

	function get_title() {
		return input.substring(start + 1, i - 1);
	}

	if (i >= input.length) {
		const title = get_title();
		return {title: title, ref_name: title.toLowerCase(), skip: i - start};
	}

	// Now kind it's getting more specific.
	if (input[i] === "(") {
		// URL with tooltip case
		let j;
		counter = 0;
		for (j = i + 1; (j < input.length && counter >= 0); j++) {
			if (input[j] === ")")
				counter--;
		}

		if (j > input.length)
			return null;

		const part = input.substring(i + 1, j - 1).split(" ");
		const url = part.shift();
		let tooltip = part.join(" ");
		if (!tooltip.startsWith('"') || !tooltip.endsWith('"'))
			tooltip = null;
		else
			tooltip = tooltip.substring(1, tooltip.length - 1);

		return {title: get_title(), url: url, tooltip: tooltip, skip: j - start};
	} else if (input[i] === "[") {
		// Reference case.
		let j;
		for (j = i + 1; (j < input.length && input[j] !== "]"); j++) { /* Advance */
		}

		if (j > input.length || j - i === 0)
			return null;

		const reference = input.substring(i + 1, j);
		return {title: get_title(), ref_name: reference.toLowerCase(), skip: j + 1 - start};
	} else if (is_whitespace(input[i]) || /[!"':;?.,]/.test(input[i])) {
		const title = get_title();
		return {title: title, ref_name: title.toLowerCase(), skip: i - start};
	} else {
		return null;
	}
}

function try_parse_url(input, start) {
	if (!(/^[A-z]$/).test(input[start]))
		return null;

	let scheme_separator;
	for (scheme_separator = start; scheme_separator < input.length; scheme_separator++) {
		const char = input[scheme_separator];
		if (char === ":") {
			break;
		} else if (is_whitespace(char)) {
			return null;
		}
	}

	if (scheme_separator === input.length)
		return null;

	const scheme = input.substring(start, scheme_separator);

	let next_index = scheme_separator + 1;
	let authority = "";
	const has_slashes = input.indexOf("//", next_index) === next_index;

	if (scheme === "file" && !has_slashes) {
		return null;
	} else if (has_slashes) {
		next_index += 2;

		let path_separator;
		for (path_separator = next_index; path_separator < input.length; path_separator++) {
			if (input[path_separator] === "/") {
				break;
			} else if (is_whitespace(input[path_separator])) {
				path_separator = -1;
				break;
			}
		}

		if (path_separator !== -1) {
			authority = input.substring(scheme_separator + 3, path_separator); // TODO: check
			next_index = path_separator + 1;
		}
	}

	let length = input.length - start;
	for (let i = next_index; i < input.length; i++) {
		if (is_whitespace(input[i])) {
			length = i - start;
			break;
		}
	}

	if (authority === "" && (scheme !== "file" && scheme !== "mailto" && scheme !== "tel"))
		return null;

	return input.substring(start, start + length);
}

/**
 * Tries to parse a tag in the text at the specified index.
 *
 * @param {string} text the text to parse
 * @param {number} start the tag start index
 * @param {string} delimiter the tag delimiter (1 character)
 * @param {number} delimiter_repeat how many times the tag delimiter character is repeated to form the delimiter
 * @return {{tag: string, skip: number, delimiter_repeat: number}|null} an object if the tag has been parsed successfully, else `null`
 */
function try_parse_tag(text, start, delimiter, delimiter_repeat) {
	const rest = text.substring(start);
	for (let i = 0; i < delimiter_repeat; i++) {
		if (rest[i] !== delimiter)
			return null;
	}

	let found = false;

	let i;
	let saved_i = false;
	for (i = 2; i < rest.length; i++) {
		let result;
		if (rest[i] === "[" && (result = try_parse_link(rest, i))) {
			// Kind of sad that this link is "lostly" parsed.
			// The image check also is done here.
			i += result.skip - 1;
		} else {
			let delimiter_count = 0;
			while (rest[i + delimiter_count] === delimiter) {
				delimiter_count++;
			}
			if (delimiter_count === delimiter_repeat) {
				// yay the end of the tag!
				i++;
				found = true;
				break;
			} else if (delimiter_repeat === 1 && delimiter_count > 1) {
				found = true;
				if (delimiter_count === 3) {
					i += delimiter_count;
					break;
				}
				saved_i = i;
				i += delimiter_count - 1;
			}
		}
	}

	if (!found)
		return null;

	if (i >= rest.length && (rest[rest.length - 1] !== delimiter)) {
		if (saved_i && saved_i <= rest.length) {
			i = saved_i + 1;
		} else {
			return null;
		}
	}

	const tag = rest.substring(delimiter_repeat, i - 1);
	return {tag: tag, skip: tag.length + 2 * delimiter_repeat, delimiter_repeat: delimiter_repeat};
}

/**
 * Tries to parse a single tag by parsing with different delimiters through decreasing the delimiter repeat until a match is found.
 * @param {string} text the text to parse
 * @param {number} start the tag start index
 * @param {string} delimiter the tag delimiter (1 character)
 * @param {number} delimiter_repeat how many time the tag delimiter character is repeated to form the delimiter for the first iteration
 * @return an object if the tag has been parsed successfully, or `null` otherwise
 */
function try_parse_possible_tags(text, start, delimiter, delimiter_repeat) {
	for (let i = delimiter_repeat; i > 0; i--) {
		const result = try_parse_tag(text, start, delimiter, i);
		if (result)
			return result;
	}

	return null;
}

/**
 * Tries to parse an inline code in the text at the specified index.
 * @param {string} text The text to parse in.
 * @param start The inline code start index.
 */
function try_parse_inline_code(text, start) {
	const rest = text.substring(start);
	const matched = rest.match(INLINE_CODE_REGEX);
	if (!matched)
		return null;

	let code = matched[1];
	if (!code)
		code = matched[2];

	return {el: new md.InlineCode(code), skip: matched[0].length};
}

function try_parse_emoji(text, start) {
	const rest = text.substring(start);
	const matched = rest.match(EMOJI_REGEX);
	if (!matched)
		return null;

	return {el: new md.Emoji(matched[1], matched[2] ? parseInt(matched[2]) : null), skip: matched[0].length};
}

function push_text_if_present(text, nodes) {
	if (text && text !== "") {
		if (text.endsWith("\n"))
			text = text.trimEnd();
		nodes.push(new md.Text(text.replace(/&nbsp;/g, "\xa0")));
	}
	return "";
}

function is_list_ordered(regex_match) {
	return !(regex_match[1] === "-" || regex_match[1] === "+" || regex_match[1] === "*");
}

/**
 * Parses a Markdown document from the given string.
 * @param {string} string the Markdown source
 * @param options
 * @returns {MDDocument} the parsed Markdown document
 */
export function parse(string, options = {}) {
	options = merge_objects(DEFAULT_OPTIONS, options);

	const doc = new md.MDDocument();

	options.doc = doc;
	parse_blocks(string, options).forEach(block => doc.push(block));

	return doc;
}

function group_blocks(string, options = {}) {
	options = merge_objects(DEFAULT_OPTIONS, options);

	// The goal is to group lines to block elements.
	const lines = string.split("\n");
	const blocks = {
		content: [],
		push: function (block) {
			this.content.push(block);
		}
	};

	let current_block = "none";
	let current;

	let found;

	let inline_html_opener = "";
	let inline_html_opener_counter = 0;

	function push_group(new_current_block = "none") {
		if (current) {
			blocks.push({block: current, type: current_block});
			current = null;
		}
		current_block = new_current_block;
		inline_html_opener = "";
		inline_html_opener_counter = 0;
	}

	function do_paragraph(line) {
		if (current_block !== "paragraph") {
			push_group("paragraph");
			current = line;
		} else {
			current += "\n" + line;
		}
	}

	for (let index = 0; index < lines.length; index++) {
		let line = lines[index];

		if (options.code_block_from_indent && (found = line.match(CODE_BLOCK_INDENT_DETECTION_REGEX))
			&& !current_block.startsWith("list") && current_block !== "code") {
			if (current_block !== "indent_code_block") {
				push_group("indent_code_block");
				current = line.substring(found[0].length);
				continue;
			}

			current += "\n" + line.substring(found[0].length);
		} else if ((line.startsWith("```") && index !== lines.length - 1) || current_block === "code") {
			if (current_block !== "code") {
				push_group("code");
				current = line;
				continue;
			} else if (!line.startsWith("```")) {
				current += "\n" + line;
			}

			if (line.startsWith("```") && current_block === "code") {
				push_group();

				if (line.length > 3) {
					current_block = "paragraph";
					current = line.substring(3);
				}
			}
		} else if ((found = line.match(COMMENT_START_REGEX)) || current_block === "comment") {
			const end = line.match(COMMENT_END_REGEX);

			let current_group_comment = true;
			if (current_block !== "comment" && current_block !== "inline_html") {
				if (current)
					blocks.push({block: current, type: current_block});
				current_block = "comment";
				current = line;
				current_group_comment = false;
			}

			if (end) {
				if (!found) {
					current += "\n" + line.substring(0, end.index);
				} else {
					current = line.substring(0, end.index);
				}

				const remaining = line.substring(end.index + "-->".length);
				push_group();

				if (remaining.length !== 0) {
					// Restart the parsing.
					lines[index] = remaining;
					index--;
					continue;
				}
			}

			// Comment
			if (current_group_comment) {
				current += "\n" + line;
			}
		} else if ((found = line.match(INLINE_HTML_DETECTION_REGEX)) || current_block === "inline_html") {
			let tags = line.matchAll(INLINE_HTML_OPENER_REGEX);
			let tag;
			while ((tag = tags.next().value)) {
				if (!INLINE_HTML_SINGLE_TAG.includes(tag[1]) && !INLINE_HTML_IGNORE_TAG.includes(tag[1])) {
					if (inline_html_opener === "") {
						inline_html_opener = tag[1];
						inline_html_opener_counter = 1;
					} else if (inline_html_opener === tag[1]) {
						inline_html_opener_counter++;
					}
				}
			}

			tags = line.matchAll(INLINE_HTML_CLOSER_REGEX);
			while ((tag = tags.next().value)) {
				if (tag[1] === inline_html_opener) {
					inline_html_opener_counter--;
					if (inline_html_opener_counter <= 0) {
						if (inline_html_opener_counter === 0)
							current = current === null ? line : `${current}\n${line}`;
						push_group();
					}
				}
			}

			if (line === "" && inline_html_opener === "") {
				push_group();
				continue;
			}
			// Inline HTML
			if (current_block !== "inline_html") {
				if (current)
					blocks.push({block: current, type: current_block})
				current_block = "inline_html";
				current = line;
			} else {
				current += "\n" + line;
			}
		} else if (options.latex && (line.startsWith("$$") || current_block === "inline_latex")) {
			if (current_block !== "inline_latex") {
				push_group("inline_latex");
				current = line;
				continue;
			} else if (!line.startsWith("$$")) {
				current += "\n" + line;
			}

			if (line.startsWith("$$") && current_block === "inline_latex") {
				push_group();

				if (line.length > 3) {
					current_block = "paragraph";
					current = line.substring(3);
				}
			}
		} else if (line.startsWith("#")) {
			// Push the heading as a block.
			push_group("heading");
			current = line;
			push_group();
		} else if (options.table_of_contents && line.toLowerCase() === "[[toc]]") {
			push_group("table_of_contents");
			current = line;
			push_group();
		} else if (line.match(HORIZONTAL_RULE_REGEX)) {
			push_group("horizontal_rule");
			current = line;
			push_group();
		} else if (line.match(QUOTE_DETECTION_REGEX)) {
			if (current_block !== "quote") {
				push_group("quote");
				current = line;
			} else {
				current += "\n" + line;
			}
		} else if (options.list && ((found = line.match(LIST_DETECTION_REGEX)) || (current_block.startsWith("list") && (line.startsWith(" ") || line === "")))) {
			// List
			if (!current_block.startsWith("list")) {
				push_group();

				const ordered = is_list_ordered(found);

				current_block = "list_" + (ordered ? "ordered" : "unordered");
				current = line;
			} else {
				// Ordered/Unordered mixing prevention.
				if (found && line.match(/^ {2,}/) === null) {
					const ordered = is_list_ordered(found);

					if (current_block !== ("list_" + (ordered ? "ordered" : "unordered"))) {
						push_group("list_" + (ordered ? "ordered" : "unordered"));
						current = line;
						continue;
					}
				}
				current += "\n" + line;
			}
		} else if (options.table && (found = line.match(TABLE_DETECTION_REGEX))) {
			if (current_block !== "table") {
				const next = lines[index + 1];
				if (next && (found = next.match(TABLE_SEPARATOR_REGEX))) {
					push_group("table");
					current = line.trimStart();
					continue;
				} else {
					do_paragraph(line);
					continue;
				}
			}

			if ((found = line.match(TABLE_SEPARATOR_REGEX))) {
				line = line.substring(0, (line.length - found[1].length));
			}

			current += "\n" + line.trimStart();
		} else if (line === "") {
			push_group();
		} else if (options.doc && (found = line.match(REFERENCE_REGEX)) !== null) {
			const name = found[1];
			const url = found[2];
			const tooltip = found[3];
			options.doc.ref(name, new md.Reference(url, tooltip));
		} else {
			do_paragraph(line);
		}
	}

	push_group();

	return blocks.content;
}

/**
 * Parse the specified block.
 *
 * @param block The block to parse.
 * @param options The options.
 * @return {Element} The block element.
 */
function parse_block(block, options = {}) {
	if (typeof block === "string") {
		block = group_blocks(block, options)[0]; // Really bad.
	}

	let found;

	switch (block.type) {
		case "comment":
			return new md.Comment(block.block.replace(/^\s*<!-?-?/, ""));
		case "heading": {
			// Heading
			let nodes = block.block.split(" ");
			let level;
			switch (nodes[0].length) {
				case 1:
					level = md.HeadingLevel.H1;
					break;
				case 2:
					level = md.HeadingLevel.H2;
					break;
				case 3:
					level = md.HeadingLevel.H3;
					break;
				case 4:
					level = md.HeadingLevel.H4;
					break;
				case 5:
					level = md.HeadingLevel.H5;
					break;
				default:
					level = md.HeadingLevel.H6;
					break;
			}
			nodes.shift();
			nodes = parse_nodes(nodes.join(" "), false, options);
			return new md.Heading(nodes, level);
		}
		case "horizontal_rule":
			return md.HORIZONTAL_RULE;
		case "quote":
			// Quotes
			return new md.BlockQuote(parse_blocks(
				block.block.replace(QUOTE_DETECTION_REGEX, "").replace(QUOTE_MULTILINE_REGEX, "\n"),
				merge_objects(options, {doc: null})
			).flatMap(block => {
				if (block instanceof md.Paragraph)
					return block.nodes;
				else
					return block;
			}));
		case "code":
		case "indent_code_block": {
			// Block code
			const lines = block.block.split("\n");
			let language = "";
			if (lines[0].split(" ").length === 1) {
				language = lines[0].replace(/```/, "");
			} else {
				lines[0] = lines[0].replace(/```/, "");
			}
			return new md.BlockCode(lines.filter(line => !line.startsWith("```")).join("\n"), language);
		}
		case "inline_html": {
			// Inline HTML
			block = purge_inline_html(block.block);
			const modified_options = merge_objects(options, {inline_html_block: true});
			return new md.InlineHTML(parse_nodes(block, true, modified_options));
		}
		case "inline_latex": {
			// Inline LaTeX
			const lines = block.block.split("\n");
			lines[0] = lines[0].replace(/^\s*\$\$/, "");
			if (lines[0] === "")
				lines.shift();
			return new md.InlineLatex(lines.filter(line => !line.startsWith("$$")).join("\n"), true);
		}
		case "list_ordered":
		case "list_unordered": {
			// List
			// This becomes a bit difficult.
			block = block.block.trimStart(); // Bad spaces >:C
			found = block.match(LIST_DETECTION_REGEX);
			let ordered = is_list_ordered(found);

			const list = new md.List([], ordered);

			const regex = /^ *(-|\*|\+|(?:([0-9]+)\.)) +/;

			// I don't want to do that.
			const lines = block.split("\n");

			if (ordered) {
				const result = regex.exec(lines[0]);
				if (result && result[2]) {
					list.ordered_start = parseInt(result[2]);
				}
			}

			let current = lines.shift().replace(regex, ""); // First node, so we don't need anything to identify it.
			const raw_list = []; // The goal is to make a first "raw" list with every part separated.
			lines.forEach(line => {
				found = line.match(LIST_DETECTION_REGEX);
				if (found) {
					if (current) {
						raw_list.push(current);
					}
					current = line;
				} else {
					current += "\n" + line;
				}
			});

			if (current) {
				raw_list.push(current);
			}

			// Now with the raw list we build the markdown list.
			// To do so, we have an array named current which represent the last entry and the index represent the entry "level".
			// The parent list can be found with the index - 1, if it doesn't exist just go decrease the index.

			current = [];

			options.list = false; // Prevent some weird things.

			raw_list.forEach(raw_entry => {
				let level = raw_entry.match(/^( *)/);
				if (!level) {
					level = 0;
				} else {
					level = level[1].length / 2 >> 0;
				}

				if (level !== 0) {
					while (!current[level - 1])
						level--;
				}

				if (level === 0) {
					raw_entry = raw_entry.replace(regex, "").replace(/\n */g, "\n");
					let checked = "none";
					if (options.checkbox) {
						const checkbox = raw_entry.match(LIST_CHECKBOX_REGEX);
						if (checkbox) {
							raw_entry = raw_entry.substring(checkbox[1].length);
							checked = checkbox[2] !== " ";
						}
					}
					list.push(new md.ListEntry(parse_blocks(raw_entry, merge_objects(options, {doc: null})), [], checked));
					current = []; // Time to rebuild.
					current[0] = list.get_last();
				} else {
					found = raw_entry.match(LIST_DETECTION_REGEX);
					ordered = is_list_ordered(found);

					if (current.length > level + 1) {
						current.splice(level);
					}

					const parent = current[level - 1];
					if (parent.sublists.length === 0) {
						parent.sublists.push(new md.List([], ordered));
					} else {
						if (parent.sublists[parent.sublists.length - 1].ordered !== ordered) {
							parent.sublists.push(new md.List([], ordered));
						}
					}

					const parent_list = parent.sublists[parent.sublists.length - 1];
					raw_entry = raw_entry.replace(regex, "").replace(/\n */g, "\n");
					let checked = "none";
					if (options.checkbox) {
						const checkbox = raw_entry.match(LIST_CHECKBOX_REGEX);
						if (checkbox) {
							raw_entry = raw_entry.substring(checkbox[1].length);
							checked = checkbox[2] !== " ";
						}
					}
					parent_list.push(new md.ListEntry(parse_blocks(raw_entry, merge_objects(options, {doc: null})), [], checked));
					current[level] = parent_list.get_last();
				}
			});

			options.list = true; // Restore the option.

			return list;
		}
		case "table": {
			const rows = block.block.split("\n");

			if (rows.length < 2) {
				const nodes = parse_nodes(block.block, true, options);
				return new md.Paragraph(nodes);
			}

			const table = new md.Table();

			for (const index in rows) {
				let raw_entries = rows[index].split("|");
				let raw_entries_end = raw_entries.length - 1;
				if (raw_entries[raw_entries_end] === "" || is_whitespace(raw_entries[raw_entries_end])) {
					raw_entries_end--;
				}
				raw_entries = raw_entries.slice(1, raw_entries_end + 1);

				if (index == 1) {
					table.alignments = raw_entries.map(entry => {
						const result = TABLE_ALIGNMENT_REGEX.exec(entry);
						if (result) {
							for (const align_id in md.TableAlignments) {
								const alignment = md.TableAlignments[align_id];

								if (result[1] === alignment.left && result[2] === alignment.right)
									return alignment;
							}
						}
						return md.TableAlignments.NONE;
					});
				} else {
					const table_row = new md.TableRow(table);

					table_row.nodes = raw_entries.map(entry => {
						return new md.TableEntry(table_row, parse_nodes(entry.trim(), false, options));
					});

					table.nodes[index > 1 ? index - 1 : index] = table_row;
				}
			}

			return table;
		}
		case "table_of_contents":
			return new md.TableOfContents();
		default:
			return new md.Paragraph(parse_nodes(block.block, true, options));
	}
}

function parse_blocks(string, options = {}) {
	options = merge_objects(DEFAULT_OPTIONS, options);

	const blocks = group_blocks(string, options);

	// So we have our blocks, now we can parse the blocks individually.
	// Identifying which block is what is kind of easy as you just have to see what is its beginning
	// (except heading using a divider beneath it)

	return blocks.map(block => parse_block(block, options));
}

function parse_nodes(line, allow_linebreak, options = {}) {
	options = merge_objects(DEFAULT_OPTIONS, options);

	const nodes = [];
	let index = 0;

	const word = {
		word: "",
		add: function (text) {
			this.word += text;
		},
		push_text_if_present: function (nodes) {
			this.word = push_text_if_present(this.word, nodes);
		}
	};

	while (index < line.length) {
		const char = line[index];

		let result;
		if (char === "\\" && options.allow_escape) {
			if ((result = line.substring(index).match(ESCAPED_UNICODE))) {
				let code = result[1];
				if (!code) code = result[2];
				if (!code) code = result[3];

				code = parseInt(code, 16);
				word.add(String.fromCharCode(code));

				index += result[0].length;
				continue;
			} else {
				if (index + 1 < line.length) {
					word.add(line[index + 1]);
					index++;
				} else {
					word.add(char);
				}
			}
		} else if (char === "<" &&
			((result = line.substring(index).match(INLINE_HTML_BR_REGEX))
				|| (options.inline_html_block && (result = line.substring(index).match(INLINE_HTML_SKIP_REGEX)))
				|| (result = html.parse_comment(line.substring(index))))) {
			if (result.comment) {
				word.push_text_if_present(nodes);
				nodes.push(new md.Comment(result.comment.content));
				index += result.length - 1;
			} else if ((result[1] === "br" || result[2] === "br") && !options.inline_html_block) {
				word.push_text_if_present(nodes);
				if (allow_linebreak) {
					nodes.push(md.LINEBREAK);
				}
				index += result[0].length - 1;
			} else {
				word.add(result[0]);
				index += result[0].length - 1;
			}
		} else if (char === "`" && (result = try_parse_inline_code(line, index))) {
			// Inline code
			word.push_text_if_present(nodes);
			nodes.push(result.el);
			index += result.skip;
			continue;
		} else if (options.latex && char === "$" && (result = try_parse_tag(line, index, "$", 1))) {
			// Inline Latex
			word.push_text_if_present(nodes);
			nodes.push(new md.InlineLatex(result.tag, false));
			index += result.skip;
			continue;
		} else if (char === " " && line[index + 1] === " " && line[index + 2] === "\n" && allow_linebreak) {
			// Linebreak!
			word.push_text_if_present(nodes);
			nodes.push(md.LINEBREAK);

			index += 3;
			continue;
		} else if (char === "\n") {
			if (options.newline_as_linebreaks) {
				word.push_text_if_present(nodes);
				nodes.push(md.LINEBREAK);
			} else word.add(" ");
		} else if (char === ":" && options.emoji.enabled
			&& (result = try_parse_emoji(line, index))
			&& options.emoji.dictionary.includes(result.el.content)) {
			word.push_text_if_present(nodes);
			nodes.push(result.el);
			index += result.skip;
			continue;
		} else if (char === "!" && (result = try_parse_link(line, index + 1))) {
			// Image
			word.push_text_if_present(nodes);

			const alt = result.title;
			nodes.push(new md.Image(result.url, alt, result.tooltip, result.ref_name));

			index += result.skip + 1;
			continue;
		} else if (char === "[" && options.link && (result = try_parse_link(line, index))) {
			// Link
			word.push_text_if_present(nodes);

			const title = parse_nodes(result.title, false, options);
			nodes.push(new md.Link(result.url, title, result.tooltip, result.ref_name));

			index += result.skip;
			continue;
		} else if (char === "|" && options.spoiler && (result = try_parse_tag(line, index, "|", 2))) {
			// Spoiler
			word.push_text_if_present(nodes);

			nodes.push(new md.Spoiler(parse_nodes(result.tag, false, options)));

			index += result.skip;
			continue;
		} else if (char === "~" && (result = try_parse_tag(line, index, "~", 2))) {
			// Strikethrough
			word.push_text_if_present(nodes);

			nodes.push(new md.Strikethrough(parse_nodes(result.tag, true, options)));

			index += result.skip;
			continue;
		} else if (char === "*" && (result = try_parse_possible_tags(line, index, "*", 2))) {
			// Bold or italic
			word.push_text_if_present(nodes);

			const content = parse_nodes(result.tag, true, options);
			if (result.delimiter_repeat === 2)
				nodes.push(new md.Bold(content));
			else
				nodes.push(new md.Italic(content));

			index += result.skip;
			continue;
		} else if (char === "_" && (result = try_parse_possible_tags(line, index, "_", 2))) {
			// Underline or italic
			word.push_text_if_present(nodes);

			const content = parse_nodes(result.tag, true, options);
			if (result.delimiter_repeat === 2) {
				if (options.underline)
					nodes.push(new md.Underline(content));
				else
					nodes.push(new md.Bold(content)); // In the true Markdown standard it's bold, but personally I prefer underline.
			} else
				nodes.push(new md.Italic(content));

			index += result.skip;
			continue;
		} else if (options.highlight && char === "=" && (result = try_parse_tag(line, index, "=", 2))) {
			// Highlight
			word.push_text_if_present(nodes);

			nodes.push(new md.Highlight(parse_nodes(result.tag, true, options)));

			index += result.skip;
			continue;
		} else if (options.auto_link && (result = try_parse_url(line, index))) {
			word.push_text_if_present(nodes);

			nodes.push(new md.InlineLink(result));

			index += result.length;
			continue;
		} else {
			word.add(char);
		}

		index++;
	}

	word.push_text_if_present(nodes);

	// Checks for a linebreak if allowed.
	if (allow_linebreak && line.endsWith("  ")) {
		nodes.push(md.LINEBREAK);
	}
	return nodes;
}
