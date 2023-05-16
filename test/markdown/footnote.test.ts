import {md} from "../../mod.mjs";
import {assertEquals, assertInstanceOf} from "https://deno.land/std@0.152.0/testing/asserts.ts";

Deno.test("Markdown Parser - footnotes", () => {
	const FOOTNOTE_TEST = "[Hello](https://example.com) world![^test]\n[^test]: Stuff";
	const parsed_document = md.parser.parse(FOOTNOTE_TEST);

	assertEquals(parsed_document.blocks.length, 1);

	assertInstanceOf(parsed_document.blocks[0], md.Paragraph);
	const paragraph = parsed_document.blocks[0] as md.Paragraph;

	assertInstanceOf(paragraph.nodes[0], md.Link);
	assertInstanceOf(paragraph.nodes[1], md.Text);
	assertInstanceOf(paragraph.nodes[2], md.FootNoteReference);
	const footnote = paragraph.nodes[2];

	assertEquals(footnote.name, "test");
	assertEquals(parsed_document.has_footnote("test"), true);
})

Deno.test("Markdown Renderer - footnotes", () => {
	const doc = new md.MDDocument([new md.Paragraph(["Hello world", new md.FootNoteReference("fancy name")])]);

	doc.add_footnote("1", new md.Text("Simple text"));
	doc.add_footnote("fancy Name", new md.Text("Fancy name footnote."));
	doc.add_footnote("3", new md.Text("Moar text"));

	const rendered = md.render_to_html(doc);

	assertEquals(rendered.html(), /*html*/`<div>
	<p>
		Hello world<sup><a id="fn:fancy-name:src" href="#fn:fancy-name">2</a></sup>
	</p><hr /><ol class="footnotes">
		<li id="fn:1">Simple text  <a class="footnote_src_link" href="#fn:1:src">↩</a></li><li id="fn:fancy-name">Fancy name footnote.  <a class="footnote_src_link" href="#fn:fancy-name:src">↩</a></li><li id="fn:3">Moar text  <a class="footnote_src_link" href="#fn:3:src">↩</a></li>
	</ol>
</div>`);
});
