/*
 * Copyright 2024 LambdAurora <email@lambdaurora.dev>
 *
 * This file is part of lib.md.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import * as md from "./tree/index.ts";
import * as html from "@lambdaurora/libhtml";
import { HTML_TAGS_TO_PURGE_SUGGESTION } from "../utils.ts";

const DEFAULT_STRIKETHROUGH_CLASS_NAME = "strikethrough";
const DEFAULT_UNDERLINE_CLASS_NAME = "underline";

export interface ClassNameOptions {
	class_name?: string;
}

export interface BlockCodeRenderOptions {
	class_name: string;
	highlighter: ((code: string, language: string, parent: html.Element) => void) | null;
}

export interface CheckBoxRenderOptions {
	enable: boolean;
	disabled_property: boolean;
}

export interface CodeRenderOptions {
	process: (node: md.InlineCode) => html.Node;
}

export interface FootnoteRenderOptions {
	footnotes_class: string;
	footnote_src_link_class: string;
	render: ((footnotes: readonly md.FootnoteEntry[], nodes_render: (nodes: md.Node[], parent: html.Element) => void) => html.Node[]) | null;
}

export interface HighlightRenderOptions {
	enable: boolean;
}

export interface InlineHtmlRenderOptions {
	enable: boolean;
	disallowed_tags: readonly string[];
}

export interface LatexRenderOptions {
	katex?: {
		renderToString: (expression: string, options: Partial<{ displayMode: boolean, output: string }>) => string;
	};
	render: ((node: md.InlineLatex | md.LatexDisplay) => (html.Element | string)) | null;
	error_classes: readonly string[];
}

export interface SpoilerRenderOptions {
	enable: boolean;
	class_name: string;
	image_class_name: string;
	hidden_class_name: string;
}

export interface TableRenderOptions {
	process: (element: html.Element) => void;
}

export interface UnderlineRenderOptions extends ClassNameOptions {
	enable: boolean;
}

interface BaseRenderOptions {
	block_code: Partial<BlockCodeRenderOptions>;
	checkbox: CheckBoxRenderOptions;
	code: CodeRenderOptions;
	emoji: ((node: md.Emoji) => html.Node) | null;
	footnote: Partial<FootnoteRenderOptions>;
	highlight: HighlightRenderOptions;
	image: ClassNameOptions;
	inline_html: InlineHtmlRenderOptions | boolean;
	latex: Partial<LatexRenderOptions>;
	spoiler: Partial<SpoilerRenderOptions>;
	table: TableRenderOptions;
	strikethrough?: ClassNameOptions;
	underline?: UnderlineRenderOptions;
}

export interface RenderOptions extends BaseRenderOptions {
	parent?: html.Element | null;
}

export interface DomRenderOptions extends BaseRenderOptions {
	parent?: HTMLElement | null;
}

interface RenderContext extends RenderOptions {
	block_code: BlockCodeRenderOptions;
	footnote: FootnoteRenderOptions;
	inline_html: InlineHtmlRenderOptions;
	latex: LatexRenderOptions;
	spoiler: SpoilerRenderOptions;
	parent: html.Element;
	paragraph_as_text: boolean;
	should_escape: boolean;
}

const DEFAULT_OPTIONS: RenderOptions = {
	block_code: {
		class_name: "block_code",
		highlighter: null
	},
	checkbox: {
		enable: true,
		disabled_property: true
	},
	code: {
		process: el => el.as_html()
	},
	emoji: null,
	footnote: {
		footnotes_class: "footnotes",
		footnote_src_link_class: "footnote_src_link",
		/**
		 * Renders the footnotes as HTML.
		 *
		 * @param footnotes the footnotes to render
		 * @param nodes_render a callback to render nodes
		 * @returns the array of HTML elements to append
		 */
		render(footnotes: readonly md.FootnoteEntry[], nodes_render: (nodes: md.Node[], parent: html.Element) => void): html.Node[] {
			const ol = html.create_element("ol")
				.with_attr("class", this.footnotes_class);

			footnotes.forEach((footnote) => {
				const el = html.create_element("li")
					.with_attr("id", footnote.anchor);

				nodes_render(footnote.nodes, el);

				el.append_child(" ");
				el.append_child(html.create_element("a")
					.with_attr("class", this.footnote_src_link_class)
					.with_attr("href", `#${footnote.anchor}:src`)
					.with_child("↩")
				);

				ol.append_child(el);
			});

			return [
				html.create_element("hr"),
				ol,
			];
		}
	},
	highlight: {
		enable: true
	},
	inline_html: {
		enable: true,
		disallowed_tags: HTML_TAGS_TO_PURGE_SUGGESTION
	},
	image: {
		class_name: ""
	},
	latex: {
		render: null,
		error_classes: ["error"]
	},
	table: {
		process: _ => {
		}
	},
	underline: {
		enable: true
	},
	spoiler: {
		enable: false,
		class_name: "spoiler",
		image_class_name: "spoiler_img",
		hidden_class_name: "spoiler_hidden"
	},
	parent: null
}

