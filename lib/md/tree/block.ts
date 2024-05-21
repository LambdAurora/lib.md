/*
 * Copyright 2024 LambdAurora <email@lambdaurora.dev>
 *
 * This file is part of lib.md.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { BlockElement, Element, map_nodes, Node, NodeInput, Text } from "./base.ts";
import { Link } from "./element.ts";
import { Document } from "./document.ts";
import { to_anchor_name } from "../../utils.ts";
import * as html from "@lambdaurora/libhtml";

export enum HeadingLevel {
	H1 = "h1",
	H2 = "h2",
	H3 = "h3",
	H4 = "h4",
	H5 = "h5",
	H6 = "h6"
}

export class Heading extends BlockElement<Node> {
	/**
	 * @param nodes the inner nodes of the element
	 * @param level the heading level
	 */
	constructor(nodes: NodeInput, public level: HeadingLevel) {
		super(map_nodes(nodes), false);
	}

	/**
	 * Returns the identifier of this heading.
	 *
	 * @return the identifier
	 */
	public get_id(): string {
		return to_anchor_name(this.as_plain_text());
	}

	public override toString(): string {
		const content = this.nodes.map(node => node.toString()).join(" ");
		switch (this.level) {
			case HeadingLevel.H1:
				return "# " + content;
			case HeadingLevel.H2:
				return "## " + content;
			case HeadingLevel.H3:
				return "### " + content;
			case HeadingLevel.H4:
				return "#### " + content;
			case HeadingLevel.H5:
				return "##### " + content;
			case HeadingLevel.H6:
				return "###### " + content;
			default:
				throw new Error(`lib.md ;; Heading#toString(): invalid heading "${this.level}".`);
		}
	}

	public override toJSON(): object {
		return {type: "heading", level: this.level, nodes: this.nodes};
	}
}

export class Paragraph extends BlockElement<Node> {
	constructor(nodes: NodeInput) {
		super(map_nodes(nodes), true);
	}

	public override toJSON(): object {
		return {type: "paragraph", nodes: this.nodes};
	}
}

export class BlockCode extends BlockElement<Node> {
	constructor(public code: string, public language: string | undefined) {
		super([], true);
	}

	/**
	 * Appends the code with the given items.
	 *
	 * @param items the parts to append to the code
	 * @returns this element
	 */
	public override push(...items: string[]): this {
		this.code += items.join("");
		return this;
	}

	/**
	 * Returns whether this code block has a language specified.
	 *
	 * @return `true` if this code block has a specified language, else `false`
	 */
	public has_language(): boolean {
		return this.language !== undefined && this.language !== "";
	}

	public override toString(): string {
		return "```" + (this.has_language() ? this.language + "\n" : "\n") + this.code + "\n```";
	}

	public override toJSON(): object {
		return {type: "block_code", code: this.code, language: this.language};
	}
}

export class LatexDisplay extends BlockElement<Node> {
	constructor(public raw: string) {
		super([], true);
	}

	/**
	 * Appends the raw LaTeX expression with the given items.
	 *
	 * @param items the parts to append to the LaTeX expression
	 * @returns this element
	 */
	public override push(...items: string[]): this {
		this.raw += items.join("");
		return this;
	}

	public override toString(): string {
		return `$$\n${this.raw}\n$$`;
	}

	public override toJSON(): object {
		return {type: "latex_display", raw: this.raw};
	}
}

/**
 * Returns the nodes a string with linebreaks.
 *
 * @param nodes the nodes
 * @return the nodes as a string
 */
function to_string_with_linebreaks(nodes: Node[]): string {
	return nodes.map((node, index) => node.toString() + ((index + 1 < nodes.length && !(node instanceof Text && node.is_linebreak())) ? " " : "")).join("");
}

export class BlockQuote extends BlockElement<Node> {
	constructor(nodes: NodeInput) {
		super(map_nodes(nodes));
	}

	public override toString(): string {
		return to_string_with_linebreaks(this.nodes).split("\n").map(quote => `> ${quote}`).join("\n");
	}

	public override toJSON(): object {
		return {type: "quote", nodes: this.nodes};
	}
}

class HorizontalRule extends BlockElement<Node> {
	constructor() {
		super([]);
	}

	/**
	 * Pushes a new child to this element.
	 *
	 * @param _item the child to append
	 * @returns this element
	 */
	public override push(_item: never): this {
		return this;
	}

	public override toString(): string {
		return "---";
	}

	public override toJSON(): object {
		return {type: "horizontal_rule"};
	}

	public as_html(): html.Element {
		return html.create_element("hr");
	}
}

/**
 * Represents a horizontal rule.
 *
 * @version 2.0.0
 * @since 1.2.0
 */
export const HORIZONTAL_RULE: HorizontalRule = new HorizontalRule();

/**
 * Represents a list.
 *
 * @version 2.0.0
 * @since 1.0.0
 */
