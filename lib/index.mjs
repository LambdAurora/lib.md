/*
 * Copyright © 2020 LambdAurora <aurora42lambda@gmail.com>
 *
 * This file is part of lib.md.
 *
 * Licensed under the MIT license. For more information,
 * see the LICENSE file.
 */

import * as md_i from "./markdown.mjs";
import MarkdownParser from "./parser.mjs";
import markdown_render from "./renderer.mjs";
import * as utils_i from "./utils.mjs";

export default {
    ...md_i,
    parser: MarkdownParser,
    render: markdown_render,
    utils: utils_i
};