const ATTRIBUTES_RULES = {
	"*": ["align", "aria-hidden", "class", "id", "lang", "style", "title"],
	img: ["width", "height", "src", "alt"],
	a: ["href"],
	audio: ["controls", "loop", "preload", "src"],
	iframe: ["allow", "allowfullscreen", "frameborder", "src", "width", "height"],
	source: ["src", "type"]
};

function sanitize_raw<N extends html.Node>(node: N): N {
	if (node instanceof html.Element) {
		node.attributes = node.attributes.filter(attribute =>
			ATTRIBUTES_RULES["*"].includes(attribute.name)
			|| (ATTRIBUTES_RULES as any)[node.tag.name]?.includes(attribute.name)
		);
	}
	return node;
}

function merge_default_options(options: Partial<RenderOptions>): RenderContext {
	return html.merge_objects(DEFAULT_OPTIONS, options) as RenderContext;
}

function fill_element(element: html.Element, nodes: readonly html.Node[]): void {
	nodes.forEach(node => element.append_child(node));
}

function render_simple(markdown: md.Document, node: md.Element<any>, context: RenderContext, el_name: string, allow_linebreak: boolean = false): html.Element {
	const element = html.create_element(el_name);

	const tmp = context.should_escape;
	context.should_escape = true;
	render_inline(markdown, node.children, context, allow_linebreak).forEach(node => element.append_child(node));
	context.should_escape = tmp;

	return element;
}

function render_latex(node: md.InlineLatex | md.LatexDisplay, context: RenderContext): html.Node | string {
	if (!context.latex.render) {
		return new html.Text(node.toString());
	}

	let latex;
	try {
		latex = context.latex.render(node);
	} catch (error) {
		return html.create_element((node instanceof md.LatexDisplay) ? "div" : "span")
			.with_attr("class", [...context.latex.error_classes])
			.with_child(error.message);
	}

	if (!context.should_escape && typeof latex === "string") {
		return latex;
	}

	if (latex instanceof html.Element)
		return latex;

	const template = html.create_element("div");
	html.parse(latex, template);
	if (template.children.length === 1)
		return template.children[0];
	else
		return template;
}

