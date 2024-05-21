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

/**
 * Represents a Markdown node.
 *
 * @version 2.0.0
 * @since 1.7.0
 */
export abstract class Node {
	/**
	 * Returns whether this element should be treated as a block element.
	 *
	 * @return `true` if this element should be treated as a block element, otherwise `false`
	 */
	public is_block(): boolean {
		return false;
	}

	/**
	 * Returns this node as plain text.
	 *
	 * @returns the node as plain text
	 */
	public abstract as_plain_text(): string;

	/**
	 * Returns a representation of this node suitable for JSON-serialization.
	 *
	 * @returns the representation of this node for JSON-serialization
	 */
	public abstract toJSON(): object | string;
}

/**
 * Represents a Markdown text node.
 *
 * @version 2.0.0
 * @since 1.0.0
 */
export class Text extends Node {
	/**
	 * @param content the text content
	 */
	constructor(public content: string) {
		super();
	}

	public override as_plain_text(): string {
		return this.content;
	}

	public is_linebreak(): boolean {
		return this.content === "  \n";
	}

	public override toString(): string {
		return this.content;
	}

	public override toJSON(): object | string {
		if (this.is_linebreak()) {
			return {type: "linebreak"};
		} else {
			return this.content;
		}
	}
}

class Linebreak extends Text {
	public declare readonly content: string;

	constructor() {
		super("  \n");
	}
}

/**
 * Represents a line break text.
 */
export const LINEBREAK: Linebreak = new Linebreak();

/**
 * Represents a comment.
 *
 * @version 2.0.0
 * @since 1.1.0
 */
export class Comment extends Node {
	private readonly actual: html.Comment;

	constructor(content: string) {
		super();
		this.actual = new html.Comment(content);
	}

	public get content(): string {
		return this.actual.content
	}

	public set content(content: string) {
		this.actual.content = content;
	}

	public override as_plain_text(): string {
		return "";
	}

	public as_html(): html.Comment {
		return this.actual.clone();
	}

	public override toString(): string {
		return this.actual.html();
	}

	public override toJSON(): object {
		return {type: "comment", content: this.toString()};
	}
}

export class Reference {
	public tooltip: string | null;

	constructor(public url: string, tooltip: string | null | undefined) {
		this.tooltip = tooltip ?? null;
	}

	/**
	 * Returns whether this reference has a tooltip or not.
	 *
	 * @return `true` if this reference has a tooltip, or `false` otherwise.
	 */
	public has_tooltip(): boolean {
		return this.tooltip !== undefined && this.tooltip !== "";
	}

	public toString(): string {
		return this.url + (this.has_tooltip() ? ` "${this.tooltip}"` : "");
	}
}

export type NodeInput = string | Node | readonly (Node | string)[];

export abstract class Element<Child extends Node> extends Node {
	protected nodes: Child[] = [];

	protected constructor(nodes: readonly Child[] = [], private allow_linebreak: boolean = true) {
		super();

		this.nodes = [...nodes];

		if (!allow_linebreak) {
			this.nodes = purge_linebreaks(this.nodes);
		}
	}

	/**
	 * The children of this Markdown element.
	 */
	public get children(): readonly Child[] {
		return this.nodes;
	}

	/**
	 * Pushes new children nodes to this element.
	 *
	 * @param items the children to append
	 * @returns this element
	 */
	public push(...items: (string | Node)[]): this {
		this.nodes.push(...map_nodes(items) as Child[]);
		return this;
	}

	/**
	 * Returns the nodes of this element as a string.
	 *
	 * @return the nodes as a string
	 */
	public get_nodes_as_string(): string {
		return this.nodes.map(node => node.toString()).join("");
	}

	/**
	 * Returns this element as plain text.
	 *
	 * @return this element as plain text
	 */
	public override as_plain_text(): string {
		return this.nodes.map(node => node.as_plain_text()).join("");
	}

	public override toString(): string {
		return this.get_nodes_as_string();
	}
}

export abstract class BlockElement<Child extends Node> extends Element<Child> {
	protected constructor(nodes: Child[], allow_linebreaks: boolean = true) {
		super(nodes, allow_linebreaks);
	}

	public override is_block(): true {
		return true;
	}
}

export function map_node(node: Node | string): Node {
	if (typeof node === "string") {
		return new Text(node);
	} else {
		return node;
	}
}

export function map_nodes(nodes: NodeInput): Node[] {
	let actual_nodes: Node[];

	if (nodes instanceof Array) {
		actual_nodes = nodes.map(map_node);
	} else {
		actual_nodes = [map_node(nodes)];
	}

	return actual_nodes;
}

/**
 * Purges the nodes from linebreaks
 *
 * @param nodes the nodes to purge
 */

function purge_linebreaks<N extends Node>(nodes: N[]): N[] {
	return nodes.filter(node => !(node instanceof Text && node.is_linebreak()));
}
