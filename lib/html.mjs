/*
 * Copyright © 2021-2022 LambdAurora <email@lambdaurora.dev>
 *
 * This file is part of lib.md.
 *
 * Licensed under the MIT license. For more information,
 * see the LICENSE file.
 */

import { NEW_LINE_CODE_POINT, TAG_START_CODE_POINT, TAG_END_CODE_POINT, is_character_match, merge_objects } from "./utils.mjs";

export class Node {}

/*
 * Elements
 */

function make_tag(name, options = {}) {
	const complete_options = Object.freeze(
		merge_objects({
			required_attributes: Object.freeze([]),
			self_closing: false,
			parse_inside: true,
			escape_inside: true,
			preserve_format: false,
			inline: true,
			create: function() {
				return new Element(this);
			}
		}, options)
	);
	return {
		name: name,
		...complete_options
	};
}

/**
 * Represents all of the standardized HTML5 tags.
 *
 * @version 1.3.0
 * @since 1.1.0
 */
export const Tag = Object.freeze({
	"!doctype": make_tag("!DOCTYPE", { self_closing: true }),
	a: make_tag("a", { create: () => new Link() }),
	abbr: make_tag("abbr"),
	address: make_tag("address", { inline: false }),
	area: make_tag("area", { self_closing: true }),
	article: make_tag("article", { inline: false }),
	aside: make_tag("aside", { inline: false }),
	audio: make_tag("audio", { inline: false }),
	b: make_tag("b"),
	base: make_tag("base", { self_closing: true }),
	bdi: make_tag("bdi"),
	bdo: make_tag("bdo"),
	blockquote: make_tag("blockquote", { inline: false }),
	body: make_tag("body", { inline: false }),
	br: make_tag("br", { self_closing: true, inline: false }),
	button: make_tag("button"),
	canvas: make_tag("canvas", { inline: false }),
	caption: make_tag("caption"),
	cite: make_tag("cite"),
	code: make_tag("code", { parse_inside: false }),
	col: make_tag("col", { self_closing: true }),
	colgroup: make_tag("colgroup", { inline: false }),
	data: make_tag("data"),
	datalist: make_tag("datalist", { inline: false }),
	dd: make_tag("dd"),
	del: make_tag("del"),
	details: make_tag("details", { inline: false }),
	dfn: make_tag("dfn"),
	dialog: make_tag("dialog", { inline: false }),
	div: make_tag("div", { inline: false }),
	dl: make_tag("dl", { inline: false }),
	dt: make_tag("dt"),
	em: make_tag("em"),
	fieldset: make_tag("fieldset", { inline: false }),
	figcaption: make_tag("figcaption"),
	figure: make_tag("figure", { inline: false }),
	footer: make_tag("footer", { inline: false }),
	form: make_tag("form", { inline: false }),
	h1: make_tag("h1"),
	h2: make_tag("h2"),
	h3: make_tag("h3"),
	h4: make_tag("h4"),
	h5: make_tag("h5"),
	h6: make_tag("h6"),
	head: make_tag("head", { inline: false }),
	header: make_tag("header", { inline: false }),
	hr: make_tag("hr", { self_closing: true }),
	html: make_tag("html", { inline: false }),
	i: make_tag("i"),
	iframe: make_tag("iframe", { inline: false }),
	img: make_tag("img", { required_attributes: [ "src", "alt" ], self_closing: true, create: () => new Image() }),
	input: make_tag("input", { self_closing: true }),
	ins: make_tag("ins"),
	kbd: make_tag("kbd"),
	label: make_tag("label"),
	legend: make_tag("legend"),
	li: make_tag("li"),
	link: make_tag("link", { self_closing: true }),
	main: make_tag("main", { inline: false }),
	map: make_tag("map", { inline: false }),
	mark: make_tag("mark"),
	meta: make_tag("meta", { self_closing: true }),
	meter: make_tag("meter"),
	nav: make_tag("nav", { inline: false }),
	noscript: make_tag("noscript", { inline: false }),
	ol: make_tag("ol", { inline: false }),
	optgroup: make_tag("optgroup", { inline: false }),
	option: make_tag("option"),
	output: make_tag("output"),
	p: make_tag("p", { inline: false }),
	param: make_tag("param", { self_closing: true }),
	picture: make_tag("picture", { inline: false }),
	pre: make_tag("pre", { preserve_format: true }),
	progress: make_tag("progress"),
	q: make_tag("q"),
	rp: make_tag("rp"),
	rt: make_tag("rt"),
	ruby: make_tag("ruby", { inline: false }),
	s: make_tag("s"),
	samp: make_tag("samp"),
	script: make_tag("script", { parse_inside: false, escape_inside: false, inline: false }),
	section: make_tag("section", { inline: false }),
	select: make_tag("select", { inline: false }),
	small: make_tag("small"),
	source: make_tag("source", { self_closing: true }),
	span: make_tag("span"),
	strong: make_tag("strong"),
	style: make_tag("style", { parse_inside: false, escape_inside: false, inline: false }),
	sub: make_tag("sub"),
	summary: make_tag("summary"),
	sup: make_tag("sup"),
	svg: make_tag("svg", { inline: false }),
	table: make_tag("table", { inline: false }),
	tbody: make_tag("tbody", { inline: false }),
	td: make_tag("td"),
	template: make_tag("template"),
	textarea: make_tag("textarea"),
	tfoot: make_tag("tfoot", { inline: false }),
	th: make_tag("th"),
	thead: make_tag("thead", { inline: false }),
	time: make_tag("time"),
	title: make_tag("title"),
	tr: make_tag("tr", { inline: false }),
	track: make_tag("track", { self_closing: true }),
	u: make_tag("u"),
	ul: make_tag("ul", { inline: false }),
	var: make_tag("var"),
	video: make_tag("video", { inline: false }),
	wbr: make_tag("wbr", { self_closing: true })
});

