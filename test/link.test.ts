import { assertEquals, assertInstanceOf } from "@std/assert";
import * as md from "../mod.ts";

Deno.test("Parser > autolink", () => {
	const LINK_TEST = "https://lambdaurora.dev";
	const parsed_document = md.parser.parse(LINK_TEST, {
		link: {
			auto_link: true
		}
	});

	assertInstanceOf(parsed_document.blocks[0], md.Paragraph);
	const paragraph = parsed_document.blocks[0] as md.Paragraph;

	assertInstanceOf(paragraph.children[0], md.InlineLink);
	const link = paragraph.children[0] as md.InlineLink;

	assertEquals(link.content, LINK_TEST);
});