function render_inline(markdown: md.Document, nodes: readonly md.Node[], context: RenderContext, allow_linebreak = false): html.Node[] {
	return nodes.flatMap(node => {
		if (node instanceof md.Emoji) {
			if (!context.emoji)
				return node.toString();
			return context.emoji(node);
		} else if (node instanceof md.Text && !(node instanceof md.InlineCode || node instanceof md.InlineLink)) {
			if (node.is_linebreak()) {
				if (!allow_linebreak)
					return null;
				return html.create_element("br");
			}

			if (!context.should_escape)
				return node.content;

			if (context.inline_html.enable) {
				return html.sanitize_elements(html.parse_nodes(node.content), context.inline_html.disallowed_tags, sanitize_raw);
			} else {
				return new html.Text(node.content);
			}
		} else if (node instanceof md.InlineCode) {
			return context.code.process(node);
		} else if (node instanceof md.Image) {
			const element = html.create_element("img");
			element.alt = node.get_nodes_as_string();

			let ref: md.Reference = node.ref;
			if (node.ref_name) {
				const ref_entry = markdown.references.find(ref => ref.name === node.ref_name);
				if (ref_entry)
					ref = ref_entry.ref;
			}
			if (ref) {
				element.src = ref.url;
				if (ref.has_tooltip()) {
					element.title = ref.tooltip!;
				}
			}

			element.attr("class", context.image.class_name);

			return element;
		} else if (node instanceof md.Link) {
			const element = html.create_element("a");

			let ref = node.ref;
			if (node.ref_name) {
				const ref_entry = markdown.references.find(ref => ref.name === node.ref_name);
				if (ref_entry)
					ref = ref_entry.ref;
			}
			if (ref) {
				element.href = ref.url;
				if (ref.has_tooltip()) {
					element.title = ref.tooltip!;
				}
			}

			fill_element(element, render_inline(markdown, node.children, context, false));

			return element;
		} else if (node instanceof md.Bold || (!context.underline?.enable && node instanceof md.Underline)) {
			return render_simple(markdown, node, context, "b", allow_linebreak);
		} else if (node instanceof md.Italic) {
			return render_simple(markdown, node, context, "em", allow_linebreak);
		} else if (node instanceof md.Strikethrough) {
			const element = render_simple(markdown, node, context, "span", allow_linebreak);
			element.attr("class", context.strikethrough?.class_name ?? DEFAULT_STRIKETHROUGH_CLASS_NAME);
			return element;
		} else if (node instanceof md.Underline && context.underline?.enable) {
			const element = render_simple(markdown, node, context, "span", allow_linebreak);
			element.attr("class", context.underline.class_name ?? DEFAULT_UNDERLINE_CLASS_NAME);
			return element;
		} else if (node instanceof md.Highlight) {
			if (!context.highlight.enable) {
				const content = render_inline(markdown, node.children, context, false);
				const container = html.create_element("span");
				if (content.length !== 0 && content[0] instanceof html.Text) {
					content[0].content = "==" + content[0].content;
				} else {
					container.append_child("==");
				}
				content.forEach(node => container.append_child(node));
				container.append_child("==");
				return container;
			}

			return render_simple(markdown, node, context, "mark", allow_linebreak);
		} else if (node instanceof md.Spoiler) {
			const content = render_inline(markdown, node.children, context, false);

			if (!context.spoiler.enable) {
				const container = html.create_element("span");
				if (content.length !== 0 && content[0] instanceof html.Text) {
					content[0].content = "||" + content[0].content;
				} else {
					container.append_child("||");
				}
				content.forEach(node => container.append_child(node));
				container.append_child("||");
				return container;
			}

			if (node.children.length === 1 && node.children[0] instanceof md.Image) {
				const image = content[0] as html.Element;
				image.attr("class").add(context.spoiler.image_class_name);

				return html.create_element("div")
					.with_attr("class", context.spoiler.class_name)
					.with_child(html.create_element("div")
						.with_attr("class", `${context.spoiler.image_class_name} ${context.spoiler.hidden_class_name}`)
						.with_child(image)
					);
			}

			const content_element = html.create_element("span");
			content.forEach(node => content_element.append_child(node));

			return html.create_element("span")
				.with_attr("class", `${context.spoiler.class_name} ${context.spoiler.hidden_class_name}`)
				.with_child(content_element);
		} else if (node instanceof md.InlineLatex) {
			return render_latex(node, context);
		} else if (context.footnote && node instanceof md.FootNoteReference) {
			return node.as_html(markdown);
		} else if ((node as any)["as_html"]) {
			return (node as any).as_html(markdown);
		}
	}).filter(node => node !== null && node !== undefined);
}

