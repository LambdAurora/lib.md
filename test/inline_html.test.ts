import { assertEquals, assertInstanceOf } from "@std/assert";
import * as html from "@lambdaurora/libhtml";
import * as md from "../mod.ts";

const SIMPLE_INLINE = "Hello world! <!-- Comment teehee --> How are y'all?";

Deno.test("Parser > md.Comment (inline)", () => {
	const doc = md.parser.parse(SIMPLE_INLINE);
	assertEquals(doc.toString(), "Hello world! <!--Comment teehee--> How are y'all?\n");
});

function test_inline_render(options: Partial<md.RenderOptions>) {
	const doc = md.parser.parse(SIMPLE_INLINE);
	const rendered = md.render_to_html(doc, options);

	assertEquals(rendered.children.length, 1, "The rendered div should have one paragraph.");
	assertInstanceOf(rendered.children[0], html.Element, "The rendered div should have one paragraph.");
	const p = rendered.children[0] as html.Element;
	assertEquals(p.tag, html.Tag.p, "The rendered div should have one paragraph.");

	assertEquals(p.children.length, 3, "The paragraph should contain three nodes.");
	assertInstanceOf(p.children[0], html.Text);
	assertInstanceOf(p.children[1], html.Comment);
	assertInstanceOf(p.children[2], html.Text);
}

Deno.test("Renderer > md.Comment (inline)", () => {
	test_inline_render({});
	test_inline_render({
		inline_html: {
			enable: false,
		},
	});
});

Deno.test("Parser > md.InlineHtml (simple HTML tree)", () => {
	const text = /*html*/ `<div text-align="center">\nHello world!\n</div>`;
	const doc = md.parser.parse(text);

	assertEquals(doc.blocks.length, 1);
	assertInstanceOf(doc.blocks[0], md.InlineHtml);
	const block = doc.blocks[0];
	assertEquals(block.children.length, 1);
	assertInstanceOf(block.children[0], md.Text);
	assertEquals(block.children[0].content, text);
});

Deno.test("Parser > md.InlineHtml (simple HTML tree with comment)", () => {
	const text = /*html*/ `<div text-align="center">
	Hello world!
	<!-- What do I ask now? -->
	How are you all?
</div>`;
	const doc = md.parser.parse(text);

	assertEquals(doc.blocks.length, 1);
	assertInstanceOf(doc.blocks[0], md.InlineHtml);
	const block = doc.blocks[0];
	assertEquals(block.children.length, 3);

	assertInstanceOf(block.children[0], md.Text);
	assertEquals(block.children[0].content, /*html*/ `<div text-align="center">\n\tHello world!\n\t`);

	assertInstanceOf(block.children[1], md.Comment);
	assertEquals(block.children[1].content, "What do I ask now?");

	assertInstanceOf(block.children[2], md.Text);
	assertEquals(block.children[2].content, /*html*/ `\n\tHow are you all?\n</div>`);
});

Deno.test("Parser > md.InlineHtml (simple sanitization)", () => {
	const text = /*html*/ `<title>Hello world!</title>`;
	const doc = md.parser.parse(text);

	assertEquals(doc.blocks.length, 1);
	assertInstanceOf(doc.blocks[0], md.Paragraph);
	const block = doc.blocks[0];
	assertEquals(block.children.length, 1);

	assertInstanceOf(block.children[0], md.Text);
	assertEquals(block.children[0].content, text);
});

Deno.test("Parser > md.InlineHtml (in HTML tree sanitization)", () => {
	const text = /*html*/ `<div>
	Hello world!
	<title>Hello world!</title>
	<!-- Yet another comment. -->
</div>`;
	const doc = md.parser.parse(text);

	assertEquals(doc.blocks.length, 1);
	assertInstanceOf(doc.blocks[0], md.InlineHtml);
	const block = doc.blocks[0];
	assertEquals(block.children.length, 3);

	assertInstanceOf(block.children[0], md.Text);
	assertEquals(
		block.children[0].content,
		/*html*/ `<div>
	Hello world!
	&lt;title&gt;Hello world!&lt;/title&gt;\n\t`,
	);

	assertInstanceOf(block.children[1], md.Comment);
	assertEquals(block.children[1].content, "Yet another comment.");

	assertInstanceOf(block.children[2], md.Text);
	assertEquals(block.children[2].content, /*html*/ `\n</div>`);
});

Deno.test("Parser > md.InlineHtml (extra end text)", () => {
	const text = /*html*/ `<!-- Comment Begin
	Some more text
	Comment End -->Oh no, this is some extra text!`;
	const doc = md.parser.parse(text);

	assertEquals(doc.blocks.length, 2);

	assertInstanceOf(doc.blocks[0], md.InlineHtml);
	assertEquals(doc.blocks[0].children.length, 1);
	assertInstanceOf(doc.blocks[0].children[0], md.Comment);
	assertEquals(doc.blocks[0].children[0].content, "Comment Begin\n\tSome more text\n\tComment End");

	assertInstanceOf(doc.blocks[1], md.Paragraph);
	assertEquals(doc.blocks[1].children.length, 1);
	assertInstanceOf(doc.blocks[1].children[0], md.Text);
	assertEquals(doc.blocks[1].children[0].content, "Oh no, this is some extra text!");
});

Deno.test("Parser > md.Paragraph (comment in the middle of the paragraph)", () => {
	const text = /*html*/ `Hello world!
<!-- Hey, what was the question again? -->
How are you all?`;
	const doc = md.parser.parse(text);

	assertEquals(doc.blocks.length, 1);
	assertInstanceOf(doc.blocks[0], md.Paragraph);
	const p = doc.blocks[0];
	assertEquals(p.children.length, 3);

	assertInstanceOf(p.children[0], md.Text);
	assertEquals(p.children[0].content, "Hello world! ");

	assertInstanceOf(p.children[1], md.Comment);
	assertEquals(p.children[1].content, "Hey, what was the question again?");

	assertInstanceOf(p.children[2], md.Text);
	assertEquals(p.children[2].content, " How are you all?");
});
