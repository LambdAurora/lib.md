/*
* Copyright 2024 LambdAurora <email@lambdaurora.dev>
*
* This file is part of lib.md.
*
* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at https://mozilla.org/MPL/2.0/.
*/
// deno-lint-ignore-file no-explicit-any

import * as html from "@lambdaurora/libhtml";
import * as md from "./tree/index.ts";
import type { HtmlRenderable } from "./tree/base.ts";
import { HTML_TAGS_TO_PURGE_SUGGESTION } from "./utils.ts";

const DEFAULT_STRIKETHROUGH_CLASS_NAME = "strikethrough";
const DEFAULT_UNDERLINE_CLASS_NAME = "underline";

/**
 * Represents options that allows to set a custom class name.
 *
 * @version 2.2.0
 * @since 2.0.0
 */
export interface ClassNameOptions {
	/**
	 * The custom class name.
	 */
	class_name?: string | readonly string[];
}

/**
 * Represents the options related to code blocks rendering.
 */
export interface BlockCodeRenderOptions extends ClassNameOptions {
	/**
	 * The highlighter function which highlights the given code and outputs to the parent HTML element.
	 *
	 * @param code the code of the code block
	 * @param language the language of the code
	 * @param parent the parent HTML element
	 */
	highlighter: ((code: string, language: string, parent: html.Element) => void) | null;
}

/**
 * Represents the options related to checkbox rendering.
 */
export interface CheckBoxRenderOptions {
	/**
	 * `true` if checkboxes are enabled, or `false` otherwise
	 */
	enable: boolean;
	/**
	 * `true` if all rendered checkboxes should be disabled, or `false` otherwise
	 */
	disabled_property: boolean;
}

/**
 * Represents the options related to inline code rendering.
 */
export interface CodeRenderOptions {
	/**
	 * Processes the given inline code.
	 *
	 * @param node the Markdown node
	 * @returns the resulting HTML node
	 */
	process: (node: md.InlineCode) => html.Node;
}

/**
 * Represents the options related to footnote rendering.
 */
export interface FootnoteRenderOptions {
	/**
	 * The class to use on the footnotes section HTML element.
	 */
	footnotes_class: string;
	/**
	 * The class to use on the source link.
	 */
	footnote_src_link_class: string;
	/**
	 * Renders the footnotes section to HTML nodes.
	 *
	 * @param footnotes the footnote entries
	 * @param nodes_render the Markdown node renderer function
	 * @returns the resulting HTML nodes
	 */
	render: ((footnotes: readonly md.FootnoteEntry[], nodes_render: (nodes: md.Node[], parent: html.Element) => void) => html.Node[]) | null;
}

/**
 * Represents the options related to heading rendering.
 *
 * @version 2.2.0
 * @since 2.2.0
 */
export interface HeadingRenderOptions extends ClassNameOptions {
	/**
	 * Applies post processing if needed.
	 *
	 * @param node the Markdown heading node
	 * @param element the rendered heading HTML element
	 */
	post_process: (node: md.Heading, element: html.Element) => void;
}

/**
 * Represents the options related to highlight elements rendering.
 *
 * @version 2.2.0
 * @since 2.0.0
 */
export interface HighlightRenderOptions extends ClassNameOptions {
	/**
	 * `true` if highlight elements are enabled, `false` otherwise
	 */
	enable: boolean;
}

/**
 * Represents the options related to inline HTML rendering.
 */
export interface InlineHtmlRenderOptions {
	/**
	 * `true` if inline HTML rendering is enabled, `false` otherwise
	 */
	enable: boolean;
	/**
	 * List of allowed attributes per HTML tags, with the special key `*` applying to all HTML tags.
	 */
	allowed_attributes: { [key: string]: readonly string[] } | true;
	/**
	 * List of HTML tags that are not allowed and will be escaped out.
	 */
	disallowed_tags: readonly string[];
}