function render_blocks(markdown: md.Document, blocks: readonly md.Node[], parent: html.Element, context: RenderContext): void {
	blocks.forEach(block => {
		if (block instanceof md.Heading) {
			const heading = html.create_element(block.level)
				.with_attr("id", block.get_id());

			render_inline(markdown, block.children, context, false).forEach(node => heading.append_child(node));

			parent.append_child(heading);
		} else if (block instanceof md.Paragraph) {
			if (context.paragraph_as_text) {
				render_inline(markdown, block.children, context, true).forEach(node => parent.append_child(node));
			} else {
				const paragraph = html.create_element("p");

				render_inline(markdown, block.children, context, true).forEach(node => paragraph.append_child(node));

				parent.append_child(paragraph);
			}
		} else if (block instanceof md.BlockCode) {
			const code = html.create_element("code");

			let language_class;
			if (block.language && block.language !== "") {
				language_class = `language-${block.language}`;

				if (context.block_code.highlighter) {
					const parent = html.create_element("div");
					context.block_code.highlighter(block.code, block.language, parent);
					code.children = parent.children;
				} else {
					code.append_child(new html.Text(block.code));
				}
			} else {
				code.append_child(new html.Text(block.code));
			}

			const pre = html.create_element("pre")
				.with_attr("class", language_class)
				.with_child(code.with_attr("class", language_class));

			if (context.block_code.class_name) {
				parent.append_child(html.create_element("div")
					.with_attr("class", context.block_code.class_name)
					.with_child(pre)
				);
			} else {
				parent.append_child(pre);
			}
		} else if (block instanceof md.BlockQuote) {
			const quote = html.create_element("blockquote");

			for (const child of block.children) {
				if (child.is_block()) {
					render_blocks(markdown, [child as md.BlockElement<any>], quote, context);
				} else {
					render_inline(markdown, [child], context, true).forEach(node => quote.append_child(node));
				}
			}

			parent.append_child(quote);
		} else if (block instanceof md.InlineHTML) {
			if (context.inline_html.enable) {
				html.parse_nodes(render_inline(markdown, block.children, html.merge_objects(context, {should_escape: false}), true).map(node => {
					if (typeof node === "string") {
						return node;
					} else {
						return node.html();
					}
				}).join(""))
					.forEach(node => {
						parent.append_child(sanitize_raw(node));
					});
			} else {
				const paragraph = html.create_element("p");

				render_inline(markdown, [new md.Text(block.toString())], context, true).forEach(node => paragraph.append_child(node));

				parent.append_child(paragraph);
			}
		} else if (block instanceof md.InlineLatex) {
			const element = render_latex(block, context);
			if (element instanceof html.Text && !(element instanceof html.Comment) && !context.paragraph_as_text) {
				const paragraph = html.create_element("p");
				paragraph.append_child(element);
				parent.append_child(paragraph);
				return;
			}
			parent.append_child(element);
		} else if (block instanceof md.List) {
			parent.append_child(render_list(markdown, block, context));
		} else if (block instanceof md.Table) {
			const table = html.create_element("table")
				// See https://developer.mozilla.org/en-US/docs/Web/CSS/display#tables
				// We have to re-add the role=table to avoid destroying accessibility if a display: block is used,
				// which is most often needed as display: table does not respect max-width rules.
				.with_attr("role", "table");

			// Head
			const thead = html.create_element("thead")
				.with_child(render_table_row(markdown, block.get_head(), true, context));
			// Body
			const tbody = html.create_element("tbody");

			block.children.forEach((row, index) => {
				if (index == 0) return;

				tbody.append_child(render_table_row(markdown, row, false, context));
			})

			context.table.process(table.with_child(thead).with_child(tbody));
			parent.append_child(table);
		} else if (block instanceof md.TableOfContents) {
			parent.append_child(render_list(markdown, block.as_list(markdown), context));
		} else if ((block as any)["as_html"]) {
			parent.append_child((block as any).as_html());
		} else {
			render_inline(markdown, [block], context);
		}
	});
}

