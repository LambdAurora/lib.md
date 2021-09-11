/*
 * Copyright © 2021 LambdAurora <aurora42lambda@gmail.com>
 *
 * This file is part of lib.md.
 *
 * Licensed under the MIT license. For more information,
 * see the LICENSE file.
 */

import * as md_i from "./markdown.mjs";
import * as html_i from "./html.mjs";
import MarkdownParser from "./parser.mjs";
import * as renderer from "./renderer.mjs";
import * as utils_i from "./utils.mjs";

export const md = {
    ...md_i,
    parser: MarkdownParser,
    ...renderer,
    utils: utils_i
};
export default md;

export const html = html_i;
