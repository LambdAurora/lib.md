/*
 * Copyright 2024 LambdAurora <email@lambdaurora.dev>
 *
 * This file is part of lib.md.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Element, map_nodes, Node, NodeInput, Reference, Text } from "./base.ts";
import { Document } from "./document.ts";
import { to_anchor_name } from "../../utils.ts";
import * as html from "@lambdaurora/libhtml";

export class Italic extends Element<Node> {
	/**
	 * @param content the inner nodes of the element
	 */
	constructor(content: NodeInput) {
		super(map_nodes(content));
	}

	public override toString(): string {
		const content = super.toString();
		if (content.includes("*")) {
			return `_${content}_`;
		} else {
			return `*${content}*`;
		}
	}

	public override toJSON(): object {
		return {type: "italic", nodes: this.nodes};
	}
}

export class Bold extends Element<Node> {
	/**
	 * @param content the inner nodes of the element
	 */
	constructor(content: NodeInput) {
		super(map_nodes(content));
	}

	public override toString(): string {
		return `**${super.toString()}**`;
	}

	public override toJSON(): object {
		return {type: "bold", nodes: this.nodes};
	}
}

/**
 * Represents an underlined element.
 *
 * This is a non-standard element.
 *
 * @version 2.0.0
 * @since 1.0.0
 */
export class Underline extends Element<Node> {
	/**
	 * @param content the inner nodes of the element
	 */
	constructor(content: NodeInput) {
		super(map_nodes(content));
	}

	public override toString(): string {
		return `__${super.toString()}__`;
	}

	public override toJSON(): object {
		return {type: "underline", nodes: this.nodes};
	}
}

export class Strikethrough extends Element<Node> {
	/**
	 * @param content the inner nodes of the element
	 */
	constructor(content: NodeInput) {
		super(map_nodes(content), false);
	}

	public override toString(): string {
		return `~~${super.toString()}~~`;
	}

	public override toJSON(): object {
		return {type: "strikethrough", nodes: this.nodes};
	}
}

/**
 * Represents a highlighted element.
 *
 * This is a non-standard element.
 *
 * @version 2.0.0
 * @since 1.0.0
 */
export class Highlight extends Element<Node> {
	/**
	 * @param content the inner nodes of the element
	 */
	constructor(content: NodeInput) {
		super(map_nodes(content), false);
	}

	public override toString(): string {
		return `==${super.toString()}==`;
	}

	public override toJSON(): object {
		return {type: "highlight", nodes: this.nodes};
	}
}

/**
 * Represents a spoiler element.
 *
 * This is a non-standard element but present in Discord's markdown.
 *
 * Content inside the spoiler element should be hidden when rendered by default.
 *
 * @version 2.0.0
 * @since 1.0.0
 */
export class Spoiler extends Element<Node> {
	/**
	 * @param content the inner nodes of the element
	 */
	constructor(content: NodeInput) {
		super(map_nodes(content), false);
	}

	public override toString(): string {
		return `||${super.toString()}||`;
	}

	public override toJSON(): object {
		return {type: "spoiler", nodes: this.nodes};
	}
}

/**
 * Represents a link.
 *
 * @version 2.0.0
 * @since 1.0.0
 */
export class Link extends Element<Node> {
	public ref: Reference;
	public ref_name: string;

	/**
	 * @param url the URL to link
	 * @param title the title
	 * @param tooltip the optional tooltip
	 * @param reference non-empty string if the link is referenced later in the document
	 */
	constructor(url: string, title?: NodeInput, tooltip?: string | null, reference?: string) {
		if (title === undefined || title === "") {
			title = new Text(url);
		}

		if (reference === undefined)
			reference = "";

		super(map_nodes(title), false);
		this.ref = new Reference(url, tooltip);
		this.ref_name = reference.toLowerCase();
	}

	/**
	 * Returns whether this element has a tooltip or not.
	 *
	 * @return `true` if this element has a tooltip, else `false`
	 */
	public has_tooltip(): boolean {
		return this.ref.has_tooltip();
	}

	public override toString(): string {
		const title = super.toString();
		if (this.ref_name) {
			if (this.ref_name === title)
				return `[${title}]`;
			return `[${title}][${this.ref_name}]`;
		}
		return `[${title}](${this.ref.toString()})`;
	}

	public override toJSON(): object {
		return {type: "link", url: this.ref.url, title: this.nodes, tooltip: this.ref.tooltip, ref_name: this.ref_name};
	}
}

/**
 * Represents an image.
 *
 * @version 2.0.0
 * @since 1.0.0
 */
export class Image extends Link {
	constructor(url: string, alt: string, tooltip?: string | null, reference?: string) {
		super(url, (!alt || alt === "") ? (() => {
			if (url.startsWith("data:image/")) return "Image";
			else return url;
		})() : alt, tooltip, reference);
	}

	public override toString(): string {
		return "!" + super.toString();
	}

	public override toJSON(): object {
		return {type: "image", url: this.ref.url, alt: this.nodes, tooltip: this.ref.tooltip, ref_name: this.ref_name};
	}
}

export class InlineLatex extends Element<Node> {
	constructor(public raw: string) {
		super([]);
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
		return `$${this.raw}$`;
	}

	public override toJSON(): object {
		return {type: "inline_latex", raw: this.raw};
	}
}

/**
 * Represents a reference to a footnote.
 *
 * @version 2.0.0
 * @since 1.10.0
 */
export class FootNoteReference extends Element<Node> {
	constructor(public name: string) {
		super();
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
		return `[^${this.name}]`;
	}

	public override toJSON(): object {
		return {type: "footnote", name: this.name};
	}

	/**
	 * Converts this footnote reference as HTML.
	 *
	 * @param doc the Markdown document
	 * @returns the HTML node
	 */
	public as_html(doc: Document): html.Element | html.Text {
		const index = doc.index_of_footnote(this.name);
		if (index !== -1) {
			const anchor_id = to_anchor_name(this.name.toLowerCase());

			return html.create_element("sup")
				.with_child(html.create_element("a")
					.with_attr("id", `fn:${anchor_id}:src`)
					.with_attr("href", "#fn:" + anchor_id)
					.with_child(`${index + 1}`)
				);
		} else return new html.Text(this.name);
	}
}