export class List extends BlockElement<ListEntry> {
	constructor(entries: (Node | string)[], public ordered: boolean = false, public ordered_start: number = 1) {
		super(entries.map(entry => {
			if (entry instanceof ListEntry)
				return entry;
			return new ListEntry([entry], null);
		}), true);
	}

	/**
	 * Pushes new list entries to this element.
	 *
	 * @param items the entries to append
	 * @returns this element
	 */
	public push(...items: (string | Node)[]): this {
		return super.push(...items.map(item => {
			if (!(item instanceof ListEntry)) {
				if (item instanceof List) {
					return new ListEntry("", [item]);
				} else {
					return new ListEntry([item]);
				}
			}

			return item;
		}));
	}

	/**
	 * Gets the last entry in this list.
	 *
	 * @return the last entry
	 */
	public get_last(): ListEntry {
		return this.nodes[this.nodes.length - 1] as ListEntry;
	}

	public override toString(): string {
		const entries = this.nodes.map(node => node.toString())
			.map((node, index) => this.ordered ? `${index + this.ordered_start}. ${node}` : `- ${node}`)
			.map(node => node.split("\n")
				.map((node, index) => {
					if (index !== 0)
						return "  " + node;
					else
						return node;
				})
				.join("\n")
			).join("\n");
		return entries;
	}

	public override toJSON(): object {
		return {type: "list", entries: this.nodes, ordered: this.ordered, ordered_start: this.ordered_start};
	}
}

export class ListEntry extends Element<Node> {
	public sub_lists: List[];

	/**
	 * @param nodes the inner nodes of the element
	 * @param sub_lists if present, the sublist of this entry, else `null`
	 * @param checked `true` or `false` if this entry is a checkbox, else `null`
	 */
	constructor(nodes: NodeInput, sub_lists: List[] | null = [], public checked: boolean | null = null) {
		super(map_nodes(nodes), false);
		this.checked = checked;
		this.sub_lists = [...sub_lists ?? []];
	}

	public override toString(): string {
		let content = this.nodes.map(block => block.toString()).join("\n");

		if (typeof this.checked === "boolean") {
			content = (this.checked ? "[x] " : "[ ] ") + content;
		}

		if (this.sub_lists.length > 0) {
			content += "\n" + this.sub_lists.map(sublist => sublist.toString().split("\n").map(line => "  " + line).join("\n")).join("\n");
		}

		return content;
	}

	public override toJSON(): object {
		return {type: "list_entry", nodes: this.nodes, sub_lists: this.sub_lists, checked: this.checked};
	}
}

export class InlineHTML extends BlockElement<Node> {
	constructor(nodes: NodeInput) {
		super(map_nodes(nodes), true);
	}

	public override toJSON(): object {
		return {type: "inline_html", content: this.nodes};
	}
}

export class TableAlignment {
	constructor(
		public readonly name: string,
		readonly left: string,
		readonly right: string,
		public readonly style_table_data: (elem: html.Element) => void
	) {
	}

	public to_pretty_string(column_length: number): string {
		if (column_length < 5)
			column_length = 5;

		return this.left + "-".repeat(column_length - 2) + this.right;
	}

	public toString(): string {
		return this.left + "---" + this.right;
	}
}

export const TableAlignments: Readonly<{ [key: string]: TableAlignment }> = Object.freeze(function () {
	const center = new TableAlignment("center", ":", ":", element => element.style("text-align", "center"));
	return {
		NONE: new TableAlignment("none", "-", "-", _ => {
		}),
		LEFT: new TableAlignment("left", ":", "-", element => element.style("text-align", "left")),
		CENTER: center,
		CENTERED: center,
		RIGHT: new TableAlignment("right", "-", ":", element => element.style("text-align", "right"))
	};
}());

/**
 * Represents a table.
 *
 * @version 1.2.0
 * @since 1.2.0
 */
export class Table extends BlockElement<TableRow> {
	constructor(nodes: TableRow[] = [], private alignments: TableAlignment[] = []) {
		super(nodes.map(row => {
			row.table = this;
			return row;
		}));

		if (!this.nodes[0])
			this.nodes[0] = new TableRow(this, []);
	}

	/**
	 * Pushes new row nodes to this element.
	 *
	 * @param rows the rows to append
	 * @returns this element
	 */
	public push(...rows: TableRow[]): this {
		return super.push(...rows.map(row => {
			if (row.table !== this) {
				const cloned = row.clone();
				cloned.table = this;
				return cloned;
			} else {
				return row;
			}
		}));
	}

	public set_row(index: number, row: TableRow): void {
		if (row.table !== this) {
			const cloned = row.clone();
			cloned.table = this;
			this.nodes[index] = cloned;
		} else {
			this.nodes[index] = row;
		}
	}

	public push_column(head: NodeInput, data: (Node | string)[] = [], alignment: TableAlignment = TableAlignments.NONE): void {
		if (head)
			this.get_head().push(head);
		this.alignments[this.alignments.length] = alignment;
		data.forEach((row, index) => {
			while (!this.nodes[index + 1]) {
				this.nodes.push(new TableRow(this, []));
			}

			this.nodes[index + 1].push(row);
		});
	}

