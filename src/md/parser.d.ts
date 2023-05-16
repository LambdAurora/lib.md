/*
 * Copyright © 2021-2022 LambdAurora <email@lambdaurora.dev>
 *
 * This file is part of lib.md.
 *
 * Licensed under the MIT license. For more information,
 * see the LICENSE file.
 */

import {Emoji, MDDocument} from "./markdown.mjs";

/**
 * Represents the parser options related to code elements.
 *
 * @version 1.8.0
 * @since 1.8.0
 */
export interface ParserCodeOptions {
	block_from_indent?: boolean;
}

/**
 * Represents the parser options related to emojis.
 *
 * @version 1.8.0
 */
export interface ParserEmojiOptions {
	enabled?: boolean;
	match?: (emoji: Emoji) => boolean;
}

/**
 * Represents the parser options related to inline HTML.
 *
 * @version 1.9.0
 * @since 1.9.0
 */
export interface ParserInlineHtmlOptions {
	/**
	 * List of disallowed HTML tags that will be sanitized.
	 */
	disallowed_tags?: string[];
}

/**
 * Represents the parser options related to links.
 *
 * @version 1.8.0
 * @since 1.8.0
 */
export interface ParserLinkOptions {
	standard?: boolean;
	auto_link?: boolean;
}

/**
 * Represents the control of some meta of the parser.
 *
 * @version 1.8.0
 * @since 1.8.0
 */
export interface ParserMetaControlOptions {
	allow_escape?: boolean;
	newline_as_linebreaks?: boolean;
}

/**
 * Represents the Markdown parser options.
 *
 * @version 1.10.0
 * @since 1.0.0
 */
export interface ParserOptions {
	checkbox?: boolean;
	code?: ParserCodeOptions;
	emoji?: ParserEmojiOptions;
	/**
	 * `true` to enable footnotes, or `false` otherwise
	 */
	footnote?: boolean;
	highlight?: boolean;
	image?: boolean;
	inline_html?: ParserInlineHtmlOptions
	latex?: boolean;
	link?: ParserLinkOptions;
	list?: boolean;
	meta_control?: ParserMetaControlOptions;
	spoiler?: boolean;
	table?: boolean;
	table_of_contents?: boolean;
	underline?: boolean
}

/**
 * Parses a Markdown document from the given string.
 *
 * @param text the Markdown source
 * @param options the parser options
 * @returns the parsed Markdown document
 */
export declare function parse(text: string, options?: ParserOptions): MDDocument;