function render_list(markdown: md.Document, list: md.List, context: RenderContext, level = 0) {
	if (level > 3)
		level = 3;

	const html_list = html.create_element(list.ordered ? "ol" : "ul");

	if (list.ordered && list.ordered_start !== 1) {
		html_list.attr("start", list.ordered_start.toString());
	}

	list.children.forEach(entry => {
		const li = html.create_element("li");

		if (context.checkbox.enable && typeof entry.checked === "boolean") {
			li.style("list-style-type", "none");
			const checkbox = html.create_element("input")
				.with_attr("type", "checkbox")
				.with_attr("style", {"list-style-type": "none", margin: "0 0.2em 0 -1.3em"});

			if (entry.checked)
				checkbox.attr("checked");

			if (context.checkbox.disabled_property) {
				checkbox.attr("disabled");
			}

			li.append_child(checkbox);
		}

		context.paragraph_as_text = true;

		render_blocks(markdown, entry.children, li, context);

		context.paragraph_as_text = false;

		entry.sub_lists.map(sublist => render_list(markdown, sublist, context, level + 1))
			.forEach(sublist => li.append_child(sublist));

		html_list.append_child(li);
	});

	return html_list;
}

function render_table_row(markdown: md.Document, row: md.TableRow, head: boolean, context: RenderContext): html.Element {
	const tr = html.create_element("tr");
	const data_type = head ? "th" : "td";

	row.children.forEach((entry, index) => {
		const td = html.create_element(data_type);
		row.table.get_alignment(index).style_table_data(td);

		render_inline(markdown, entry.children, context, false).forEach(el => td.append_child(el));

		tr.append_child(td);
	});

	return tr;
}

/**
 * Renders the Markdown document as HTML.
 *
 * @param markdown the Markdown document
 * @param options
 * @return the rendered document as an HTML element
 */
export function render_to_html(markdown: md.Document, options: Partial<RenderOptions> = {}): html.Element {
	const context = merge_default_options(options);
	context.should_escape = true;

	if (typeof options.inline_html === "boolean") {
		const enable = options.inline_html;
		context.inline_html = {
			enable: enable,
			disallowed_tags: (DEFAULT_OPTIONS.inline_html as InlineHtmlRenderOptions).disallowed_tags
		};
	}

	if (!context.latex.render) {
		if (context.latex.katex) {
			const katex = context.latex.katex;
			context.latex.render = node => katex.renderToString(
				node.raw, {displayMode: node instanceof md.LatexDisplay, output: "html"}
			);
		}
	}

	let parent;
	if (context.parent && context.parent instanceof html.Element) {
		parent = context.parent;
	} else {
		parent = html.create_element("div");
	}

	render_blocks(markdown, markdown.blocks, parent, context);

	if (context.footnote.render && markdown.footnotes.length !== 0) {
		context.footnote.render(markdown.footnotes, (nodes, parent) => {
			render_inline(markdown, nodes, context, false).forEach(n => parent.append_child(n));
		}).map(child => parent.append_child(child));
	}

	parent.purge_blank_children();

	return parent;
}

/**
 * Renders the Markdown document into an HTML DOM node.
 *
 * @param markdown the Markdown document
 * @param html_doc the DOM document
 * @param options
 */
export function render_to_dom(markdown: md.Document, html_doc: Document, options: Partial<DomRenderOptions> = {}): HTMLElement {
	let doc_div;

	if (options.parent) {
		doc_div = options.parent;
	} else {
		doc_div = html_doc.createElement("div");
	}

	const element = render_to_html(markdown, {
		...options,
		parent: null
	});
	doc_div.innerHTML = element.inner_html();

	return doc_div;
}