	/**
	 * Gets the alignment of the specified column.
	 *
	 * @param column the column
	 * @return the alignment
	 */
	public get_alignment(column: number): TableAlignment {
		if (this.alignments[column])
			return this.alignments[column];
		return TableAlignments.NONE;
	}

	/**
	 * Sets the alignment of the specified column.
	 *
	 * @param column the column
	 * @param alignment the alignment
	 */
	public set_alignment(column: number, alignment: TableAlignment): void {
		this.alignments[column] = alignment;
	}

	public get_head(): TableRow {
		return this.nodes[0] as TableRow;
	}

	public get_body(): TableRow[] {
		return this.nodes.filter((_, index) => index !== 0) as TableRow[];
	}

	public override toString(): string {
		const head_columns = this.get_head().children.map(column => column.toString());
		const alignments = "|" + this.alignments
				.map((alignment, index) => alignment.to_pretty_string(head_columns[index] ? head_columns[index].length + 2 : 5))
				.join("|")
			+ "|";

		return "| " + head_columns.join(" | ") + " |\n" + alignments + "\n" + this.get_body().map(row => row.toString()).join("\n");
	}

	public override toJSON(): object {
		return {type: "table", rows: this.nodes.map(row => row.toJSON()), alignments: this.alignments.map(alignment => alignment.name)};
	}
}

export class TableRow extends BlockElement<TableEntry> {
	/**
	 * @param table the parent table
	 * @param columns the columns of the row
	 */
	constructor(public table: Table, public columns: TableEntry[] = []) {
		super(columns.map(column => {
			column.row = this;
			return column;
		}));
	}

	/**
	 * Pushes new column nodes to this element.
	 *
	 * @param columns the column to append
	 * @returns this element
	 */
	public push(...columns: NodeInput[]): this {
		return super.push(...columns.map(column => {
			if (column instanceof TableEntry) {
				if (column.row !== this) {
					const cloned = column.clone();
					cloned.row = this;
					return cloned;
				} else {
					return column;
				}
			} else {
				return new TableEntry(this, column);
			}
		}));
	}

	public override toString(): string {
		return "| " + this.nodes.map(node => node.toString()).join(" | ") + " |";
	}

	public override toJSON(): object {
		return {type: "table_row", columns: this.nodes.map(node => node.toJSON())};
	}

	public clone(): TableRow {
		const row = new TableRow(this.table);
		row.push(...this.nodes);
		return row;
	}
}

export class TableEntry extends BlockElement<Node> {
	/**
	 * @param row the parent row
	 * @param nodes the nodes of the entry
	 */
	constructor(public row: TableRow, nodes: NodeInput = []) {
		super(map_nodes(nodes), false);
		this.row = row;
	}

	public get table(): Table {
		return this.row.table;
	}

	public override toJSON(): object {
		return {type: "table_entry", nodes: this.nodes.map(node => node.toJSON())};
	}

	public clone(): TableEntry {
		return new TableEntry(this.row, this.nodes);
	}
}

/**
 * Represents a table of contents.
 *
 * This is a non-standard element.
 *
 * @version 2.0.0
 * @since 1.0.0
 */
export class TableOfContents extends BlockElement<Node> {
	constructor() {
		super([], false);
	}

	/**
	 * Pushes new children nodes to this element.
	 *
	 * @param _items the children to append
	 * @returns this element
	 */
	public push(_items: never): this {
		return this;
	}

	/**
	 * Returns the table of contents as a standard list.
	 *
	 * @param doc the Markdown document
	 * @return the equivalent list
	 */
	public as_list(doc: Document): List {
		const list = new List([], true);

		let headings = doc.blocks.filter(block => block instanceof Heading) as Heading[];
		const allow_h1 = headings.filter(block => block.level === HeadingLevel.H1).length > 1;
		if (!allow_h1) {
			headings = headings.filter(block => block.level !== HeadingLevel.H1);
		}

		let current: ListEntry[] = [];

		function push_heading(list: List, heading: Heading) {
			list.push(new ListEntry([new Paragraph([new Link(`#${heading.get_id()}`, heading.children)])]));
		}

		headings.forEach(heading => {
			let level = parseInt(heading.level[1]);
			if (!allow_h1)
				level--;

			if (level !== 1) {
				while (!current[level - 1])
					level--;
			}

			if (level === 1) {
				push_heading(list, heading);
				current = []; // Time to rebuild.
				current[1] = list.get_last();
			} else {
				if (current.length > level + 1) {
					current.splice(level);
				}

				const parent = current[level - 1];
				if (parent.sub_lists.length === 0) {
					parent.sub_lists.push(new List([], true));
				}

				const parent_list = parent.sub_lists[parent.sub_lists.length - 1];
				push_heading(parent_list, heading);
				current[level] = parent_list.get_last();
			}
		});

		return list;
	}

	public override toString(): string {
		return "[[ToC]]";
	}

	public override toJSON(): object {
		return {type: "table_of_contents"};
	}
}
