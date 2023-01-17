import {assertEquals, assertInstanceOf} from "@std/testing/asserts.ts";
import {md} from "../../mod.mjs";

Deno.test("Markdown Parser - blockquote - simple", () => {
	const QUOTE_TEST = "> This is a quote";
	const parsed_document = md.parser.parse(QUOTE_TEST);

	assertEquals(parsed_document.blocks.length, 1);

	assertInstanceOf(parsed_document.blocks[0], md.BlockQuote);
	const quote = parsed_document.blocks[0] as md.BlockQuote;

	assertInstanceOf(quote.nodes[0], md.Text);
	const paragraph = quote.nodes[0] as md.Text;

	assertEquals(paragraph.content, "This is a quote");
});

Deno.test("Markdown Parser - blockquote - complex", () => {
	const QUOTE_TEST = "> This is a quote\n>\n> End of the quote";
	const parsed_document = md.parser.parse(QUOTE_TEST);

	assertEquals(parsed_document.blocks.length, 1);

	assertInstanceOf(parsed_document.blocks[0], md.BlockQuote);
	const quote = parsed_document.blocks[0] as md.BlockQuote;

	assertEquals(quote.nodes.length, 2, "Quote should have two paragraphs.");

	assertInstanceOf(quote.nodes[0], md.Paragraph);
	const paragraph1 = quote.nodes[0] as md.Paragraph;

	assertEquals(paragraph1.nodes[0].content, "This is a quote");

	assertInstanceOf(quote.nodes[1], md.Paragraph);
	const paragraph2 = quote.nodes[1] as md.Paragraph;

	assertEquals(paragraph2.nodes[0].content, "End of the quote");
});
