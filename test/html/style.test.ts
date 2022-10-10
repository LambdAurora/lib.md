import { assertEquals, assertInstanceOf } from "@std/testing/asserts.ts";
import * as html from "../../src/html.mjs";

Deno.test("html/style/formatting", () => {
	const el = html.parse(/*html*/`<span style="display: flex;flex-direction:column;    color: blue;"></span>`) as html.Element;
	assertEquals(el.html(), /*html*/`<span style="display: flex; flex-direction: column; color: blue;"></span>`);
});

Deno.test("html/style/parsing", () => {
	const el = html.parse(/*html*/`<span style="display: flex;flex-direction:column;    color: blue;"></span>`) as html.Element;

	assertInstanceOf(el.attr("style"), html.StyleAttribute);

	const style_attr = el.attr("style") as html.StyleAttribute;
	assertEquals(style_attr.get("display"), "flex");
	assertEquals(style_attr.get("flex-direction"), "column");
	assertEquals(style_attr.get("color"), "blue");
})
