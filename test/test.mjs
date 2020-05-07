/*
 * Copyright © 2020 LambdAurora <aurora42lambda@gmail.com>
 *
 * This file is part of lib.md.
 *
 * Licensed under the MIT license. For more information,
 * see the LICENSE file.
 */

import {md} from "../lib/index.mjs";

let document = new md.Document()
    .push(new md.Heading("Hello", md.HeadingLevel.H1))
    .push("Sample text")
    .push(new md.Paragraph([new md.Link("https://random.com", ["another", "random", "link"], "oh no", "reference_test"), new md.Linebreak(), "oh!"]))
    .push(new md.InlineCode("sample inline code"));

console.log(JSON.stringify(document, null, 2));
console.log(document.toString());
