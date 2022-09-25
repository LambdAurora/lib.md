import { assertEquals } from "https://deno.land/std@0.157.0/testing/asserts.ts";
import * as html from "../../lib/html.mjs";

Deno.test("html.Element::purge_empty_children - preserve space between 2 elements that requires it", () => {
	const source = /*html*/`<div>Hello: <a href="https://randomfox.ca/">Random Fox!</a> <b>Isn't it cute?</b></div>`;
	const el = html.parse(source) as html.Element;
	el.purge_empty_children();

	assertEquals(el.html({prettified: false}), source);
});

Deno.test("html.Element::purge_empty_children - don't purge normal text", () => {
	const source = /*html*/`<p class="center">
	There's nothing, but foxes. I think?
	<br />
	🦊
</p>`;

	const el = html.parse(source) as html.Element;
	el.purge_empty_children();

	assertEquals(el.html(), source);
});