export function create_element(tag) {
	const actual_tag = typeof tag === "string" ? Tag[tag.toLowerCase()] : Tag[tag.name];
	
	if (actual_tag === undefined || actual_tag === null) {
		if (typeof tag === "string")
			return make_tag(tag).create(); // Awful leniency.

		throw new Error(`Invalid tag "${tag}" was specified`);
	}

	return actual_tag.create();
}

/**
 * Represents an HTML element, with a tag, attributes, and possibly children.
 *
 * @version 1.5.4
 * @since 1.1.0
 */
export class Element extends Node {
	constructor(tag) {
		super();

		if (typeof tag === "string") {
			this.tag = Tag[tag];
		} else {
			this.tag = tag;
		}

		if (this.tag === undefined || this.tag === null) {
			throw new Error(`Invalid tag "${tag}" was specified`);
		}

		this.attributes = [];
		this.children = [];
	}

	/**
	 * Appends a child node to this element.
	 *
	 * @param {Node|string} node the node to append
	 * @return {Node} the appended node
	 */
	append_child(node) {
		if (this.tag.self_closing) {
			throw new Error(`Cannot append children to self-closing tag "${this.tag.name}".`);
		} else if (typeof node === "string") {
			node = new Text(node);
		} else if (!(node instanceof Node)) {
			throw new Error(`The appended node must be a Node object, found ${node}.`);
		}

		this.children.push(node);
		return node;
	}

	/**
	 * Appends a child node to this element as a builder-like method.
	 *
	 * @param {Node|string} node the node to append
	 * @returns {Element} this current element
	 * @since 1.2.0
	 */
	with_child(node) {
		this.append_child(node);
		return this;
	}

	/**
	 * Creates or gets the attribute of the specified name.
	 * If a value is specified, this method will create the attribute if missing, or will replace the existing one.
	 * If no value is specified, this method will act as a getter, and will create the attribute if missing.
	 *
	 * @param {string} name the name of the attribute
	 * @param {string|string[]|undefined} value the value of the attribute,
	 * can be an array in the case of the `class` attribute
	 * @returns {Attribute} the attribute
	 */
	attr(name, value = undefined) {
		for (const [i, attribute] of this.attributes.entries()) {
			if (name === attribute.name) {
				if (value !== undefined && value !== null) {
					const replaced_attr = create_attribute(name, value);
					this.attributes[i] = replaced_attr;
					return replaced_attr;
				}
				return attribute;
			}
		}

		const attribute = create_attribute(name, value);
		this.attributes.push(attribute);
		return attribute;
	}