/**
 * Represents the options related to LaTeX expressions rendering.
 */
export interface LatexRenderOptions {
	/**
	 * Katex instance to provide to use it for LaTeX expression rendering.
	 */
	katex?: {
		renderToString: (expression: string, options: Partial<{ displayMode: boolean, output: string }>) => string;
	};
	/**
	 * Renders the given LaTeX expression node to HTML if possible.
	 *
	 * @param node the LaTeX expression node to render
	 * @returns the HTML element or a string if rendering is not possible
	 */
	render: ((node: md.InlineLatex | md.LatexDisplay) => (html.Element | string)) | null;
	/**
	 * The classes to use if LaTeX rendering failed.
	 */
	error_classes: readonly string[];
}

/**
 * Represents the options related to link rendering.
 *
 * @version 2.2.0
 * @since 2.2.0
 */
export interface LinkRenderOptions extends ClassNameOptions {
	/**
	 * The custom class name for standard links.
	 */
	standard_class_name?: string | readonly string[];
	/**
	 * The custom class name for inline links.
	 */
	inline_class_name?: string | readonly string[];
}

/**
 * Represents the options related to spoiler rendering options.
 */
export interface SpoilerRenderOptions {
	/**
	 * `true` if spoiler node rendering is enabled, or `false` otherwise
	 */
	enable: boolean;
	/**
	 * The class name to use for spoilering.
	 */
	class_name: string;
	/**
	 * The class name to use on image spoilers.
	 */
	image_class_name: string;
	/**
	 * The class name to use to mark the spoilers as hidden.
	 */
	hidden_class_name: string;
}

/**
 * Represents the options related to table rendering.
 *
 * @version 2.2.0
 * @since 2.0.0
 */
export interface TableRenderOptions extends ClassNameOptions {
	process: (element: html.Element) => void;
}

/**
 * Represents the options related to underlined elements rendering.
 */
export interface UnderlineRenderOptions extends ClassNameOptions {
	enable: boolean;
}

interface BaseRenderOptions {
	/**
	 * Options related to code blocks.
	 */
	block_code: Partial<BlockCodeRenderOptions>;
	/**
	 * Options related to checkboxes.
	 */
	checkbox: Partial<CheckBoxRenderOptions>;
	/**
	 * Options related to inline code.
	 */
	code: Partial<CodeRenderOptions>;
	/**
	 * The emoji mapper.
	 *
	 * @param node the emoji node
	 * @returns the resulting HTML node
	 */
	emoji: ((node: md.Emoji) => html.Node) | null;
	/**
	 * Options related to footnotes.
	 */
	footnote: Partial<FootnoteRenderOptions>;
	/**
	 * Options related to headings.
	 *
	 * @since 2.2.0
	 */
	heading: Partial<HeadingRenderOptions>;
	/**
	 * Options related to highlight elements.
	 */
	highlight: Partial<HighlightRenderOptions>;
	/**
	 * Options related to images.
	 */
	image: ClassNameOptions;
	/**
	 * Options related to inline HTML rendering.
	 *
	 * Can be a boolean for which `true` means the inline HTML rendering is enabled, or `false` otherwise.
	 */
	inline_html: Partial<InlineHtmlRenderOptions> | boolean;
	/**
	 * Options related to LaTeX expressions rendering.
	 */
	latex: Partial<LatexRenderOptions>;
	/**
	 * Options related to links rendering.
	 *
	 * @since 2.2.0
	 */
	link: Partial<LinkRenderOptions>;
	/**
	 * Options related to spoiler elements rendering.
	 */
	spoiler: Partial<SpoilerRenderOptions>;
	/**
	 * Options related to table rendering.
	 */
	table: Partial<TableRenderOptions>;
	/**
	 * Options related to struckthrough elements rendering.
	 */
	strikethrough?: ClassNameOptions;
	/**
	 * Options related to underlined elements rendering.
	 */
	underline?: Partial<UnderlineRenderOptions>;
}

