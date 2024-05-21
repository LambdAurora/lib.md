import { assertEquals, assertInstanceOf } from "@std/assert";
import * as md from "../mod.ts";

Deno.test("Parser > blockquote (simple)", () => {
	const QUOTE_TEST = "> This is a quote";
	const parsed_document = md.parser.parse(QUOTE_TEST);

	assertEquals(parsed_document.blocks.length, 1);

	assertInstanceOf(parsed_document.blocks[0], md.BlockQuote);
	const quote = parsed_document.blocks[0] as md.BlockQuote;

	assertInstanceOf(quote.children[0], md.Text);
	const paragraph = quote.children[0] as md.Text;

	assertEquals(paragraph.content, "This is a quote");
});

Deno.test("Parser > blockquote (complex)", () => {
	const QUOTE_TEST = "> This is a quote\n>\n> End of the quote";
	const parsed_document = md.parser.parse(QUOTE_TEST);

	assertEquals(parsed_document.blocks.length, 1);

	assertInstanceOf(parsed_document.blocks[0], md.BlockQuote);
	const quote = parsed_document.blocks[0] as md.BlockQuote;

	assertEquals(quote.children.length, 2, "Quote should have two paragraphs.");

	assertInstanceOf(quote.children[0], md.Paragraph);
	const paragraph1 = quote.children[0] as md.Paragraph;

	assertEquals((paragraph1.children[0] as md.Text).content, "This is a quote");

	assertInstanceOf(quote.children[1], md.Paragraph);
	const paragraph2 = quote.children[1] as md.Paragraph;

	assertEquals((paragraph2.children[0] as md.Text).content, "End of the quote");
});