	/**
	 * Sets an attribute by name with the specified value.
	 * If no value is specified, nothing happens.
	 *
	 * @param {string} name the name of the attribute
	 * @param {string|string[]} value the value of the attribute,
	 * can be an array in the case of the `class` attribute
	 * @returns {Element} this current element
	 * @since 1.2.0
	 */
	with_attr(name, value = "") {
		this.attr(name, value);
		return this;
	}

	/**
	 * Gets the attribute by name.
	 *
	 * @param {string} name the name of the attribute
	 * @returns {Attribute|null} the attribute if present, else `null`
	 * @since 1.2.0
	 */
	get_attr(name) {
		for (const attribute of this.attributes) {
			if (name === attribute.name) {
				return attribute;
			}
		}
		return null;
	}

	/**
	 * Removes an attribute by name.
	 *
	 * @param {string} name the name of the attribute
	 * @since 1.2.0
	 */
	remove_attr(name) {
		for (const [i, attribute] of this.attributes.entries()) {
			if (name === attribute.name) {
				this.attributes.splice(i, 1);
				return;
			}
		}
	}

	/**
	 * Sets the specified style if a value is specified, else gets the value of the property if present.
	 *
	 * @param {string} property the style property
	 * @param {string} value the property value
	 * @returns {Element|string|null} this current element if a value is specified, else the property value if present,
	 * or `null` otherwise
	 * @since 1.2.0
	 */
	style(property, value = undefined) {
		if (value) {
			this.attr("style").set(property, value);
			return this;
		} else {
			const style = this.get_attr("style");
			if (style) return style.get(property);
			return null;
		}
	}

	/**
	 * Applies this element on the given callback.
	 *
	 * @param {(element: Element) => void} callback the function to call with this element
	 * @returns {this} this element
	 * @since 1.6.0
	 */
	with(callback) {
		callback(this);
		return this;
	}

	purge_empty_children() {
		if (this.tag.preserve_format) {
			return;
		}

		this.children = this.children.filter(child => {
			if (child instanceof Text) {
				return !child.content.match(/^[ \t\n]*$/);
			} else {
				child.purge_empty_children();
				return true;
			}
		});
	}

	/**
	 * Gets the first occurence of an element by its name in this element.
	 *
	 * @param {string} name the name of the element to search
	 * @return {Element|undefined} the found element if the search is successful, or `undefined` otherwise
	 * @since 1.4.2
	 */
	get_element_by_tag_name(name) {
		if (typeof name === "string") {
			return this.children.find(child => child instanceof Element && child.tag.name === name);
		} else if (name.name) { // It's a Tag object.
			return this.children.find(child => child instanceof Element && child.tag.name === name.name);
		} else {
			return undefined;
		}
	}

	/**
	 * Finds the first occurence of an element by its name.
	 * This method is recursive.
	 *
	 * @param {string} name the name of the element to search
	 * @return {Element|undefined} the found element if the search is successful, or `undefined` otherwise
	 * @since 1.4.1
	 */
	find_element_by_tag_name(name) {
		const result = this.get_element_by_tag_name(name);

		if (result) {
			return result;
		} else {
			for (const child of this.children) {
				if (child instanceof Element) {
					const child_result = child.find_element_by_tag_name(name);

					if (child_result) {
						return child_result;
					}
				}
			}
		}

		return undefined;
	}

