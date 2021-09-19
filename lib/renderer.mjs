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
    block_code: {
        class_name: "block_code",
        highlighter: null
    },
    checkbox: {
        enable: true,
        disabled_property: true
    },
    emoji: null,
    highlight: {
        enable: true
    },
    inline_html: true,
    image: {
        class_name: ""
    },
    latex: {
        render: null,
        error_classes: ["error"]
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

    let tmp = options.should_escape;
    options.should_escape = true;
    render_inline(markdown, node.nodes, options, allow_linebreak).forEach(node => element.append_child(node));
    options.should_escape = tmp;

    return element;
}

function render_latex(node, options) {
    if (!options.latex.render) {
        return new html.Text(node.toString());
    }

    let latex;
    try {
        latex = options.latex.render(node);
    } catch (error) {
        return html.create_element(node.display_mode ? "div" : "span")
            .with_attr("class", options.latex.error_classes)
            .with_child(error.message);
    }

    if (!options.should_escape && typeof latex === "string") {
        return latex;
    }

    if (latex instanceof html.Element)
        return latex;

    let template = html.create_element("div");
    html.parse(latex, template);
    if (template.children.length === 1)
        return template.children[0];
    else
        return template;
}

function render_inline(markdown, nodes, options, allow_linebreak = false) {
    return nodes.map(node => {
        if (node instanceof md.Emoji) {
            if (!options.emoji)
                return node.toString();
            return options.emoji(node);
        } else if (node instanceof md.Text && !(node instanceof md.InlineCode || node instanceof md.InlineLink)) {
            if (node.is_linebreak()) {
                if (!allow_linebreak)
                    return null;
                return html.create_element("br");
            }
            if (!options.should_escape)
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
                let image = content[0];
                image.attr("class").add(options.spoiler.image_class_name);

                return html.create_element("div")
                    .with_attr("class", options.spoiler.class_name)
                    .with_child(html.create_element("div")
                        .with_attr("class", `${options.spoiler.image_class_name} ${options.spoiler.hidden_class_name}`)
                        .with_child(image)
                    );
            }

            let content_element = html.create_element("span");
            content.forEach(node => content_element.append_child(node));

            return html.create_element("span")
                .with_attr("class", `${options.spoiler.class_name} ${options.spoiler.hidden_class_name}`)
                .with_child(content_element);
        } else if (node instanceof md.InlineLatex) {
            let element = render_latex(node, options);
            if (!options.should_escape) {
                if (element.nodeName === "#text") {
                    return element.textContent;
                }
            }
            return element;
        } else if (node.as_html) {
            return node.as_html();
        }
    }).filter(node => node !== null && node !== undefined);
}

function render_blocks(markdown, blocks, parent, options) {
    blocks.forEach(block => {
        if (block instanceof md.Heading) {
            let heading = html.create_element(block.level)
                .with_attr("id", block.get_id());

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
            let code = html.create_element("code");

            let language_class;
            if (block.language && block.language !== "") {
                language_class = `language-${block.language}`;

                if (options.block_code.highlighter) {
                    let parent = html.create_element("div");
                    options.block_code.highlighter(block.code, block.language, parent);
                    code.children = parent.children;
                } else {
                    code.append_child(new html.Text(block.code));
                }
            } else {
                code.append_child(new html.Text(block.code));
            }

            parent.append_child(html.create_element("div")
                .with_attr("class", options.block_code.class_name)
                .with_child(html.create_element("pre")
                    .with_child(code.with_attr("class", language_class))
                ));
        } else if (block instanceof md.BlockQuote) {
            let quote = html.create_element("blockquote");

            for (const child of block.nodes) {
                if (child.is_block()) {
                    render_blocks(markdown, [child], quote, options);
                } else {
                    render_inline(markdown, [child], options, true).forEach(node => quote.append_child(node));
                }
            }

            parent.append_child(quote);
        } else if (block instanceof md.InlineHTML) {
            if (options.inline_html) {
                html.parse_nodes(render_inline(markdown, block.nodes, merge_objects(options, { should_escape: false }), true).map(node => {
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
        } else if (block.as_html) {
            parent.append_child(block.as_html());
        }
    });
}

function render_list(markdown, list, options, level = 0) {
    if (level > 3)
        level = 3;

    let html_list = html.create_element(list.ordered ? "ol" : "ul");

    if (list.ordered && list.ordered_start !== 1) {
        html_list.attr("start", list.ordered_start);
    }

    list.nodes.forEach(entry => {
        let li = html.create_element("li");

        if (options.checkbox.enable && typeof entry.checked === "boolean") {
            li.style("list-style-type", "none");
            let checkbox = html.create_element("input")
                .with_attr("type", "checkbox")
                .with_attr("style", { "list-style-type": "none", margin: "0 0.2em 0 -1.3em" });

            if (entry.checked)
                checkbox.attr("checked");

            if (options.checkbox.disabled_property) {
                checkbox.attr("disabled");
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
    options.should_escape = true;

    if (!options.latex.render) {
        if (options.latex.katex) {
            options.latex.render = node => options.latex.katex.renderToString(node.raw, { displayMode: node.display_mode, output: "html" });
        }
    }

    let parent;
    if (options.parent && options.parent instanceof html.Element) {
        parent = options.parent;
    } else {
        parent = html.create_element("div");
    }

    render_blocks(markdown, markdown.blocks, parent, options);

    return parent;
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
