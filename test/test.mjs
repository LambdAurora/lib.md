import * as md from "../mod.ts";

const link = new md.Link("https://random.com", ["another ", "random", " link"], "oh no", "reference_test");

const document = new md.Document()
	.push(new md.Heading("Hello", md.HeadingLevel.H1))
	.push("Sample text")
	.push(new md.Paragraph([link, md.LINEBREAK, "oh!"]))
	.push(new md.InlineCode("sample inline code"))
	.push(new md.BlockQuote(["Let's quote some things", link, md.LINEBREAK, new md.InlineCode("some inline code"), "nice?"]));

console.log(JSON.stringify(document, null, 2));
console.log(document.toString());

const parsed_document = md.parser.parse("# lib.md\n\
\n\
A Markdown parser and *hewwo **renderer*** library. [![random fox](https://foxrudor.de/)](https://foxrudor.de/ \"Visit the website!\") oh no  \n\
foo bar\n\
```js\n\
let uwu = \"owo\";\n\
\n\
console.log(uwu);\n\
```\n\
More text [hello world](https://example.com) oh no\n\
");
console.log(JSON.stringify(parsed_document, null, 2));
console.log(parsed_document.toString());
