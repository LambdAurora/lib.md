/*
 * Copyright 2024 LambdAurora <email@lambdaurora.dev>
 *
 * This file is part of lib.md.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { BlockElement, Comment, Element, Node, Reference, Text } from "./base.ts";
import { Paragraph } from "./block.ts";
import { Link } from "./element.ts";
import { to_anchor_name } from "../utils.ts";

/**
 * Represents the entry of a reference inside a Markdown document.
 */
export interface ReferenceEntry {
	/**
	 * The name of this reference.
	 */
	name: string;
	/**
	 * The reference details.
	 */
	ref: Reference;
}

/**
 * Represents the entry of a footnote inside a Markdown document.
 */
export interface FootnoteEntry {
	/**
	 * The identifier of this footnote.
	 */
	id: string;
	/**
	 * The name of this footnote.
	 */
	name: string;
	/**
	 * The anchor string of this footnote.
	 */
	anchor: string;
	/**
	 * The nodes of this footnote.
	 */
	nodes: Node[];
}

/**
 * Represents a Markdown document.
 */
export class Document {
	private _references: ReferenceEntry[];
	private _footnotes: FootnoteEntry[];

	constructor(public blocks: BlockElement<any>[] = []) {
		this._references = [];
		this._footnotes = [];
	}

	/**
	 * Pushes a block element in this document.
	 *
	 * @param block the block to push
	 * @return this document
	 */
	public push(block: BlockElement<any> | Text | Comment | string): this {
		if (typeof block === "string")
			block = new Text(block);
		if (block instanceof Text || block instanceof Comment)
			block = new Paragraph([block]);
		this.blocks.push(block);
		return this;
	}

	/**
	 * The references present in this document.
	 */
	public get references(): readonly ReferenceEntry[] {
		return this._references;
	}

	/**
	 * Pushes a new reference in this document.
	 *
	 * @param name the reference name
	 * @param reference the reference to push
	 * @return this document
	 */
	public ref(name: string, reference: Reference): this {
		if (!this.has_ref(name))
			this._references.push({name: name.toLowerCase(), ref: reference});
		return this;
	}

	/**
	 * Returns whether this document has a reference or not.
	 *
	 * @param name the reference name
	 * @return `true` if the reference is found, or `false` otherwise
	 */
	public has_ref(name: string): boolean {
		name = name.toLowerCase();
		return this._references.some(ref => ref.name === name);
	}

	/**
	 * The footnotes present in this document.
	 */
	public get footnotes(): readonly FootnoteEntry[] {
		return this._footnotes;
	}

	/**
	 * Adds a footnote to this document.
	 *
	 * @param name the name of the footnote
	 * @param node the Markdown node of the content of the footnote
	 * @returns this document
	 * @since 1.10.0
	 */
	public add_footnote(name: string, node: Node | Node[]): this {
		if (!this.has_footnote(name)) {
			const id = name.toLowerCase();
			this._footnotes.push({id: id, name: name, anchor: "fn:" + to_anchor_name(id), nodes: node instanceof Array ? node : [node]});
		}

		return this;
	}

	/**
	 * Returns whether this document contains the specified footnote by its name.
	 *
	 * @param name the name of the footnote
	 * @returns `true` if the footnote is found, or `false` otherwise
	 * @since 1.10.0
	 */
	public has_footnote(name: string): boolean {
		name = name.toLowerCase();
		return this._footnotes.some(footnote => footnote.id === name);
	}

	/**
	 * Returns the index of the specified footnote.
	 *
	 * @param name the name of the footnote
	 * @returns the index of the footnote, or `-1` if no footnote could be found
	 * @since 1.10.0
	 */
	public index_of_footnote(name: string): number {
		name = name.toLowerCase();
		return this._footnotes.findIndex((value) => value.id === name);
	}

	/**
	 * Clears this document.
	 *
	 * @returnthis document
	 */
	public clear(): this {
		this.blocks = [];
		this._references = [];
		this._footnotes = [];
		return this;
	}

	public toString(): string {
		let references = this._references;
		this.blocks.forEach(block => references = references.concat(get_references(block)!));

		const footnotes = this._footnotes.map(footnote => {
			const content = footnote.nodes.map(node => node.toString()).join("");
			return `[^${footnote.id}]: ${content}`;
		});

		return this.blocks.map(block => block.toString() + "\n").join("\n")
			+ (footnotes.length !== 0 ? "\n" + footnotes.join("\n") + "\n" : "")
			+ (references.length !== 0 ? "\n" + references.filter(ref => ref.ref.url !== undefined).map(ref => `[${ref.name}]: ${ref.ref.toString()}`).filter((v, i, arr) => arr.indexOf(v) === i).join("\n")
				+ "\n" : "");
	}

	/**
	 * Returns a representation of this document suitable for JSON-serialization.
	 *
	 * @returns the representation of this document for JSON-serialization
	 */
	public toJSON(): object {
		return {
			blocks: this.blocks.map(block => block.toJSON()),
			references: this._references,
			footnotes: this._footnotes,
		}
	}
}

/**
 * Gets all "external" references in the element nodes.
 * It will search for a Link or Image object and checks whether it has an "external" reference or not, if it has it will add it in the returning array.
 *
 * @param element the current element to extract references
 */
function get_references(element: Element<any>): ReferenceEntry | ReferenceEntry[] | undefined {
	// References are only present in Link and Image and Image extends Link.
	if (element instanceof Link) {
		// Checks if it uses "external" reference.
		if (element.ref_name !== "") {
			return {name: element.ref_name, ref: element.ref};
		}
		// Not a Link or Image? Then retry with its child nodes.
	} else if (element instanceof Text || element instanceof Comment) {
		return [];
	} else {
		return element.children.map(node => get_references(node)).filter(node => node !== undefined).flat() as ReferenceEntry[];
	}
}
