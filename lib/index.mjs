/*
 * Copyright © 2021-2022 LambdAurora <email@lambdaurora.dev>
 *
 * This file is part of lib.md.
 *
 * Licensed under the MIT license. For more information,
 * see the LICENSE file.
 */

import * as parser_i from "./parser.mjs";
import * as md_i from "./markdown.mjs";
import MarkdownParser from "./markdown_parser.mjs";
import * as renderer from "./renderer.mjs";
import * as utils_i from "./utils.mjs";

export const md = {
	...md_i,
	parser: MarkdownParser,
	...renderer,
	utils: utils_i
};
export default md;

export * as html from "./html.mjs";
export * from "./utils.mjs";

export const parser = parser_i;
