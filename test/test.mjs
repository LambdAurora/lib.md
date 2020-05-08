/*
 * Copyright © 2020 LambdAurora <aurora42lambda@gmail.com>
 *
 * This file is part of lib.md.
 *
 * Licensed under the MIT license. For more information,
 * see the LICENSE file.
 */

import {md, md_parser} from "../lib/index.mjs";

let link = new md.Link("https://random.com", ["another", "random", "link"], "oh no", "reference_test");

let document = new md.Document()
    .push(new md.Heading("Hello", md.HeadingLevel.H1))
    .push("Sample text")
    .push(new md.Paragraph([link, md.LINEBREAK, "oh!"]))
    .push(new md.InlineCode("sample inline code"))
    .push(new md.BlockQuote(["Let's quote some things", link, md.LINEBREAK, new md.InlineCode("some inline code"), "nice?"]));

console.log(JSON.stringify(document, null, 2));
console.log(document.toString());

console.log(JSON.stringify(md_parser.parse("# lib.md\n\
\n\
A Markdown parser and renderer library.\n\
```js\n\
let uwu = \"owo\";\n\
\n\
console.log(uwu);\n\
```\
More text\n\
"), null, 2));