/**
 * Represents the standard rendering options.
 */
export interface RenderOptions extends BaseRenderOptions {
	/**
	 * The parent element to which to render to, may be `null`.
	 */
	parent?: html.Element | null;
}

/**
 * Represents the DOM-specific rendering options.
 */
export interface DomRenderOptions extends BaseRenderOptions {
	/**
	 * The parent element to which to render to, may be `null`.
	 */
	parent?: HTMLElement | null;
}

export interface RenderContext extends RenderOptions {
	block_code: BlockCodeRenderOptions;
	checkbox: CheckBoxRenderOptions;
	code: CodeRenderOptions;
	footnote: FootnoteRenderOptions;
	heading: HeadingRenderOptions;
	highlight: HighlightRenderOptions;
	inline_html: InlineHtmlRenderOptions;
	latex: LatexRenderOptions;
	link: LinkRenderOptions;
	spoiler: SpoilerRenderOptions;
	table: TableRenderOptions;
	underline: UnderlineRenderOptions;
	parent: html.Element;
	paragraph_as_text: boolean;
	should_escape: boolean;
}

const ATTRIBUTES_RULES = {
	"*": ["align", "aria-hidden", "class", "id", "lang", "style", "title"],
	img: ["width", "height", "src", "alt"],
	a: ["href"],
	audio: ["controls", "loop", "preload", "src"],
	iframe: ["allow", "allowfullscreen", "frameborder", "src", "width", "height"],
	source: ["src", "type"]
};

