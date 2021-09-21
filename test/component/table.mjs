import { default as md, html } from "../../lib/index.mjs";

let table = new md.Table();
table.push_column("Tables", ["col 3 is", "col 2 is", "zebra stripes"]);
table.push_column("Are", ["right-aligned", "centered", "are neat"], md.TableAlignments.CENTERED);
table.push_column("Cool", ["$1600", "$12", "$1"], md.TableAlignments.RIGHT);
table.push_column(new md.Italic("Funni format"), [new md.Bold("but is it?"), new md.Underline([new md.Bold("Foxes"), " are cool"]), ":3"]);

console.log(table.toString());
console.log(JSON.stringify(table.toJSON(), null, 2));

let doc = md.parser.parse(table.toString(), { latex: false });
console.log(JSON.stringify(doc.toJSON(), null, 2));
