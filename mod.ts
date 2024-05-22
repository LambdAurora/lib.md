/*
 * Copyright 2024 LambdAurora <email@lambdaurora.dev>
 *
 * This file is part of lib.md.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * # lib.md
 *
 * A Markdown AST, parser, and rendering library.
 *
 * ## Quick Example
 *
 * ```ts
 * import * as html from "@lambdaurora/libhtml";
 * import * as md from "@lambdaurora/libmd";
 *
 * const doc: md.Document = div.parser.parse(`# lib.md
 *
 * A Markdown AST, parser, and rendering library.
 *
 * ## Quick Example
 *
 * <!-- Insert code -->
 * `); // Markdown document.
 * 
 * const div: html.Element = md.render_to_html(doc, {
 * 	// Options
 * 	strikethrough: {
 * 		class_name: "md_underline"
 * 	},
 * 	underline: {
 * 		enable: false
 * 	}
 * });
 *
 * const str = div.html(); // String representation.
 *
 * // Alternatively, as a shorthand for browsers:
 * const div_dom: HTMLElement = md.render_to_dom(doc, window.document, {
 * 	// Options
 * 	strikethrough: {
 * 		class_name: "md_underline"
 * 	},
 * 	underline: {
 * 		enable: false
 * 	}
 * });
 * console.log(div_dom.outerHTML); // String representation.
 * ```
 *
 * @module
 */

export * from "./lib/index.ts";
export * as utils from "./lib/utils.ts";