const DEFAULT_OPTIONS: RenderOptions = {
	block_code: {
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
			const entries = footnotes.map((footnote) => {
				const el = html.create_element("li")
					.with_attr("id", footnote.anchor);

				nodes_render(footnote.nodes, el);

				el.append_child(" ");
				el.append_child(html.a({
					attributes: {
						class: this.footnote_src_link_class,
						href: `#${footnote.anchor}:src`
					},
					children: ["↩"]
				}));

				return el;
			});

			return [
				html.hr(),
				html.ol({
					attributes: {
						class: this.footnotes_class
					},
					children: entries
				}),
			];
		}
	},
	heading: {
		post_process: () => {}
	},
	highlight: {
		enable: true
	},
	inline_html: {
		enable: true,
		allowed_attributes: ATTRIBUTES_RULES,
		disallowed_tags: HTML_TAGS_TO_PURGE_SUGGESTION
	},
	image: {
		class_name: ""
	},
	latex: {
		render: null,
		error_classes: ["error"]
	},
	link: {},
	table: {
		process: _ => {}
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

function sanitize_raw<N extends html.Node>(node: N, context: RenderContext): N {
	if (context.inline_html.allowed_attributes === true) return node;

	const allowed_attributes = context.inline_html.allowed_attributes;

	if (node instanceof html.Element) {
		node.attributes = node.attributes.filter(attribute =>
			allowed_attributes["*"].includes(attribute.name)
			|| allowed_attributes[node.tag.name]?.includes(attribute.name)
		);
	}
	return node;
}

function merge_default_options(options: Partial<RenderOptions>): RenderContext {
	return html.merge_objects(DEFAULT_OPTIONS, options) as RenderContext;
}

function get_classes(classes: string | readonly string[] | undefined): string | string[] | undefined {
	if (typeof classes === "string") {
		return classes;
	} else if (classes === undefined) {
		return undefined;
	} else {
		return [...classes];
	}
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

function render_latex(node: md.InlineLatex | md.LatexDisplay, context: RenderContext): html.Node {
	if (!context.latex.render) {
		return new html.Text(node.toString());
	}

	let latex;
	try {
		latex = context.latex.render(node);
	} catch (error: any) {
		return html.create_element((node instanceof md.LatexDisplay) ? "div" : "span")
			.with_attr("class", [...context.latex.error_classes])
			.with_child(error.message);
	}

	if (!context.should_escape && typeof latex === "string") {
		return new html.Text(latex);
	}

	if (latex instanceof html.Element)
		return latex;

	const template = html.div();
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
				return html.br();
			}

			if (!context.should_escape)
				return node.content;

			if (context.inline_html.enable) {
				return html.sanitize_elements(
					html.parse_nodes(node.content),
					context.inline_html.disallowed_tags,
					to_sanitize => sanitize_raw(to_sanitize, context)
				);
			} else {
				return new html.Text(node.content);
			}
		} else if (node instanceof md.InlineCode) {
			return context.code.process(node);
		} else if (node instanceof md.InlineLink) {
			const rendered = node.as_html();

			let classes = "";
			if (context.link.class_name) {
				if (typeof context.link.class_name === "string") {
					classes += context.link.class_name;
				} else {
					classes += context.link.class_name.join(" ");
				}
			}
			if (context.link.inline_class_name) {
				if (typeof context.link.inline_class_name === "string") {
					classes += " " + context.link.inline_class_name;
				} else {
					classes += " " + context.link.inline_class_name.join(" ");
				}
			}
			if (classes) {
				rendered.attr("class", classes);
			}

			return rendered;
		} else if (node instanceof md.Image) {
			const element = html.img();
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

			element.attr("class", get_classes(context.image.class_name));

			return element;
		} else if (node instanceof md.Link) {
			const element = html.a();

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

			let classes = "";
			if (context.link.class_name) {
				if (typeof context.link.class_name === "string") {
					classes += context.link.class_name;
				} else {
					classes += context.link.class_name.join(" ");
				}
			}
			if (context.link.standard_class_name) {
				if (typeof context.link.standard_class_name === "string") {
					classes += " " + context.link.standard_class_name;
				} else {
					classes += " " + context.link.standard_class_name.join(" ");
				}
			}
			if (classes) {
				element.attr("class", classes);
			}

			return element;
		} else if (node instanceof md.Bold || (!context.underline?.enable && node instanceof md.Underline)) {
			return render_simple(markdown, node, context, "b", allow_linebreak);
		} else if (node instanceof md.Italic) {
			return render_simple(markdown, node, context, "em", allow_linebreak);
		} else if (node instanceof md.Strikethrough) {
			const element = render_simple(markdown, node, context, "span", allow_linebreak);
			element.attr("class", get_classes(context.strikethrough?.class_name ?? DEFAULT_STRIKETHROUGH_CLASS_NAME));
			return element;
		} else if (node instanceof md.Underline && context.underline?.enable) {
			const element = render_simple(markdown, node, context, "span", allow_linebreak);
			element.attr("class", get_classes(context.underline.class_name ?? DEFAULT_UNDERLINE_CLASS_NAME));
			return element;
		} else if (node instanceof md.Highlight) {
			if (!context.highlight.enable) {
				const content = render_inline(markdown, node.children, context, false);
				const container = html.span();
				if (content.length !== 0 && content[0] instanceof html.Text) {
					content[0].content = "==" + content[0].content;
				} else {
					container.append_child("==");
				}
				content.forEach(node => container.append_child(node));
				container.append_child("==");
				return container;
			}

			const element = render_simple(markdown, node, context, "mark", allow_linebreak);

			if (context.highlight.class_name) {
				element.attr("class", get_classes(context.highlight.class_name));
			}

			return element;
		} else if (node instanceof md.Spoiler) {
			const content = render_inline(markdown, node.children, context, false);

			if (!context.spoiler.enable) {
				const container = html.span();
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

				return html.div({
					attributes: {
						class: context.spoiler.class_name
					},
					children: [
						html.div({
							attributes: {
								class: `${context.spoiler.image_class_name} ${context.spoiler.hidden_class_name}`
							},
							children: [image]
						})
					]
				});
			}

			return html.span({
				attributes: {
					class: `${context.spoiler.class_name} ${context.spoiler.hidden_class_name}`
				},
				children: [
					html.span(content)
				]
			});
		} else if (node instanceof md.InlineLatex) {
			return render_latex(node, context);
		} else if (context.footnote && node instanceof md.FootNoteReference) {
			return node.as_html(markdown);
		} else if ("as_html" in node) {
			return (node as HtmlRenderable).as_html(markdown);
		}
	}).filter(node => node !== null && node !== undefined) as html.Node[];
}

