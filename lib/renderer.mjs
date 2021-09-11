/*
 * Copyright © 2021 LambdAurora <aurora42lambda@gmail.com>
 *
 * This file is part of lib.md.
 *
 * Licensed under the MIT license. For more information,
 * see the LICENSE file.
 */

import * as md from "./markdown.mjs";
import * as html from "./html.mjs";
import { merge_objects } from "./utils.mjs";

const DEFAULT_OPTIONS = {
    block_code: "block_code",
    checkbox: {
        enable: true,
        disabled_property: true
    },
    highlight: {
        enable: true
    },
    inline_html: true,
    image: {
        class_name: ""
    },
    latex: {
        katex: null,
        katex_options: {}
    },
    strikethrough: {
        class_name: "strikethrough"
    },
    underline: {
        enable: true,
        class_name: "underline"
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
    "*": [ "align", "aria-hidden", "style", "class", "id" ],
    img: [ "width", "height", "src", "title", "alt" ],
    a: [ "href", "title" ]
}

function sanitize_raw(node) {
    node.attributes = node.attributes.filter(attribute => ATTRIBUTES_RULES["*"].includes(attribute.name)
        || (ATTRIBUTES_RULES[node.tag.name] && ATTRIBUTES_RULES[tag].includes(attribute.name)));
    return node;
}

function merge_default_options(options) {
    return merge_objects(DEFAULT_OPTIONS, options);
}

function fill_element(element, nodes) {
    nodes.forEach(node => {
        if (typeof node === "string") {
            element.innerHTML += node;
        } else {
            element.append_child(node);
        }
    });
}

function render_simple(markdown, node, options, el_name, allow_linebreak = false) {
    let element = html.create_element(el_name);

    let tmp = options.inline_html_block;
    options.inline_html_block = false;
    render_inline(markdown, node.nodes, options, allow_linebreak).forEach(node => element.append_child(node));
    options.inline_html_block = tmp;

    return element;
}

function render_latex(node, options) {
    if (!options.latex.katex) {
        return new html.Text(node.toString());
    }

    let latex = options.latex.katex.renderToString(node.raw, merge_objects(options.latex.katex_options, { displayMode: node.display_mode, output: "html" }));

    if (options.inline_html_block) {
        return latex;
    }

    let template = html.create_element("div");
    html.parse(latex, template);
    if (template.children.length === 1)
        return template.children[0];
    else
        return template;
}

function render_inline(markdown, nodes, options, allow_linebreak = false) {
    return nodes.map(node => {
        if (node instanceof md.InlineCode) {
            let element = html.create_element("code");
            element.append_child(new html.Text(node.content));
            return element;
        } else if (node instanceof md.Text) {
            if (node.is_linebreak()) {
                if (!allow_linebreak)
                    return null;
                return html.create_element("br");
            }
            if (options.inline_html_block)
                return node.content;
            return new html.Text(node.content);
        } else if (node instanceof md.Image) {
            let element = html.create_element("img");
            element.alt(node.get_nodes_as_string());

            let ref = node.ref;
            if (node.ref_name) {
                ref = markdown.references.find(ref => ref.name === node.ref_name);
                if (ref)
                    ref = ref.ref;
            } 
            if (ref) {
                element.src(ref.url);
                if (ref.has_tooltip()) {
                    element.title(ref.tooltip);
                }
            }

            element.attr("class", options.image.class_name);

            return element;
        } else if (node instanceof md.Link) {
            let element = html.create_element("a");

            let ref = node.ref;
            if (node.ref_name) {
                ref = markdown.references.find(ref => ref.name === node.ref_name);
                if (ref)
                    ref = ref.ref;
            } 
            if (ref) {
                element.href(ref.url);
                if (ref.has_tooltip()) {
                    element.title(ref.tooltip);
                }
            }

            fill_element(element, render_inline(markdown, node.nodes, options, false));

            return element;
        } else if (node instanceof md.Bold || (!options.underline.enable && node instanceof md.Underline)) {
            return render_simple(markdown, node, options, "b", allow_linebreak);
        } else if (node instanceof md.Italic) {
            return render_simple(markdown, node, options, "em", allow_linebreak);
        } else if (node instanceof md.Strikethrough) {
            let element = render_simple(markdown, node, options, "span", allow_linebreak);
            element.className = options.strikethrough.class_name;
            return element;
        } else if (node instanceof md.Underline && options.underline.enable) {
            let element = render_simple(markdown, node, options, "span", allow_linebreak);
            element.attr("class", options.underline.class_name);
            return element;
        } else if (node instanceof md.Highlight) {
            if (!options.highlight.enable) {
                // @TODO interpret markdown inside
                return new html.Text(node.toString());
            }

            return render_simple(markdown, node, options, "mark", allow_linebreak);
        } else if (node instanceof md.Spoiler) {
            let content = render_inline(markdown, node.nodes, options, false);

            if (!options.spoiler.enable) {
                let container = html.create_element("span");
                if (content.length !== 0 && content[0] instanceof html.Text) {
                    content[0].content = "||" + content[0].content;
                } else {
                    container.append_child("||");
                }
                content.forEach(node => container.append_child(node));
                container.append_child("||");
                return container;
            }

            if (node.nodes.length === 1 && node.nodes[0] instanceof md.Image) {
                let container = html.create_element("div");
                container.attr("class", options.spoiler.class_name);
                let div = html.create_element("div");
                let image = content[0];
                image.attr("class").add(options.spoiler.image_class_name);
                div.attr("class", `${options.spoiler.image_class_name} ${options.spoiler.hidden_class_name}`);
                div.append_child(image);
                container.append_child(div);
                return container;
            }

            let element = html.create_element("span");
            let content_element = html.create_element("span");
            content.forEach(node => content_element.append_child(node));
            element.append_child(content_element);

            element.attr("class", `${options.spoiler.class_name} ${options.spoiler.hidden_class_name}`);

            return element;
        } else if (node instanceof md.InlineLatex) {
            let element = render_latex(node, options);
            if (options.inline_html_block) {
                if (element.nodeName === "#text") {
                    return element.textContent;
                }
            }
            return element;
        }
    }).filter(node => node !== null && node !== undefined);
}

function render_blocks(markdown, blocks, parent, options) {
    blocks.forEach(block => {
        if (block instanceof md.Heading) {
            let heading = html.create_element(block.level);
            heading.attr("id", block.get_id());

            render_inline(markdown, block.nodes, options, false).forEach(node => heading.append_child(node));

            parent.append_child(heading);
        } else if (block instanceof md.Paragraph) {
            if (options.paragraph_as_text) {
                render_inline(markdown, block.nodes, options, true).forEach(node => parent.append_child(node));
            } else {
                let paragraph = html.create_element("p");

                render_inline(markdown, block.nodes, options, true).forEach(node => paragraph.append_child(node));

                parent.append_child(paragraph);
            }
        } else if (block instanceof md.BlockCode) {
            let div = html.create_element("div");
            div.attr("class", options.block_code);

            let pre = html.create_element("pre");
            let element = html.create_element("code");

            element.append_child(new html.Text(block.code));
            element.attr("class", `language-${block.language}`);

            pre.append_child(element);
            div.append_child(pre);
            parent.append_child(div);
        } else if (block instanceof md.BlockQuote) {
            let quote = html.create_element("blockquote");

            render_inline(markdown, block.nodes, options, true).forEach(node => quote.append_child(node));

            parent.append_child(quote);
        } else if (block instanceof md.Comment) {
            parent.append_child(block.as_html());
        } else if (block instanceof md.InlineHTML) {
            if (options.inline_html) {
                html.parse_nodes(render_inline(markdown, block.nodes, merge_objects(options, { inline_html_block: true }), true).map(node => {
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
                let paragraph = html.create_element("p");

                render_inline(markdown, [new md.Text(block.toString())], options, true).forEach(node => paragraph.append_child(node));

                parent.append_child(paragraph);
            }
        } else if (block instanceof md.InlineLatex) {
            let element = render_latex(block, options);
            if (element instanceof html.Text && !(element instanceof html.Comment) && !options.paragraph_as_text) {
                let paragraph = html.create_element("p");
                paragraph.append_child(element);
                parent.append_child(paragraph);
                return;
            }
            parent.append_child(element);
        } else if (block instanceof md.List) {
            parent.append_child(render_list(markdown, block, options));
        } else if (block instanceof md.TableOfContents) {
            parent.append_child(render_list(markdown, block.as_list(markdown), options));
        }
    });
}

function render_list(markdown, list, options, level = 0) {
    if (level > 3)
        level = 3;

    let html_list = html.create_element(list.ordered ? "ol" : "ul");

    list.nodes.forEach(entry => {
        let li = html.create_element("li");

        if (options.checkbox.enable && typeof entry.checked === "boolean") {
            li.style["list-style-type"] = "none";
            let checkbox = html.create_element("input");
            checkbox.attr("type", "checkbox");
            checkbox.attr("checked", entry.checked);
            checkbox.style("list-style-type", "none");
            checkbox.style("margin", "0 0.2em 0 -1.3em");

            if (options.checkbox.disabled_property) {
                checkbox.attr("disabled", "true");
            }

            li.append_child(checkbox);
        }

        options.paragraph_as_text = true;

        render_blocks(markdown, entry.nodes, li, options);

        options.paragraph_as_text = false;

        entry.sublists.map(sublist => render_list(markdown, sublist, options, level + 1))
            .forEach(sublist => li.append_child(sublist));

        html_list.append_child(li);
    });

    return html_list;
}

/**
 * Renders the markdown document as HTML.
 *
 * @param {md.MDDocument} markdown the markdown document
 * @param options
 * @return {html.Element} the rendered document as a HTML element
 */
 export function render_to_html(markdown, options = {}) {
    options = merge_default_options(options);
    options.inline_html_block = false;

    let element = html.create_element("div");
    render_blocks(markdown, markdown.blocks, element, options);

    return element;
 }

/**
 * Renders the markdown document into an HTML DOM node.
 *
 * @param {md.MDDocument} markdown the markdown document
 * @param {Document} html_doc the DOM document
 * @param options
 */
export function render(markdown, html_doc, options = {}) {
    let doc_div;
    if (options.parent) {
        doc_div = options.parent;
    } else {
        doc_div = html_doc.createElement("div");
    }

    let element = render_to_html(markdown, options);
    doc_div.innerHTML = element.inner_html();

    return doc_div;
}
