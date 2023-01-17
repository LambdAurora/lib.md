import {assertEquals, assertInstanceOf} from "@std/testing/asserts.ts";
import { md } from "../../mod.mjs";

Deno.test("Markdown Parser - autolink", () => {
	const LINK_TEST = "https://lambdaurora.dev";
	const parsed_document = md.parser.parse(LINK_TEST, {
		link: {
			auto_link: true
		}
	});

	assertInstanceOf(parsed_document.blocks[0], md.Paragraph);
	const paragraph = parsed_document.blocks[0] as md.Paragraph;

	assertInstanceOf(paragraph.nodes[0], md.InlineLink);
	const link = paragraph.nodes[0] as md.InlineLink;

	assertEquals(link.content, LINK_TEST);
});