function render_blocks(markdown: md.Document, blocks: readonly md.Node[], parent: html.Element, context: RenderContext): void {
	blocks.forEach(block => {
		if (block instanceof md.Heading) {
			const heading = html.create_element(`h${block.level}`)
				.with_attr("id", block.get_id());

			render_inline(markdown, block.children, context, false).forEach(node => heading.append_child(node));

			if (context.heading.class_name) {
				heading.attr("class", get_classes(context.heading.class_name));
			}

			context.heading.post_process(block, heading);

			parent.append_child(heading);
		} else if (block instanceof md.Paragraph) {
			if (context.paragraph_as_text) {
				render_inline(markdown, block.children, context, true).forEach(node => parent.append_child(node));
			} else {
				parent.append_child(html.p(render_inline(markdown, block.children, context, true)));
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

			const pre = html.pre({
				attributes: {
					class: language_class
				},
				children: [code.with_attr("class", language_class)]
			});

			if (context.block_code.class_name) {
				parent.append_child(html.create_element("div")
					.with_attr("class", get_classes(context.block_code.class_name))
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
		} else if (block instanceof md.InlineHtml) {
			if (context.inline_html.enable) {
				html.parse_nodes(
					render_inline(
						markdown,
						block.children, 
						html.merge_objects(context, {should_escape: false}),
						true
					).map(node => {
						if (typeof node === "string") {
							return node;
						} else {
							return node.html();
						}
					}).join("")
				).forEach(node => {
					parent.append_child(sanitize_raw(node, context));
				});
			} else {
				parent.append_child(html.p(render_inline(markdown, [new md.Text(block.toString())], context, true)));
			}
		} else if (block instanceof md.LatexDisplay) {
			const element = render_latex(block, context);
			if (element instanceof html.Text && !(element instanceof html.Comment) && !context.paragraph_as_text) {
				parent.append_child(html.p([element]));
				return;
			}
			parent.append_child(element);
		} else if (block instanceof md.List) {
			parent.append_child(render_list(markdown, block, context));
		} else if (block instanceof md.Table) {
			const table = html.table({
				attributes: {
					// See https://developer.mozilla.org/en-US/docs/Web/CSS/display#tables
					// We have to re-add the role=table to avoid destroying accessibility if a display: block is used,
					// which is most often needed as display: table does not respect max-width rules.
					role: "table",
					class: get_classes(context.table.class_name)
				}
			});

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
		} else if ("as_html" in block) {
			parent.append_child((block as HtmlRenderable).as_html(markdown));
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
			const checkbox = html.input({
				attributes: {
					type: "checkbox",
					checked: entry.checked ? "" : undefined,
					disabled: context.checkbox.disabled_property ? "" : undefined,
				},
				style: {
					"list-style-type": "none",
					margin: "0 0.5em 0 -1.3em",
				}
			});

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
 * @param options the rendering options
 * @return the rendered document as an HTML element
 */
export function render_to_html(markdown: md.Document, options: Partial<RenderOptions> = {}): html.Element {
	const context = merge_default_options(options);
	context.should_escape = true;

	if (typeof options.inline_html === "boolean") {
		const enable = options.inline_html;
		context.inline_html = {
			enable: enable,
			allowed_attributes: ATTRIBUTES_RULES,
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
 * Renders the Markdown document into an HTML DOM element.
 *
 * @param markdown the Markdown document
 * @param html_doc the DOM document
 * @param options the rendering options
 * @returns the HTML DOM element to which the document has been rendered to
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