	html(options) {
		options = merge_render_options(options);

		let result = `${options.get_indent_str()}<` + this.tag.name;

		if (this.attributes.length !== 0) {
			result += " " + this.attributes.map(attr => attr.html()).join(" ");
		}

		if (this.tag.self_closing) {
			if (this.tag.name === Tag["!doctype"].name) result += ">"
			else result += " />";
		} else {
			result += ">";

			if (this.children.length === 0) {
				return result + "</" + this.tag.name + ">";
			}

			if (options.prettified && !this.tag.inline) {
				result += "\n";
			}

			const inner_result = this.inner_html(get_render_sub_options(options, this, false, this.tag === Tag.pre ? -1 : 1));

			if (options.is_self_prettified(this) && inner_result !== ""
				&& !is_character_match(inner_result, NEW_LINE_CODE_POINT, inner_result.length - 1)) {
				result += inner_result + "\n";
			} else {
				result += inner_result;
			}

			if (options.is_self_prettified(this) && inner_result !== ""
				&& is_character_match(result, NEW_LINE_CODE_POINT, result.length - 1)) {
				result += options.get_indent_str();
			}

			result += "</" + this.tag.name + ">";
		}

		if (options.prettified && options.parent && !options.parent.tag.inline) {
			result += "\n";
		}

		return result;
	}

	inner_html(options) {
		options = merge_render_options(options);

		let result = "";

		if (this.children.length !== 0) {
			let last;

			for (const i in this.children) {
				const child = this.children[i];
				let indent_add = 0;

				if (child instanceof Text) {
					if (last instanceof Text) {
						if (options.is_prettified()) result += "\n";
						else result += " ";
					} else if (last instanceof Element && last.tag.inline && result.length !== 0) {
						// The goal is to determine if the additional content will fit on the same line.
						const last_line = /\n?.+\n$/.exec(result);
						if (last_line && last_line[0].length + child.content.length <= options.line_length) {
							result = result.substring(0, result.length - 1);
							indent_add = -1;
						}
					}
				}

				const sub_options = get_render_sub_options(options, this, !this.tag.escape_inside, indent_add);

				// Attempt to determine if we should strip whitespaces in front of text if it's indented on a new line.
				if (result.length === 0 || is_character_match(result, NEW_LINE_CODE_POINT, result.length - 1)) {
					sub_options.should_strip = true;
				}

				let child_content = child.html(sub_options);

				if (options.prettified && !options.raw) {
					if (last instanceof Text && child instanceof Element) {
						if (child.tag.inline && result.length !== 0) {
							const stripped = child_content.replace(/^[ \t]*/, "");

							// The goal is to determine if the additional content will fit on the same line.
							if (!result.includes("\n") && (result.length + stripped.length) <= options.line_length) {
								child_content = stripped;
							} else {
								const last_line = /\n.+\n?$/.exec(result);
								if (last_line && last_line[0].length + stripped.length <= options.line_length) {
									child_content = stripped;
								} else {
									child_content = "\n" + child_content;
								}
							}
						} else { // We have a non-inline element after text, put it on next line.
							child_content = "\n" + child_content;
							result = result.replace(/[ \t]$/, "");
						}
					}
				}

				result += child_content;

				last = child;
			}
		}

		return result;
	}

	/**
	 * Returns the text inside of the elements.
	 *
	 * @return {string} the text
	 * @since 1.5.4
	 */
	text() {
		let result = "";

		for (const child of this.children) {
			result += child.text();
		}

		return result;
	}

	toString() {
		return `Element{tag: "${this.tag.name}", `
			+ `attributes: [${this.attributes.map(attr => attr.toString()).join(", ")}], `
			+ `children: [${this.children.map(child => child.toString()).join(", ")}]}`;
	}

	toJSON() {
		return {
			type: "tag",
			tag: this.tag.name,
			attributes: this.attributes.map(attr => attr.toJSON()),
			children: this.children.map(child => child.toJSON())
		};
	}

	clone_children() {
		const cloned = [];

		for (const node of this.children) {
			cloned.push(node.clone());
		}

		return cloned;
	}

	clone_attributes() {
		const cloned = [];

		for (const attr of this.attributes) {
			cloned.push(attr.clone());
		}

		return cloned;
	}

	clone() {
		const cloned = new Element(this.tag);
		cloned.children = this.clone_children();
		cloned.attributes = this.clone_attributes();
		return cloned;
	}
}

/**
 * Represents a link element.
 * 
 * @version 1.1.0
 * @since 1.1.0
 */
export class Link extends Element {
	constructor() {
		super(Tag.a);
	}

	/**
	 * Sets a new reference value.
	 *
	 * @param {string} new_value the reference value
	 * @returns {string} the new reference value
	 */
	href(new_value) {
		return this.attr("href", new_value).value;
	}

