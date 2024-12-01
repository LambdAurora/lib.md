/*
 * Copyright 2024 LambdAurora <email@lambdaurora.dev>
 *
 * This file is part of lib.md.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import * as html from "@lambdaurora/libhtml";
import { Element, HtmlRenderable, map_nodes, Node, NodeInput, Reference, Text } from "./base.ts";
import { Document } from "./document.ts";
import { to_anchor_name } from "../utils.ts";

/**
 * Represents an italic element.
 *
 * @version 2.0.0
 * @since 1.0.0
 */
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

	/**
	 * Returns a representation of this node suitable for JSON-serialization.
	 *
	 * @returns the representation of this node for JSON-serialization
	 */
	public override toJSON(): object {
		return {type: "italic", nodes: this.nodes};
	}
}

/**
 * Represents a bold element.
 *
 * @version 2.0.0
 * @since 1.0.0
 */
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

	/**
	 * Returns a representation of this node suitable for JSON-serialization.
	 *
	 * @returns the representation of this node for JSON-serialization
	 */
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

	/**
	 * Returns a representation of this node suitable for JSON-serialization.
	 *
	 * @returns the representation of this node for JSON-serialization
	 */
	public override toJSON(): object {
		return {type: "underline", nodes: this.nodes};
	}
}

/**
 * Represents a struckthrough element.
 *
 * @version 2.0.0
 * @since 1.0.0
 */
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

	/**
	 * Returns a representation of this node suitable for JSON-serialization.
	 *
	 * @returns the representation of this node for JSON-serialization
	 */
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

	/**
	 * Returns a representation of this node suitable for JSON-serialization.
	 *
	 * @returns the representation of this node for JSON-serialization
	 */
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

	/**
	 * Returns a representation of this node suitable for JSON-serialization.
	 *
	 * @returns the representation of this node for JSON-serialization
	 */
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
	 * @return `true` if this element has a tooltip, or `false` otherwise
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

	/**
	 * Returns a representation of this node suitable for JSON-serialization.
	 *
	 * @returns the representation of this node for JSON-serialization
	 */
	public override toJSON(): object {
		return {type: "link", url: this.ref.url, title: this.nodes, tooltip: this.ref.tooltip, ref_name: this.ref_name};
	}
}

/**
 * Represents an image.
 *
 * @version 2.3.0
 * @since 1.0.0
 */
export class Image extends Link {
	constructor(url: string, alt: string, tooltip?: string | null, reference?: string) {
		super(url ?? "", (!alt || alt === "") ? (() => {
			if (!url) return [];
			else if (url.startsWith("data:image/")) return "Image";
			else return url;
		})() : alt, tooltip, reference);
	}

	public override toString(): string {
		return "!" + super.toString();
	}

	/**
	 * Returns a representation of this node suitable for JSON-serialization.
	 *
	 * @returns the representation of this node for JSON-serialization
	 */
	public override toJSON(): object {
		return {type: "image", url: this.ref.url, alt: this.nodes, tooltip: this.ref.tooltip, ref_name: this.ref_name};
	}
}

/**
 * Represents an inlined LaTeX expression.
 *
 * @version 2.0.0
 * @since 2.0.0
 */
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

	/**
	 * Returns a representation of this node suitable for JSON-serialization.
	 *
	 * @returns the representation of this node for JSON-serialization
	 */
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
export class FootNoteReference extends Element<Node> implements HtmlRenderable {
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

	/**
	 * Returns a representation of this node suitable for JSON-serialization.
	 *
	 * @returns the representation of this node for JSON-serialization
	 */
	public override toJSON(): object {
		return {type: "footnote", name: this.name};
	}

	/**
	 * Returns this footnote reference as an HTML node.
	 *
	 * @param document the parent Markdown document
	 * @returns the corresponding HTML node
	 */
	public as_html(document: Document): html.Element | html.Text {
		const index = document.index_of_footnote(this.name);
		if (index !== -1) {
			const anchor_id = to_anchor_name(this.name.toLowerCase());

			return html.sup([
				html.a({
					attributes: {
						id: `fn:${anchor_id}:src`,
						href: `#fn:${anchor_id}`
					},
					children: [`${index + 1}`]
				})
			]);
		} else return new html.Text(this.name);
	}
}
