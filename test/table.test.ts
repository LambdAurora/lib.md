import { assertEquals, assertInstanceOf } from "@std/assert";
import * as md from "../mod.ts";

const table = new md.Table();
table.push_column("Tables", ["col 3 is", "col 2 is", "zebra stripes"]);
table.push_column("Are", ["right-aligned", "centered", "are neat"], md.TableAlignments.CENTER);
table.push_column("Cool", ["$1600", "$12", "$1"], md.TableAlignments.RIGHT);
table.push_column(new md.Italic("Funni format"), [new md.Bold("but is it?"), new md.Underline([new md.Bold("Foxes"), " are cool"]), ":3"]);

Deno.test("md.Table#toString", () => {
	assertEquals(table.toString(), /*md*/`
| Tables | Are | Cool | *Funni format* |
|--------|:---:|-----:|----------------|
| col 3 is | right-aligned | $1600 | **but is it?** |
| col 2 is | centered | $12 | __**Foxes** are cool__ |
| zebra stripes | are neat | $1 | :3 |
`.trim());
});

Deno.test("md.Table#toJSON", () => {
	// deno-lint-ignore no-explicit-any
	const json = table.toJSON() as any;
	assertEquals(json.type, "table");
	assertEquals(json.alignments,
		[md.TableAlignments.NONE.name, md.TableAlignments.CENTER.name, md.TableAlignments.RIGHT.name, md.TableAlignments.NONE.name]
	);
	assertEquals(json.rows[0].type, "table_row");
	assertEquals(json.rows[0].columns[0].type, "table_entry");
	assertEquals(json.rows[0].columns[0].nodes[0], "Tables");
});

Deno.test("Parser > md.Table", () => {
	const doc = md.parser.parse(table.toString(), {latex: false});
	assertInstanceOf(doc.blocks[0], md.Table);
	assertEquals(doc.blocks[0].toJSON(), table.toJSON());
});
