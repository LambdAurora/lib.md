// deno-lint-ignore-file no-explicit-any
/*
 * Copyright 2024 LambdAurora <email@lambdaurora.dev>
 *
 * This file is part of lib.md.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import * as html from "@lambdaurora/libhtml";
import * as md from "./tree/index.ts";
import { HTML_TAGS_TO_PURGE_SUGGESTION, is_whitespace } from "./utils.ts";

/**
 * Represents the parser options related to code elements.
 *
 * @version 2.0.0
 * @since 1.8.0
 */
export interface ParserCodeOptions {
	block_from_indent?: boolean;
}

/**
 * Represents the parser options related to emojis.
 *
 * @version 2.0.0
 * @since 1.8.0
 */
export interface ParserEmojiOptions {
	enabled?: boolean;
	dictionary?: readonly string[];
	match?: (emoji: md.Emoji) => boolean;
	skin_tones?: boolean;
}

/**
 * Represents the parser options related to inline HTML.
 *
 * @version 2.0.0
 * @since 1.9.0
 */
export interface ParserInlineHtmlOptions {
	/**
	 * List of disallowed HTML tags that will be sanitized.
	 */
	disallowed_tags?: readonly string[];
}

/**
 * Represents the parser options related to links.
 *
 * @version 2.0.0
 * @since 1.8.0
 */
export interface ParserLinkOptions {
	standard?: boolean;
	auto_link?: boolean;
}

/**
 * Represents the control of some meta of the parser.
 *
 * @version 2.0.0
 * @since 1.8.0
 */
export interface ParserMetaControlOptions {
	allow_escape?: boolean;
	newline_as_linebreaks?: boolean;
}

/**
 * Represents the Markdown parser options.
 *
 * @version 2.0.0
 * @since 1.0.0
 */
export interface ParserOptions {
	checkbox: boolean;
	code: ParserCodeOptions;
	emoji: ParserEmojiOptions;
	/**
	 * `true` to enable footnotes, or `false` otherwise
	 */
	footnote: boolean;
	highlight: boolean;
	image: boolean;
	inline_html: ParserInlineHtmlOptions
	latex: boolean;
	link: ParserLinkOptions;
	list: boolean;
	meta_control: ParserMetaControlOptions;
	spoiler: boolean;
	table: boolean;
	table_of_contents: boolean;
	underline: boolean;
}

interface ParsingContext extends ParserOptions {
	doc: md.Document | null;
	inline_html_block: boolean;
}

const DEFAULT_OPTIONS: ParsingContext = {
	checkbox: true,
	code: {
		block_from_indent: false,
	},
	emoji: {
		enabled: true,
		dictionary: [],
		skin_tones: true
	},
	footnote: true,
	highlight: true,
	image: true,
	inline_html: {
		disallowed_tags: HTML_TAGS_TO_PURGE_SUGGESTION
	},
	latex: false,
	link: {
		standard: true,
		auto_link: false
	},
	list: true,
	meta_control: {
		allow_escape: true,
		newline_as_linebreaks: false
	},
	spoiler: true,
	table: true,
	table_of_contents: true,
	underline: true,

	doc: null,
	inline_html_block: false,
};

const CODE_BLOCK_INDENT_DETECTION_REGEX = /^(?:( {4})|(\t))(?!\s*\*\s*\S+)/
const HORIZONTAL_RULE_REGEX = /^\s*(---+|\*\*\*+|___+)\s*$/
const LIST_DETECTION_REGEX = /^ *(-|\*|\+|\d+\.) +.+/;
const LIST_CHECKBOX_REGEX = /^(\[([Xx ])]\s+).+/i;
const QUOTE_DETECTION_REGEX = /^>(?:\s|\s?$)/;
const QUOTE_MULTILINE_REGEX = /\n\s*>[ \t]?/g;
const TABLE_DETECTION_REGEX = /^\s*\|.*\|/;
const TABLE_SEPARATOR_REGEX = /^\s*\|(?:[ \t]*:?-+:?[ \t]*\|)+(\s*)$/;
const TABLE_ALIGNMENT_REGEX = /^[ \t]*([:\-])-*([:\-])[ \t]*$/;

const ESCAPED_UNICODE = /^\\u([\dA-Fa-f]{4})|x([\dA-Fa-f]{2})|U([\dA-Fa-f]{8})/;

