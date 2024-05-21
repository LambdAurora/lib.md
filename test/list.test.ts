import { assertEquals, assertInstanceOf } from "@std/assert";
import * as md from "../mod.ts";

const unordered_list = new md.List(["First element", new md.Bold("Bold element")]);
unordered_list.push(new md.ListEntry([
	"Sub-list",
	new md.List([
		"A sub-entry!",
		new md.Italic("Italic element")
	])])
);
unordered_list.push(new md.ListEntry([
	"Sub-list",
	new md.List([
		new md.ListEntry([
			"A sub-entry... with a sub-list!",
			new md.List([
				"A sub-sub-entry",
				new md.Underline("Underlined entry")
			])
		]),
		new md.Italic("Italic element")
	])])
);
unordered_list.push("One last element");

const ordered_list = new md.List(["First element", new md.Bold("Bold element")], true);
ordered_list.push(new md.ListEntry([
	"Sub-list",
	new md.List([
		"A sub-entry!",
		new md.Italic("Italic element")
	])])
);
ordered_list.push(new md.ListEntry([
	"Sub-list",
	new md.List([
		new md.ListEntry([
			"A sub-entry... with a sub-list!",
			new md.List([
				"A sub-sub-entry",
				new md.Underline("Underlined entry")
			])
		]),
		new md.Italic("Italic element")
	], true)])
);
ordered_list.push("One last element");

Deno.test("md.List#toString (unordered)", () => {
	assertEquals(unordered_list.toString(), `- First element
- **Bold element**
- Sub-list
  - A sub-entry!
  - *Italic element*
- Sub-list
  - A sub-entry... with a sub-list!
    - A sub-sub-entry
    - __Underlined entry__
  - *Italic element*
- One last element`);
});

Deno.test("md.List#toString (ordered)", () => {
	assertEquals(ordered_list.toString(), `1. First element
2. **Bold element**
3. Sub-list
  - A sub-entry!
  - *Italic element*
4. Sub-list
  1. A sub-entry... with a sub-list!
    - A sub-sub-entry
    - __Underlined entry__
  2. *Italic element*
5. One last element`);
});

Deno.test("Parser > md.List", async () => {
	await Deno.readFile("test/list.md")
		.then(content => new TextDecoder("utf-8").decode(content))
		.then(data => {
			const doc = md.parser.parse(data);

			assertEquals(doc.blocks.length, 1, "Document should have 1 block element that is a list.");
			assertInstanceOf(doc.blocks[0], md.List);

			const list = doc.blocks[0] as md.List;
			assertEquals(list.children.length, 2, "List should have 2 children.");

			const first_entry= list.children[0];
			assertEquals(first_entry.checked, null);
			assertEquals(first_entry.children.length, 1);
			assertEquals(first_entry.sub_lists.length, 2);
			assertInstanceOf(first_entry.children[0], md.Paragraph);

			const paragraph = first_entry.children[0] as md.Paragraph;
			assertEquals(paragraph.children.length, 3);

			assertEquals(paragraph.as_plain_text(), "List 1-1  \nparagraph");
		});
});
