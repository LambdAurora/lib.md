/*
 * Copyright © 2020 LambdAurora <aurora42lambda@gmail.com>
 *
 * This file is part of lib.md.
 *
 * Licensed under the MIT license. For more information,
 * see the LICENSE file.
 */

import * as md from "./markdown.mjs";

const DEFAULT_OPTIONS = {
    block_code: "block_code",
    image: {
        class_name: ""
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
    }
}

function merge_objects(source, target) {
    Object.keys(source).forEach(key => {
        if (!target[key]) {
            target[key] = source[key];
        } else if (typeof target[key] === "object")  {
            target[key] = merge_objects(source[key], target[key]);
        }
    });
    return target;
}

function merge_default_options(options) {
    return merge_objects(DEFAULT_OPTIONS, options);
}

function render_simple(markdown, node, html_doc, options, el_name, allow_linebreak = false) {
    let element = html_doc.createElement(el_name);

    render_inline(markdown, node.nodes, html_doc, options, allow_linebreak).forEach(node => element.appendChild(node));

    return element;
}

function render_inline(markdown, nodes, html_doc, options, allow_linebreak = false) {
    return nodes.map(node => {
        if (node instanceof md.InlineCode) {
            let element = html_doc.createElement("code");
            element.appendChild(html_doc.createTextNode(node.content));
            return element;
        } else if (node instanceof md.Text) {
            if (node.is_linebreak()) {
                if (!allow_linebreak)
                    return null;
                return html_doc.createElement("br");
            }
            return html_doc.createTextNode(node.content);
        } else if (node instanceof md.Image) {
            let element = html_doc.createElement("img");

            element.alt = node.get_nodes_as_string();

            let ref = node.ref;
            if (node.ref_name) {
                ref = markdown.references.find(ref => ref.name === node.ref_name);
                if (ref)
                    ref = ref.ref;
            } 
            if (ref) {
                element.src = ref.url;
                if (ref.has_tooltip())
                    element.title = ref.tooltip;
            }

            element.className = options.image.class_name;

            return element;
        } else if (node instanceof md.Link) {
            let element = html_doc.createElement("a");

            render_inline(markdown, node.nodes, html_doc, options, false).forEach(node => element.appendChild(node));

            let ref = node.ref;
            if (node.ref_name) {
                ref = markdown.references.find(ref => ref.name === node.ref_name);
                if (ref)
                    ref = ref.ref;
            } 
            if (ref) {
                element.href = ref.url;
                if (ref.has_tooltip())
                    element.title = ref.tooltip;
            }

            return element;
        } else if (node instanceof md.Bold) {
            return render_simple(markdown, node, html_doc, options, "strong", allow_linebreak);
        } else if (node instanceof md.Italic) {
            return render_simple(markdown, node, html_doc, options, "em", allow_linebreak);
        } else if (node instanceof md.Strikethrough) {
            let element = render_simple(markdown, node, html_doc, options, "span", allow_linebreak);
            element.className = options.strikethrough.class_name;
            return element;
        } else if (node instanceof md.Underline) {
            if (!options.underline.enable) {
                return render_simple(markdown, node, html_doc, options, "strong", allow_linebreak);
            }

            let element = render_simple(markdown, node, html_doc, options, "span", allow_linebreak);
            element.className = options.underline.class_name;
            return element;
        } else if (node instanceof md.Spoiler) {
            if (!options.spoiler.enable) {
                return html_doc.createTextNode(node.toString());
            }
            let content = render_inline(markdown, node.nodes, html_doc, options, false);

            if (node.nodes.length === 1 && node.nodes[0] instanceof md.Image) {
                let container = html_doc.createElement("div");
                container.className = options.spoiler.class_name;
                let div = html_doc.createElement("div");
                let image = content[0];
                image.classList.add(options.spoiler.image_class_name);
                div.className = `${options.spoiler.image_class_name} ${options.spoiler.hidden_class_name}`;
                div.appendChild(image);
                container.appendChild(div);
                return container;
            }

            let element = html_doc.createElement("span");
            let content_element = html_doc.createElement("span");
            content.forEach(node => content_element.appendChild(node));
            element.appendChild(content_element);

            element.className = `${options.spoiler.class_name} ${options.spoiler.hidden_class_name}`;

            return element;
        }
    }).filter(node => node !== null && node !== undefined);
}

/**
 * Renders the markdown document into an HTML node.
 * @param {MDDocument} markdown The markdown document.
 * @param {Document} html_doc The DOM document.
 * @param options
 */
export default function render(markdown, html_doc, options = {}) {
    options = merge_default_options(options);

    let doc_div = html_doc.createElement("div");

    markdown.blocks.forEach(block => {
        if (block instanceof md.Heading) {
            let heading;
            switch (block.level) {
                case md.HeadingLevel.H1:
                    heading = html_doc.createElement("h1");
                    break;
                case md.HeadingLevel.H2:
                    heading = html_doc.createElement("h2");
                    break;
                case md.HeadingLevel.H3:
                    heading = html_doc.createElement("h3");
                    break;
                case md.HeadingLevel.H4:
                    heading = html_doc.createElement("h4");
                    break;
                case md.HeadingLevel.H5:
                    heading = html_doc.createElement("h5");
                    break;
                default:
                    heading = html_doc.createElement("h6");
                    break;
            }

            render_inline(markdown, block.nodes, html_doc, options, false).forEach(node => heading.appendChild(node));

            doc_div.appendChild(heading);
        } else if (block instanceof md.Paragraph) {
            let paragraph = html_doc.createElement("p");

            render_inline(markdown, block.nodes, html_doc, options, true).forEach(node => paragraph.appendChild(node));

            doc_div.appendChild(paragraph);
        } else if (block instanceof md.BlockCode) {
            let div = html_doc.createElement("div");

            div.className = options.block_code;

            let pre = html_doc.createElement("pre");
            let element = html_doc.createElement("code");

            element.appendChild(html_doc.createTextNode(block.code));

            element.className = `language-${block.language}`;

            pre.appendChild(element);
            div.appendChild(pre);
            doc_div.appendChild(div);
        } else if (block instanceof md.BlockQuote) {
            let quote = html_doc.createElement("blockquote");

            render_inline(markdown, block.nodes, html_doc, options, true).forEach(node => quote.appendChild(node));

            doc_div.appendChild(quote);
        }
    });

    return doc_div;
}
