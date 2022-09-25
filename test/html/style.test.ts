import { assertEquals, assertInstanceOf } from "https://deno.land/std@0.157.0/testing/asserts.ts";
import * as html from "../../lib/html.mjs";

Deno.test("style/formatting", () => {
	const el = html.parse(/*html*/`<span style="display: flex;flex-direction:column;    color: blue;"></span>`) as html.Element;
	assertEquals(el.html(), /*html*/`<span style="display: flex; flex-direction: column; color: blue;"></span>`);
});

Deno.test("style/parsing", () => {
	const el = html.parse(/*html*/`<span style="display: flex;flex-direction:column;    color: blue;"></span>`) as html.Element;

	assertInstanceOf(el.attr("style"), html.StyleAttribute);

	const style_attr = el.attr("style") as html.StyleAttribute;
	assertEquals(style_attr.get("display"), "flex");
	assertEquals(style_attr.get("flex-direction"), "column");
	assertEquals(style_attr.get("color"), "blue");
})