const INLINE_HTML_SKIP_REGEX = /^<(\/)?([A-z]+).*?>/;
const INLINE_HTML_BR_REGEX = /^<(br)(?: ?\/)?>/;

const INLINE_CODE_REGEX = /^```((?:.|\n)+?)```|`((?:.|\n)+?)`/;
const EMOJI_REGEX = /^:(~)?([A-z\d\-_]+)(?:~([A-z\d\-_]+))?:/;

// Note: this regex is unused because Firefox doesn't support named groups :c
//const REFERENCE_REGEX = /^\[(?<name>[^\[\]]+)\]: (?<url>[a-z]+\:\/\/[.\S]+)(?: "(?<tooltip>[^"]+)")?$/;
const REFERENCE_REGEX = /^\[([^\[\]]+)]: ((?:(?:(?:[a-z]+\:\/\/)|(?:\.{0,2}\/))[.\S]+)|(?:data\:[.\S]+)|(?:#[.\S]+))(?: "([^"]+)")?$/;
const FOOTNOTE_REF_REGEX = /^\[\^([^\[\]]+)]: (.+)$/;

function try_parse_footnote(input: string, start: number) {
	if (input[start] === "[" && input[start + 1] === "^") {
		// This is a footnote.
		let length;
		let ended = false;

		// Search for the end of the footnote.
		for (length = 0; start + 2 + length < input.length; length++) {
			if (input[start + 2 + length] === "]") {
				ended = true;
				break;
			}
		}

		if (!ended) {
			// Invalid footnote.
			return null;
		}

		const name = input.substring(start + 2, start + 2 + length);
		return {footnote: name, skip: length + 3};
	} else {
		return null;
	}
}

function try_parse_link(input: string, start: number) {
	if (input[start] !== "[") {
		return null;
	}

	// Try to determine where the title/alt part ends.
	let counter = 0;
	let i: number;
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
		let tooltip: string | null = part.join(" ");
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

function try_parse_url(input: string, start: number) {
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
 * @param text the text to parse
 * @param start the tag start index
 * @param delimiter the tag delimiter (1 character)
 * @param delimiter_repeat how many times the tag delimiter character is repeated to form the delimiter
 * @returns an object if the tag has been parsed successfully, else `null`
 */
function try_parse_tag(text: string, start: number, delimiter: string, delimiter_repeat: number) {
	const rest = text.substring(start);
	for (let i = 0; i < delimiter_repeat; i++) {
		if (rest[i] !== delimiter)
			return null;
	}

	let found = false;

	let i;
	let saved_i: number | null = null;
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
		if (saved_i !== null && saved_i <= rest.length) {
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
 *
 * @param text the text to parse
 * @param start the tag start index
 * @param delimiter the tag delimiter (1 character)
 * @param delimiter_repeat how many times the tag delimiter character is repeated to form the delimiter for the first iteration
 * @returns an object if the tag has been parsed successfully, or `null` otherwise
 */
function try_parse_possible_tags(text: string, start: number, delimiter: string, delimiter_repeat: number) {
	for (let i = delimiter_repeat; i > 0; i--) {
		const result = try_parse_tag(text, start, delimiter, i);
		if (result)
			return result;
	}

	return null;
}

function is_html_tag_allowed(tag: string, options: ParserOptions): boolean {
	return !options.inline_html.disallowed_tags?.includes(tag);
}

/**
 * Tries to parse an inline code in the text at the specified index.
 *
 * @param text The text to parse in.
 * @param start The inline code start index.
 */
function try_parse_inline_code(text: string, start: number) {
	const rest = text.substring(start);
	const matched = rest.match(INLINE_CODE_REGEX);
	if (!matched)
		return null;

	let code = matched[1];
	if (!code)
		code = matched[2];

	return {el: new md.InlineCode(code), skip: matched[0].length};
}

function try_parse_emoji(text: string, start: number, options: ParserOptions) {
	const rest = text.substring(start);
	const matched = rest.match(EMOJI_REGEX);
	if (!matched)
		return null;

	const custom = matched[1] !== undefined;
	const id = matched[2];
	const variant = matched[3];

	if (custom && !variant) return null;

	const emoji = new md.Emoji(id, variant ? variant : null, custom);

	if (options.emoji.match && !options.emoji.match(emoji)) return null;

	return {el: emoji, skip: matched[0].length};
}

function push_text_if_present(text: string, nodes: md.Node[]): string {
	if (text && text !== "") {
		if (text.endsWith("\n"))
			text = text.trimEnd();
		nodes.push(new md.Text(smart_decode_html(text)));
	}
	return "";
}

function is_list_ordered(regex_match: string[]): boolean {
	return !(regex_match[1] === "-" || regex_match[1] === "+" || regex_match[1] === "*");
}

/**
 * Attempts to match a quote block at the given line.
 *
 * @param line the line
 * @param current_block the current block
 * @returns `true` if a quote block has been matched, or `false` otherwise
 * @since 1.9.4
 */
function match_quote_block(line: string, current_block: string): boolean {
	if (!line.match(QUOTE_DETECTION_REGEX)) {
		return false;
	}

	return !(current_block !== "quote" && line.trim() === ">");
}

/**
 * Creates a new block quote.
 *
 * @param block the current block data
 * @param context the parser context
 * @returns the new block quote
 * @since 1.9.4
 */
function create_quote(block: BlockGroup, context: ParsingContext): md.BlockQuote {
	let blocks: md.Node[] = parse_blocks(
		block.block.replace(QUOTE_DETECTION_REGEX, "").replace(QUOTE_MULTILINE_REGEX, "\n"),
		html.merge_objects(context, {doc: null})
	);

	if (blocks.length === 1 && blocks[0] instanceof md.Paragraph) blocks = [...blocks[0].children];

	return new md.BlockQuote(blocks);
}

/**
 * Parses a Markdown document from the given string.
 *
 * @param string the Markdown source
 * @param options the parsing options
 * @returns the parsed Markdown document
 */
export function parse(string: string, options: Partial<ParserOptions> = {}): md.Document {
	const context = html.merge_objects(DEFAULT_OPTIONS, options) as ParsingContext;

	const doc = new md.Document();

	context.doc = doc;
	parse_blocks(string, context).forEach(block => doc.push(block));

	return doc;
}

interface BlockGroup {
	type: string;
	block: string;
}

/**
 * Represents a helper to group the block elements of a Markdown document together.
 */
class BlockGrouper {
	private _text: string;
	/**
	 * The lines of the Markdown document.
	 */
	public lines: string[];
	private _line_text_index: number = 0;
	/**
	 * The current line index.
	 */
	public index: number = 0;

	public blocks: BlockGroup[] = [];
	public current_block = "none";
	public current: string | null = "";

	constructor(text: string) {
		this._text = text;
		this.lines = text.split("\n");
	}

	/**
	 * The text of the document.
	 */
	public get text(): string {
		return this._text;
	}

	/**
	 * The current line.
	 */
	public get line(): string {
		return this.lines[this.index];
	}

	public get remaining_text(): string {
		return this.text.substring(this.line_text_index);
	}

	/**
	 * The text index of the current line.
	 */
	public get line_text_index(): number {
		return this._line_text_index;
	}

	/**
	 * Moves forward to the next line.
	 */
	public next(): void {
		this._line_text_index += this.lines[this.index].length + 1;
		this.index++;
	}

	public restart_line(split_index: number): void {
		// We need to split the remaining text into its own line.
		const remaining = this.line.substring(split_index);

		this.lines = [
			...this.lines.slice(0, this.index),
			this.line.substring(0, split_index),
			remaining,
			...this.lines.slice(this.index + 1)
		];

		const text_split_index = this.line_text_index + split_index;
		this._text = this._text.substring(0, text_split_index) + "\n" + this._text.substring(text_split_index);
	}

	/**
	 * Returns the next line.
	 *
	 * @returns the next line
	 */
	public peek_next(): string | undefined {
		return this.lines[this.index + 1];
	}

	/**
	 * Returns whether there's more lines to parse.
	 *
	 * @returns `true` if there's more lines, or `false` otherwise
	 */
	public has_next(): boolean {
		return this.index < this.lines.length;
	}

	public is_last(): boolean {
		return this.index === this.lines.length - 1;
	}

	public push(block:  BlockGroup): void {
		this.blocks.push(block);
	}

	public push_group(new_current_block: string = "none"): void {
		if (this.current) {
			this.blocks.push({ block: this.current, type: this.current_block });
			this.current = null;
		}
		this.current_block = new_current_block;
	}

	public push_simple_group(new_current_block: string): void {
		this.push_group(new_current_block);
		this.append();
		this.push_group();
	}

	public push_if_not_group(new_current_block: string): void {
		if (this.current_block !== new_current_block) {
			this.push_group(new_current_block);
		}
	}

	public begin(new_current_block: string, text?: string): void {
		this.current_block = new_current_block;
		this.append(text);
	}

	public append(text?: string): void {
		if (text === undefined) {
			this.append(this.line);
		} else if (this.current) {
			this.current += "\n" + text;
		} else {
			this.current = text;
		}
	}

	public append_paragraph(text?: string): void {
		this.push_if_not_group("paragraph");
		this.append(text);
	}

	public attempt_parse<R>(callback: () => boolean): boolean {
		return callback();
	}
}

function group_blocks(string: string, context: ParsingContext): BlockGroup[] {
	context = html.merge_objects(DEFAULT_OPTIONS, context);

	// The goal is to group lines to block elements.
	const ctx = new BlockGrouper(string);

	let found;

	for (; ctx.has_next(); ctx.next()) {
		if (context.code.block_from_indent && (found = ctx.line.match(CODE_BLOCK_INDENT_DETECTION_REGEX))
			&& !ctx.current_block.startsWith("list") && ctx.current_block !== "code") {
			if (ctx.current_block !== "indent_code_block") {
				ctx.push_group("indent_code_block");
				ctx.current = ctx.line.substring(found[0].length);
				continue;
			}

			ctx.append(ctx.line.substring(found[0].length));
		} else if ((ctx.line.startsWith("```") && !ctx.is_last()) || ctx.current_block === "code") {
			if (ctx.current_block !== "code") {
				ctx.push_group("code");
				ctx.append();
				continue;
			} else if (!ctx.line.startsWith("```")) {
				ctx.append();
			}

			if (ctx.line.startsWith("```") && ctx.current_block === "code") {
				ctx.push_group();

				if (ctx.line.length > 3) {
					ctx.current_block = "paragraph";
					ctx.current = ctx.line.substring(3);
				}
			}
		} else if (ctx.attempt_parse(() => {
			// Attempt to parse an HTML comment.
			const remaining_text = ctx.remaining_text;
			const spaces = html.get_leading_spaces(remaining_text);

			// We ignore any leading spaces.
			const result = html.parse_comment(remaining_text.substring(spaces));

			if (result) {
				// We figure out the actual content.
				const actual_comment_text = remaining_text.substring(0, spaces + result.length);
				// The lines affected by the comment.
				const lines = actual_comment_text.split("\n");
				// The line where the comment ends.
				const destination_line_index = ctx.index + lines.length - 1;
				// The remaining text at the end of the line.
				let line_remain = ctx.lines[destination_line_index].substring(lines[lines.length - 1].length);

				if (is_whitespace(line_remain)) {
					// The remaining is insignificant.
					line_remain = "";
				}

				// We move forward in the text traversal.
				for (let i = ctx.index; i < destination_line_index; i++) {
					ctx.next();
				}
				// Now we are as if we were on the last line of the comment.

				if (line_remain) {
					// If the remaining is significant, then let's allow for it to be parsed.
					ctx.restart_line(lines[lines.length - 1].length);
				}

				if (ctx.current_block !== "paragraph") {
					ctx.push_if_not_group("inline_html");
				}
				ctx.append(actual_comment_text.substring(spaces));

				return true;
			}

			return false;
		})) {
			continue;
		} else if ((found = ctx.attempt_parse(() => {
			const remaining_text = ctx.remaining_text;
			const spaces = html.get_leading_spaces(remaining_text);

			const result = html.parse_element(remaining_text.substring(spaces));

			if (result) {
				result.length += spaces;

				if (!is_html_tag_allowed(result.element.tag.name, context)) {
					return false;
				}

				// We figure out the actual HTML text.
				const actual_html_text = remaining_text.substring(0, spaces + result.length);
				// The lines affected by the HTML element.
				const lines = actual_html_text.split("\n");
				// The line where the HTML element ends.
				const destination_line_index = ctx.index + lines.length - 1;
				// The remaining text at the end of the line.
				let line_remain = ctx.lines[destination_line_index].substring(lines[lines.length - 1].length);

				if (is_whitespace(line_remain)) {
					// The remaining is insignificant.
					line_remain = "";
				}

				// We move forward in the text traversal.
				for (let i = ctx.index; i < destination_line_index; i++) {
					ctx.next();
				}
				// Now we are as if we were on the last line of the HTML element.

				if (line_remain) {
					// If the remaining is significant, then let's allow for it to be parsed.
					ctx.restart_line(lines[lines.length - 1].length);
				}

				ctx.push_if_not_group("inline_html");

				sanitize_inline_html(result.element, context);

				ctx.append(result.element.html(new html.StringifyStyle("")));

				return true;
			}

			return false;
		}))) {
			continue;
		} else if (context.latex && (ctx.line.startsWith("$$") || ctx.current_block === "inline_latex")) {
			if (ctx.current_block !== "inline_latex") {
				ctx.push_group("inline_latex");
				ctx.append();
				continue;
			} else if (!ctx.line.startsWith("$$")) {
				ctx.append();
			}

			if (ctx.line.startsWith("$$") && ctx.current_block === "inline_latex") {
				ctx.push_group();

				if (ctx.line.length > 3) {
					ctx.begin("paragraph", ctx.line.substring(3));
				}
			}
		} else if (ctx.line.startsWith("#")) {
			// Push the heading as a block.
			ctx.push_simple_group("heading");
		} else if (context.table_of_contents && ctx.line.toLowerCase() === "[[toc]]") {
			ctx.push_simple_group("table_of_contents");
		} else if (ctx.line.match(HORIZONTAL_RULE_REGEX)) {
			ctx.push_simple_group("horizontal_rule");
		} else if (match_quote_block(ctx.line, ctx.current_block)) {
			ctx.push_if_not_group("quote");
			ctx.append();
		} else if (
			context.list
			&& (
				(found = ctx.line.match(LIST_DETECTION_REGEX))
				|| (ctx.current_block.startsWith("list") && (ctx.line.startsWith(" ") || ctx.line === ""))
			)
		) {
			// List
			if (!ctx.current_block.startsWith("list")) {
				ctx.push_group();

				const ordered = is_list_ordered(found!);

				ctx.begin("list_" + (ordered ? "ordered" : "unordered"));
			} else {
				// Ordered/Unordered mixing prevention.
				if (found && ctx.line.match(/^ {2,}/) === null) {
					const ordered = is_list_ordered(found);

					if (ctx.current_block !== ("list_" + (ordered ? "ordered" : "unordered"))) {
						ctx.push_group("list_" + (ordered ? "ordered" : "unordered"));
						ctx.append();
						continue;
					}
				}

				ctx.append();
			}
		} else if (context.table && (found = ctx.line.match(TABLE_DETECTION_REGEX))) {
			if (ctx.current_block !== "table") {
				const next = ctx.peek_next();
				if (next && (found = next.match(TABLE_SEPARATOR_REGEX))) {
					ctx.push_group("table");
					ctx.append(ctx.line.trimStart());
					continue;
				} else {
					ctx.append_paragraph();
					continue;
				}
			}

			let line = ctx.line;

			if ((found = ctx.line.match(TABLE_SEPARATOR_REGEX))) {
				line = line.substring(0, (line.length - found[1].length));
			}

			ctx.append(line.trimStart());
		} else if (ctx.line === "") {
			ctx.push_group();
		} else if (context.doc && (found = ctx.line.match(FOOTNOTE_REF_REGEX)) !== null) {
			const name = found[1];
			const text = found[2];
			context.doc.add_footnote(name, parse_nodes(text, false, context));
		} else if (context.doc && (found = ctx.line.match(REFERENCE_REGEX)) !== null) {
			const name = found[1];
			const url = found[2];
			const tooltip = found[3];
			context.doc.ref(name, new md.Reference(url, tooltip));
		} else {
			ctx.append_paragraph();
		}
	}

	ctx.push_group();

	return ctx.blocks;
}

/**
 * Parse the specified block.
 *
 * @param block the block to parse
 * @param context the context
 * @return the block element
 */
function parse_block(block: BlockGroup, context: ParsingContext): md.BlockElement<any> | md.Comment {
	if (typeof block === "string") {
		block = group_blocks(block, context)[0]; // Really bad.
	}

	let found;

	switch (block.type) {
		case "heading": {
			// Heading
			const nodes = block.block.split(" ");
			const level = nodes[0].length;
			nodes.shift();
			const actual_nodes = parse_nodes(nodes.join(" "), false, context);
			return new md.Heading(actual_nodes, Math.min(level, md.HeadingLevel.H6));
		}
		case "horizontal_rule":
			return md.HORIZONTAL_RULE;
		case "quote":
			// Quotes
			return create_quote(block, context);
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
			const modified_context = html.merge_objects(context, {
				meta_control: {
					newline_as_linebreaks: false
				},
				inline_html_block: true
			});
			return new md.InlineHtml(
				parse_nodes(
					block.block, true, modified_context, true
				)
			);
		}
		case "inline_latex": {
			// Inline LaTeX
			const lines = block.block.split("\n");
			lines[0] = lines[0].replace(/^\s*\$\$/, "");
			if (lines[0] === "")
				lines.shift();
			return new md.LatexDisplay(lines.filter(line => !line.startsWith("$$")).join("\n"));
		}
		case "list_ordered":
		case "list_unordered": {
			// List
			// This becomes a bit difficult.
			const block_str = block.block.trimStart(); // Bad spaces >:C
			found = block_str.match(LIST_DETECTION_REGEX);
			let ordered = is_list_ordered(found!);

			const list = new md.List([], ordered);

			const regex = /^ *(-|\*|\+|(?:([0-9]+)\.)) +/;

			// I don't want to do that.
			const lines = block_str.split("\n");

			if (ordered) {
				const result = regex.exec(lines[0]);
				if (result && result[2]) {
					list.ordered_start = parseInt(result[2]);
				}
			}

			let current = lines.shift()!.replace(regex, ""); // First node, so we don't need anything to identify it.
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

			let current_list: md.ListEntry[] = [];

			context.list = false; // Prevent some weird things.

			raw_list.forEach(raw_entry => {
				const indent = raw_entry.match(/^( *)/);
				let level: number = 0;

				if (indent) {
					level = indent[1].length / 2 >> 0;
				}

				for (; level > 0; level--) {
					if (current_list[level - 1]) {
						break;
					}
				}

				if (level === 0) {
					raw_entry = raw_entry.replace(regex, "").replace(/\n */g, "\n");
					let checked: boolean | null = null;
					if (context.checkbox) {
						const checkbox = raw_entry.match(LIST_CHECKBOX_REGEX);
						if (checkbox) {
							raw_entry = raw_entry.substring(checkbox[1].length);
							checked = checkbox[2] !== " ";
						}
					}
					list.push(new md.ListEntry(parse_blocks(raw_entry, html.merge_objects(context, {doc: null})), [], checked));
					current_list = []; // Time to rebuild.
					current_list[0] = list.get_last();
				} else {
					found = raw_entry.match(LIST_DETECTION_REGEX);
					ordered = is_list_ordered(found!);

					if (current_list.length > level + 1) {
						current_list.splice(level);
					}

					const parent = current_list[level - 1];
					if (parent.sub_lists.length === 0) {
						parent.sub_lists.push(new md.List([], ordered));
					} else {
						if (parent.sub_lists[parent.sub_lists.length - 1].ordered !== ordered) {
							parent.sub_lists.push(new md.List([], ordered));
						}
					}

					const parent_list = parent.sub_lists[parent.sub_lists.length - 1];
					raw_entry = raw_entry.replace(regex, "").replace(/\n */g, "\n");
					let checked: boolean | null = null;
					if (context.checkbox) {
						const checkbox = raw_entry.match(LIST_CHECKBOX_REGEX);
						if (checkbox) {
							raw_entry = raw_entry.substring(checkbox[1].length);
							checked = checkbox[2] !== " ";
						}
					}
					parent_list.push(new md.ListEntry(parse_blocks(raw_entry, html.merge_objects(context, {doc: null})), [], checked));
					current_list[level] = parent_list.get_last();
				}
			});

			context.list = true; // Restore the option.

			return list;
		}
		case "table": {
			const rows = block.block.split("\n");

			if (rows.length < 2) {
				const nodes = parse_nodes(block.block, true, context);
				return new md.Paragraph(nodes);
			}

			const table = new md.Table();

			for (let index = 0; index < rows.length; index++) {
				let raw_entries = rows[index].split("|");
				let raw_entries_end = raw_entries.length - 1;
				if (raw_entries[raw_entries_end] === "" || is_whitespace(raw_entries[raw_entries_end])) {
					raw_entries_end--;
				}
				raw_entries = raw_entries.slice(1, raw_entries_end + 1);

				if (index == 1) {
					raw_entries.map(entry => {
						const result = TABLE_ALIGNMENT_REGEX.exec(entry);
						if (result) {
							for (const align_id in md.TableAlignments) {
								const alignment = md.TableAlignments[align_id];

								if (result[1] === alignment.left && result[2] === alignment.right)
									return alignment;
							}
						}
						return md.TableAlignments.NONE;
					}).forEach((alignment, index) => {
						table.set_alignment(index, alignment);
					});
				} else {
					const row = new md.TableRow(table);
					raw_entries.forEach(entry => {
						row.push(parse_nodes(entry.trim(), false, context));
					});
					table.set_row(index > 1 ? index - 1 : index, row);
				}
			}

			return table;
		}
		case "table_of_contents":
			return new md.TableOfContents();
		default:
			return new md.Paragraph(parse_nodes(block.block, true, context));
	}
}

function parse_blocks(string: string, context: ParsingContext): (md.BlockElement<any> | md.Comment)[] {
	context = html.merge_objects(DEFAULT_OPTIONS, context) as ParsingContext;

	const blocks = group_blocks(string, context);

	// So we have our blocks, now we can parse the blocks individually.
	// Identifying which block is what is kind of easy as you just have to see what is its beginning
	// (except heading using a divider beneath it)

	return blocks.map(block => parse_block(block, context));
}

function parse_nodes(
	line: string,
	allow_linebreak: boolean,
	context: ParsingContext,
	preserve_new_lines: boolean = false
): md.Node[] {
	context = html.merge_objects(DEFAULT_OPTIONS, context);

	const nodes: md.Node[] = [];
	let index = 0;

	const word = {
		word: "",
		add: function (text: string): void {
			this.word += text;
		},
		push_text_if_present: function (nodes: md.Node[]): void {
			if (!preserve_new_lines) {
				this.word = push_text_if_present(this.word, nodes);
			} else {
				if (this.word && this.word !== "") {
					nodes.push(new md.Text(smart_decode_html(this.word)));
				}
				this.word = "";
			}
		}
	};

	while (index < line.length) {
		const char = line[index];

		let result;
		if (char === "\\" && context.meta_control.allow_escape) {
			if ((result = line.substring(index).match(ESCAPED_UNICODE))) {
				let code = result[1];
				if (!code) code = result[2];
				if (!code) code = result[3];

				const int_code = parseInt(code, 16);
				word.add(String.fromCharCode(int_code));

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
				|| (context.inline_html_block && (result = line.substring(index).match(INLINE_HTML_SKIP_REGEX)))
				|| (result = html.parse_comment(line.substring(index))))) {
			if ("comment" in result) {
				word.push_text_if_present(nodes);
				nodes.push(new md.Comment(result.comment.content));
				index += result.length - 1;
			} else {
				const regex_result = result as RegExpMatchArray;

				if ((regex_result[1] === "br" || regex_result[2] === "br") && !context.inline_html_block) {
					word.push_text_if_present(nodes);
					if (allow_linebreak) {
						nodes.push(md.LINEBREAK);
					}
					index += regex_result[0].length - 1;
				} else {
					word.add(regex_result[0]);
					index += regex_result[0].length - 1;
				}
			}
		} else if (char === "`" && (result = try_parse_inline_code(line, index))) {
			// Inline code
			word.push_text_if_present(nodes);
			nodes.push(result.el);
			index += result.skip;
			continue;
		} else if (context.latex && char === "$" && (result = try_parse_tag(line, index, "$", 1))) {
			// Inline Latex
			word.push_text_if_present(nodes);
			nodes.push(new md.InlineLatex(result.tag));
			index += result.skip;
			continue;
		} else if (char === " " && line[index + 1] === " " && line[index + 2] === "\n" && allow_linebreak) {
			// Linebreak!
			word.push_text_if_present(nodes);
			nodes.push(md.LINEBREAK);

			index += 3;
			continue;
		} else if (char === "\n") {
			if (context.meta_control.newline_as_linebreaks) {
				word.push_text_if_present(nodes);
				nodes.push(md.LINEBREAK);
			} else if (preserve_new_lines) {
				word.add("\n");
			} else {
				word.add(" ");
			}
		} else if (char === ":" && context.emoji.enabled
			&& (result = try_parse_emoji(line, index, context))) {
			word.push_text_if_present(nodes);
			nodes.push(result.el);
			index += result.skip;
			continue;
		} else if (char === "!" && line[index + 2] !== "^" && (result = try_parse_link(line, index + 1))) {
			// Image
			word.push_text_if_present(nodes);

			const alt = result.title;
			nodes.push(new md.Image(result.url!, alt, result.tooltip, result.ref_name));

			index += result.skip + 1;
			continue;
		} else if (char === "[" && context.footnote && (result = try_parse_footnote(line, index))) {
			// Footnote
			word.push_text_if_present(nodes);

			nodes.push(new md.FootNoteReference(result.footnote));

			index += result.skip;
			continue;
		} else if (char === "[" && context.link.standard && (result = try_parse_link(line, index))) {
			// Link
			word.push_text_if_present(nodes);

			const title = parse_nodes(result.title, false, context);
			nodes.push(new md.Link(result.url!, title, result.tooltip, result.ref_name));

			index += result.skip;
			continue;
		} else if (char === "|" && context.spoiler && (result = try_parse_tag(line, index, "|", 2))) {
			// Spoiler
			word.push_text_if_present(nodes);

			nodes.push(new md.Spoiler(parse_nodes(result.tag, false, context)));

			index += result.skip;
			continue;
		} else if (char === "~" && (result = try_parse_tag(line, index, "~", 2))) {
			// Strikethrough
			word.push_text_if_present(nodes);

			nodes.push(new md.Strikethrough(parse_nodes(result.tag, true, context)));

			index += result.skip;
			continue;
		} else if (char === "*" && (result = try_parse_possible_tags(line, index, "*", 2))) {
			// Bold or italic
			word.push_text_if_present(nodes);

			const content = parse_nodes(result.tag, true, context);
			if (result.delimiter_repeat === 2)
				nodes.push(new md.Bold(content));
			else
				nodes.push(new md.Italic(content));

			index += result.skip;
			continue;
		} else if (char === "_" && (result = try_parse_possible_tags(line, index, "_", 2))) {
			// Underline or italic
			word.push_text_if_present(nodes);

			const content = parse_nodes(result.tag, true, context);
			if (result.delimiter_repeat === 2) {
				if (context.underline)
					nodes.push(new md.Underline(content));
				else
					nodes.push(new md.Bold(content)); // In the true Markdown standard it's bold, but personally I prefer underline.
			} else
				nodes.push(new md.Italic(content));

			index += result.skip;
			continue;
		} else if (context.highlight && char === "=" && (result = try_parse_tag(line, index, "=", 2))) {
			// Highlight
			word.push_text_if_present(nodes);

			nodes.push(new md.Highlight(parse_nodes(result.tag, true, context)));

			index += result.skip;
			continue;
		} else if (context.link.auto_link && (result = try_parse_url(line, index))) {
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

function smart_decode_html(text: string): string {
	return html.decode_html(text
		.replaceAll("&lt;", "&amp;lt;")
		.replaceAll("&gt;", "&amp;gt;")
	);
}

/**
 * Sanitizes all disallowed HTML element in the tree of the given element.
 *
 * @param element the element to sanitize
 * @param context the parsing context
 */
function sanitize_inline_html(element: html.Element, context: ParsingContext): void {
	element.children = element.children.flatMap(node => {
		if (node instanceof html.Element) {
			sanitize_inline_html(node, context);

			if (!is_html_tag_allowed(node.tag.name, context)) {
				let start_text = `<${node.tag.name}`;

				if (node.attributes.length > 0) {
					start_text += " " + node.attributes.map(attr => attr.html()).join(" ");
				}

				const new_nodes = [
					new html.Text(start_text + ">"),
					...node.children
				];

				if (!node.tag.self_closing) {
					new_nodes.push(new html.Text(`</${node.tag.name}>`));
				}

				return new_nodes;
			}
		}

		return node;
	});
}