	/**
	 * Sets a title on this link element.
	 *
	 * @param {string} new_value the title
	 * @returns {string} the new title
	 */
	title(new_value) {
		return this.attr("title", new_value).value;
	}
}

/**
 * Represents an image element.
 * 
 * @version 1.1.0
 * @since 1.1.0
 */
export class Image extends Element {
	constructor() {
		super(Tag.img);
	}

	src(new_value) {
		return this.attr("src", new_value).value;
	}

	alt(new_value) {
		return this.attr("alt", new_value).value;
	}

	title(new_value) {
		return this.attr("title", new_value).value;
	}
}

/**
 * Escapes the given attribute value.
 *
 * @param {string} value the attribute value to escape
 * @return {string} the escaped attribute value
 */
export function escape_attribute(value) {
	return value
		.replaceAll(/</g, "&lt;")
		.replaceAll(/>/g, "&gt;")
		.replaceAll(/"/g, "&quot;")
		.replaceAll(/'/g, "&#39;");
}

export function create_attribute(name, value) {
	if (value === null)
		value = "";

	switch(name) {
		case "class":
			return new ClassAttribute(value);
		case "style":
			return new StyleAttribute(value);
		default:
			return new Attribute(name, value);
	}
}

/**
 * Represents an attribute in an HTML tag.
 *
 * @version 1.3.0
 * @since 1.1.0
 */
export class Attribute {
	constructor(name, value) {
		this.name = name;
		this._value = value.toString().trim();
	}

	value() {
		return this._value;
	}

	html() {
		const value = this.value();
		if (value.length === 0) {
			return this.name;
		} else {
			return `${this.name}="${escape_attribute(value)}"`;
		}
	}

	toString() {
		return `Attribute{name: "${this.name}", value: "${this.value()}"]}`;
	}

	toJSON() {
		return {
			type: "attribute",
			name: this.name,
			value: this.value()
		};
	}

	clone() {
		return create_attribute(this.name, this._value);
	}
}

/**
 * Represents a `class` HTML attribute.
 *
 * @version 1.1.0
 * @since 1.1.0
 */
export class ClassAttribute extends Attribute {
	constructor(value) {
		super("class", "");

		if (value instanceof Array) {
			this._value = value;
		} else if (typeof value === "string") {
			if (value.includes(" "))
				this._value = value.split(" ");
			else
				this._value = [value];
		} else {
			this._value = [];
		}
	}

	add(class_name) {
		this._value.push(class_name);
	}

	remove(class_name) {
		for (let i = 0; i < this._value.length; i++) {
			if (this._value[i] === class_name) {
				this._value.splice(i);
				break;
			}
		}
	}

	value() {
		return this._value.join(" ");
	}

	toString() {
		return `ClassAttribute{name: "${this.name}", value: "${this.value()}", classes: [${this._value.join(", ")}}`;
	}

	toJSON() {
		return {
			type: "class_attribute",
			name: this.name,
			value: this.value(),
			classes: this._value
		};
	}
}

/**
 * Represents a `style` HTML attribute.
 *
 * @version 1.2.0
 * @since 1.2.0
 */
 export class StyleAttribute extends Attribute {
	constructor(value) {
		super("style", "");

		if (value instanceof Object) {
			this._value = value;
		} else if (typeof value === "string") {
			value = value.replace(/\/\*(?:.|\n)*?\*\//, "");
			this._value = {};

			value.split(";").forEach(rule => {
				if (/^\s*$/.test(rule))
					return;
				const split = rule.split(":");
				let property_value = "";
				if (split[1]) property_value = split.slice(1).join(":");
				if (split[0]) this.set(split[0], property_value);
			});
		} else {
			this._value = {};
		}
	}

	set(property, value) {
		if (typeof value !== "string") {
			value = value.toString();
		}

		this._value[property] = value.trim();
	}

	get(property) {
		return this._value[property];
	}

	remove(property) {
		delete this._value[property];
	}

	value() {
		return Object.entries(this._value).map(([key, value]) => `${key}: ${value}`).join("; ");
	}

	toString() {
		const style = Object.entries(this._value).map(([key, value]) => `${key}: ${value}`).join(",");
		return `StyleAttribute{name: "${this.name}", value: "${this.value()}", style: {${style}}}`;
	}

	toJSON() {
		return {
			type: "style_attribute",
			name: this.name,
			value: this.value(),
			style: this._value
		};
	}
}

/*
 * Inlines
 */

/**
 * Escapes ampersands in the given text.
 *
 * @param {string} text the text to escape
 * @returns {string} the escaped text
 * @since 1.4.3
 */
export function escape_ampersand(text) {
	return text.replace(/&/g, "&amp;");
}

/**
 * Escapes the given text.
 *
 * @param {string} text the text to escape
 * @return {string} the escaped text
 */
export function escape_text(text) {
	return text
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

export const TextMode = Object.freeze({ TEXT: "text", RAW: "raw", CODE: "code" });

/**
 * Represents a text node.
 *
 * @version 1.4.3
 * @since 1.1.0
 */
export class Text extends Node {
	/**
	 * @param {string} content the text content
	 */
	constructor(content, mode = TextMode.TEXT) {
		super();

		if (mode === TextMode.CODE) {
			this.set_code(content);
		} else if (mode === TextMode.TEXT) {
			this.set_text(content);
		} else {
			this.content = content;
		}
	}

	/**
	 * Sets the text of this text node.
	 *
	 * The text is escaped.
	 *
	 * @param {string} text the text
	 * @since 1.4.3
	 */
	set_text(text) {
		this.content = escape_text(text);
	}

	/**
	 * Sets the text of this text node as if the text is code.
	 *
	 * The text is escaped, including ampersands.
	 *
	 * @param {string} text the text
	 * @see Text#set_text
	 * @since 1.4.3
	 */
	set_code(text) {
		this.set_text(escape_ampersand(text));
	}

	html(options) {
		options = merge_render_options(options);

		let content = this.content;

		if (options.is_prettified() && options.should_strip) {
			content = content.trimStart();
		}

		return options.get_indent_str() + content;
	}

	text() {
		return this.content;
	}

	toString() {
		return `TextNode{${this.content}}`;
	}

	toJSON() {
		return this.content;
	}

	clone() {
		return new Text(this.content, TextMode.RAW);
	}
}

/**
 * Represents a comment node.
 *
 * @version 1.1.0
 * @since 1.1.0
 */
export class Comment extends Text {
	/**
	 * @param {string} content the comment content
	 */
	constructor(content) {
		super(content);
	}

	html(options) {
		options = merge_render_options(options);

		return `${options.get_indent_str()}<!-- ${super.html()} -->`;
	}

	text() {
		return "";
	}

	toString() {
		return `CommentNode{${this.content}}`;
	}

	toJSON() {
		return {
			type: "comment",
			content: this.content
		};
	}

	clone() {
		return new Comment(this.content);
	}
}

/*
 * Utils
 */

const DEFAULT_RENDER_OPTIONS = {
	raw: false,
	prettified: true,
	line_length: 160,
	parent: null,
	should_strip: false,
	indent: 0,
	is_prettified: function() {
		return this.prettified && (!this.parent || (this.parent.tag !== Tag.pre && !this.parent.tag.inline));
	},
	is_self_prettified: function(current) {
		return this.prettified && current.tag !== Tag.pre && !current.tag.inline;
	},
	get_indent_str: function() {
		if (this.is_prettified()) {
			return "\t".repeat(this.indent);
		} else {
			return "";
		}
	}
};

function merge_render_options(options) {
	if (typeof options === "boolean") {
		return merge_objects(DEFAULT_RENDER_OPTIONS, { raw: options });
	}
	return merge_objects(DEFAULT_RENDER_OPTIONS, options);
}

function get_render_sub_options(options, parent, raw, indent) {
	return {
		raw: options.raw || raw,
		prettified: options.prettified,
		parent: parent,
		indent: indent === -1 ? 0 : options.indent + indent
	};
}

/**
 * Sanitizes recursively the given element(s).
 *
 * @param {Element|Text|Element[]} element the element(s) to sanitize
 * @param {(string|{name: string})[]} disallowed_tags the tags that should be escaped
 * @param {(node: Node) => Node} extra extra custom sanitizer
 * @returns {Element|Text|Element[]} the sanitized element(s)
 */
export function sanitize_elements(element, disallowed_tags, extra = node => node) {
	function execute(el, disallowed_tags) {
		if (el instanceof Text) {
			return el;
		} else if (el instanceof Array) {
			for (let i = 0; i < el.length; i++) {
				el[i] = execute(el[i], disallowed_tags);
			}
			return el;
		} else if (el) {
			if (disallowed_tags.includes(el.tag.name)) {
				return new Text(el.html(true), TextMode.CODE);
			} else {
				execute(el.children, disallowed_tags);
				return extra(el);
			}
		}
	}

	if (element instanceof Element || element instanceof Text)
		return execute([element], disallowed_tags.map(tag => (tag.name) ? tag.name : tag))[0];
	else
		return execute(element, disallowed_tags.map(tag => (tag.name) ? tag.name : tag));
}

/*
 * Parser
 */

/**
 * Attempts to parse HTML nodes from a given HTML source.
 *
 * @param {string} source the HTML source
 * @returns {Node[]} the HTML nodes
 */
export function parse_nodes(source) {
	const nodes = [];

	parse_html(source, {
		tag: Tag.div,
		append_child: node => nodes.push(node)
	});

	return nodes;
}

/**
 * Attempts to parse the first HTML node encountered from a given HTML source.
 *
 * @param {string} source the HTML source
 * @param {Element|null} container a container for which the parsed content should be appended as children
 * @returns {Node} the first parsed node, or the container if it was provided and not null
 */
export function parse(source, container = null) {
	if (container !== null) {
		parse_html(source, container);
		return container;
	} else
		return parse_nodes(source)[0];
}

const TAG_END_REGEX = /^\s*<\/\s*([^<>\s]+)\s*\>/;
const ATTRIBUTE_REGEX = /^\s*([^ \t\n\r"'>\/=]+)(?:\s*=\s*((?:[^"' \t\n\r<>`]+)|(?:'([^"]+?)')|(?:"([^']+?)")))?/;
const COMMENT_END_REGEX = /-->/;

/**
 * Attempts to parse and consume a text node from the given HTML source.
 *
 * @param {string} source the HTML source
 * @param {number} start the character index where the parsing should begin
 * @param {Element} parent the parent element to which the parsed nodes will be appended to
 * @returns {{text: Text, end: number}|null} `null` if the parsing failed,
 * or a result containing the text node and where it ends in the source otherwise
 */
function parse_text(source, start, parent) {
	let end = -1;
	for (let i = start; i < source.length; i++) {
		const character = source.codePointAt(i);
		if (character === TAG_START_CODE_POINT) { // Possible control character.
			if (i === source.length - 1) // If it's the last character, it's not a control character.
				continue;

			if (!parent.tag.parse_inside) { // In the case of a code block we can ignore control characters, except the code ending tag.
				const result = TAG_END_REGEX.exec(source.substring(i));

				if (result) {
					if (result[1].toLowerCase() === parent.tag.name)
						break;
				}
			} else {
				break;
			}
		}

		end = i - start;
	}

	if (end !== -1) {
		const length = end + 1;
		if (length !== 1) end++;
		return {
			text: new Text(source.substring(start, start + length), TextMode.RAW),
			end: Math.max(1, end)
		};
	} else {
		return null;
	}
}

/**
 * Attempts to parse as many HTML nodes as possible starting from the beginning of the given source string.
 *
 * @param {string} source the HTML source
 * @param {Element} parent the parent element to which the parsed nodes will be appended to
 * @returns {number} the number of characters that have been consumed in the parsing process
 */
function parse_html(source, parent) {
	let i = 0;
	while (i < source.length) {
		if (source.codePointAt(i) === TAG_START_CODE_POINT) {
			const sub_source = source.substring(i);
			let result = parse_tag_start(sub_source);

			if (result) {
				let skip_length = result.length;
				const element = result.node;

				if (!result.self_closing && !element.tag.self_closing) {
					// Not a self-closing tag, parse inside.
					skip_length += parse_html(source.substring(i + result.length), element);
				}

				parent.append_child(element);

				i += skip_length;
				continue;
			} else {
				// Test for an end tag.
				result = sub_source.match(TAG_END_REGEX);

				if (result) {
					i += result[0].length;

					if (parent.tag.name === result[1].toLowerCase()) {
						break;
					}

					continue;
				} else {
					// Test for a comment.
					result = parse_comment(sub_source);

					if (result) {
						i += result.length;

						parent.append_child(result.comment);

						continue;
					}
				}
			}
		} else {
			const text_result = parse_text(source, i, parent);

			if (text_result) {
				parent.append_child(text_result.text);
				i += text_result.end;
				continue;
			}
		}

		i++;
	}

	return i;
}

/**
 * Attempts to parse the start of an HTML tag at the beginning of the source string.
 *
 * @param {string} source the HTML source
 * @returns {{node: Element, length: number, self_closing: boolean}|null} `null` if no HTML tag start is present,
 * or an object containing the parsed element, the length it takes in the source,
 * and whether the tag is self closing or not otherwise
 */
function parse_tag_start(source) {
	const tag_result = source.match(/^<([^<>\s/]+)/);
	if (!tag_result)
		return null;

	if (source.startsWith("<!--"))
		return null;

	const node = create_element(tag_result[1]);

	const attributes_length = parse_attributes(source.substring(tag_result[0].length), node);

	let length = source.length;
	let self_closing = false;
	for (let i = (tag_result[0].length + attributes_length); i < source.length; i++) {
		if (source.charAt(i) === '/') {
			if ((i + 1) < source.length && source.codePointAt(i + 1) === TAG_END_CODE_POINT) {
				self_closing = true;
				length = i + 2;
				break;
			}
		} else if (source.codePointAt(i) === TAG_END_CODE_POINT) {
			length = i + 1;
			break;
		}
	}

	return {
		node: node,
		length: length,
		self_closing: self_closing
	}
}

/**
 * Trims a given comment string.
 *
 * @param {string} comment the comment
 * @returns {string} the trimmed comment
 */
function remove_useless_comment_spaces(comment) {
	return comment.replace(/^\s*/, "").replace(/\s*$/, "");
}

/**
 * Attempts to parse an HTML comment at the beginning of the given source.
 *
 * @param {string} source the source
 * @returns {{comment: Comment, length: number}|null} if failed `null`, or the comment with skip length otherwise
 */
export function parse_comment(source) {
	if (!source.startsWith("<!--"))
		return null;

	const i = 4;
	if (source.length === i) {
		// Only the start is present, somehow, the HTML specification would be extremely mad,
		// but everyone decides to parse it as a valid, so let's do it here too!
		return { comment: new Comment(""), length: i };
	}

	// HTML specification says that a comment text
	// must not start with the string ">", nor start with the string "->",
	// nor contain the strings "<!--", "-->", or "--!>",
	// nor end with the string "<!-".
	// BUT IN PRACTICE, those rules are ignored in most parsers.
	// So why even try?
	const result = COMMENT_END_REGEX.exec(source);

	if (!result) {
		return {
			comment: new Comment(remove_useless_comment_spaces(source.substring(4))),
			length: source.length
		};
	}

	return {
		comment: new Comment(remove_useless_comment_spaces(source.substring(4, result.index))),
		length: result.index + 3
	};
}

/**
 * Attempts to parse the attributes of a given HTML element.
 *
 * @param {string} source the HTML source
 * @param {Element} parent the HTML element currently being parsed
 * @returns {number} the amount of characters consumed by the attribute parser
 */
function parse_attributes(source, parent) {
	let length = 0;
	let result;
	do {
		if (source.length > 0 && source.codePointAt(0) === TAG_END_CODE_POINT)
			break;

		result = ATTRIBUTE_REGEX.exec(source);

		if (!result) break;

		source = source.substring(result.index + result[0].length);
		length += (result.index + result[0].length);

		let value = result[2];
		if (result[3]) value = result[3];
		else if (result[4]) value = result[4];
		else if (!value) value = "";

		parent.attr(result[1], value);
	} while (source.length > 0);

	return length;
}
