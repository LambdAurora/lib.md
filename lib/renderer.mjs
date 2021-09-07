/*
 * Copyright © 2021 LambdAurora <aurora42lambda@gmail.com>
 *
 * This file is part of lib.md.
 *
 * Licensed under the MIT license. For more information,
 * see the LICENSE file.
 */

import * as md from './markdown.mjs';
import * as html from './html.mjs';
import { merge_objects } from './utils.mjs';

const DEFAULT_OPTIONS = {
    block_code: 'block_code',
    checkbox: {
        enable: true,
        disabled_property: true
    },
    highlight: {
        enable: true,
        class_name: 'highlight'
    },
    inline_html: true,
    image: {
        class_name: ''
    },
    latex: {
        katex: null,
        katex_options: {}
    },
    strikethrough: {
        class_name: 'strikethrough'
    },
    underline: {
        enable: true,
        class_name: 'underline'
    },
    spoiler: {
        enable: false,
        class_name: 'spoiler',
        image_class_name: 'spoiler_img',
        hidden_class_name: 'spoiler_hidden'
    },
    parent: null
}

const ATTRIBUTES_RULES = {
    '*': [ 'style', 'class', 'id' ],
    img: [ 'width', 'height', 'src', 'title', 'alt' ],
    a: [ 'href', 'title' ]
}

function build_attributes(tag, attributes) {
    let serialized_attributes = [];

    for (const [ key, value ] of Object.entries(attributes)) {
        if (ATTRIBUTES_RULES['*'].includes(key)
            || (ATTRIBUTES_RULES[tag] && ATTRIBUTES_RULES[tag].includes(key))) {
            serialized_attributes.push(`${key}='${value}'`);
        }
    }

    if (serialized_attributes.length === 0) {
        return '';
    } else {
        return ' ' + serialized_attributes.join(' ');
    }
}

class HTMLBuilder {
    constructor(options = {
        parent: null
    }) {
        this.tags = [];
        this.document = [];
        this._element_count = 0;

        if (options.parent) {
            this.previous_indent = options.parent.tags.length;
        } else {
            this.previous_indent = 0;
        }
    }

    element_count() {
        return this._element_count;
    }

    indentation() {
        return '  '.repeat(this.previous_indent + this.tags.length);
    }

    push(tag, attributes = null) {
        let tag_opening = this.indentation() + '<' + tag;

        if (attributes) {
            tag_opening += build_attributes(tag, attributes);
        }

        tag_opening += '>';

        this.tags.push(tag);
        this.document.push(tag_opening);

        this._element_count++;

        return this;
    }

    push_close(tag, attributes = null) {
        let result = this.indentation() + '<' + tag;
        if (attributes) {
            result += build_attributes(tag, attributes);
        }
        result += ' />';
        this.document.push(result);

        this._element_count++;

        return this;
    }

    push_text(text) {
        this.document.push(this.indentation() + text.replaceAll(/</g, '&lt;'));
        return this;
    }

    push_raw(raw) {
        this.document.push(raw);
        return this;
    }

    pop() {
        if (this.tags.length > 0) {
            let tag = this.tags[this.tags.length - 1];
            this.tags.pop();
            this.document.push(`${this.indentation()}</${tag}>`);
        }

        return this;
    }

    toString() {
        return this.document.join('\n');
    }
}

function merge_default_options(options) {
    return merge_objects(DEFAULT_OPTIONS, options);
}

function fill_element(element, nodes) {
    nodes.forEach(node => {
        if (typeof node === 'string') {
            element.innerHTML += node;
        } else {
            element.appendChild(node);
        }
    });
}

function render_simple(markdown, node, builder, html_doc, options, el_name, allow_linebreak = false) {
    let element = html_doc.createElement(el_name);

    let tmp = options.inline_html_block;
    options.inline_html_block = false;
    render_inline(markdown, node.nodes, builder, html_doc, options, allow_linebreak).forEach(node => element.appendChild(node));
    options.inline_html_block = tmp;

    return element;
}

function render_latex(node, html_doc, options) {
    if (!options.latex.katex) {
        return html_doc.createTextNode(node.toString());
    }

    let latex = options.latex.katex.renderToString(node.raw, merge_objects(options.latex.katex_options, { displayMode: node.display_mode, output: 'html' }));

    if (options.inline_html_block) {
        return latex;
    }
    let template = html_doc.createElement('template');
    template.innerHTML = latex;
    return template.content.cloneNode(true);
}

function render_inline(markdown, nodes, builder, html_doc, options, allow_linebreak = false) {
    return nodes.map(node => {
        if (node instanceof md.InlineCode) {
            builder.push('code');
            builder.push_raw(node.content);
            builder.pop();
            let element = html_doc.createElement('code');
            element.appendChild(html_doc.createTextNode(node.content));
            return element;
        } else if (node instanceof md.Text) {
            if (node.is_linebreak()) {
                builder.push_close('br');
                if (!allow_linebreak)
                    return null;
                return html_doc.createElement('br');
            }
            builder.push_text(node.content);
            if (options.inline_html_block)
                return node.content;
            return options.text(node.content);
        } else if (node instanceof md.Image) {
            let attributes = {
                alt: node.get_nodes_as_string()
            };
            let element = html_doc.createElement('img');

            element.alt = node.get_nodes_as_string();

            let ref = node.ref;
            if (node.ref_name) {
                ref = markdown.references.find(ref => ref.name === node.ref_name);
                if (ref)
                    ref = ref.ref;
            } 
            if (ref) {
                attributes.src = ref.url;
                element.src = ref.url;
                if (ref.has_tooltip()) {
                    attributes.title = ref.tooltip;
                    element.title = ref.tooltip;
                }
            }

            element.className = options.image.class_name;
            builder.push_close('img', attributes);

            return element;
        } else if (node instanceof md.Link) {
            let attributes = {};

            let element = html_doc.createElement('a');

            let ref = node.ref;
            if (node.ref_name) {
                ref = markdown.references.find(ref => ref.name === node.ref_name);
                if (ref)
                    ref = ref.ref;
            } 
            if (ref) {
                attributes.href = ref.url;
                element.href = ref.url;
                if (ref.has_tooltip()) {
                    element.title = ref.tooltip;
                    attributes.title = ref.tooltip;
                }
            }

            builder.push('a', attributes);
            fill_element(element, render_inline(markdown, node.nodes, builder, html_doc, options, false));
            builder.pop();

            return element;
        } else if (node instanceof md.Bold || (!options.underline.enable && node instanceof md.Underline)) {
            builder.push('strong');
            let element = render_simple(markdown, node, builder, html_doc, options, 'strong', allow_linebreak);
            builder.pop();
            return element;
        } else if (node instanceof md.Italic) {
            builder.push('em');
            let element = render_simple(markdown, node, builder, html_doc, options, 'em', allow_linebreak);
            builder.pop();
            return element;
        } else if (node instanceof md.Strikethrough) {
            builder.push('span', {'class': options.strikethrough.class_name});
            let element = render_simple(markdown, node, builder, html_doc, options, 'span', allow_linebreak);
            element.className = options.strikethrough.class_name;
            builder.pop();
            return element;
        } else if (node instanceof md.Underline && options.underline.enable) {
            builder.push('span', {'class': options.underline.class_name});
            let element = render_simple(markdown, node, builder, html_doc, options, 'span', allow_linebreak);
            builder.pop();
            element.className = options.underline.class_name;
            return element;
        } else if (node instanceof md.Highlight) {
            if (!options.highlight.enable) {
                builder.push_text(node.toString()); // @TODO interpret markdown inside
                return options.text(node.toString());
            }
            builder.push('span', {'class': options.highlight.class_name});
            let element = render_simple(markdown, node, builder, html_doc, options, 'span', allow_linebreak);
            element.className = options.highlight.class_name;
            builder.pop();
            return element;
        } else if (node instanceof md.Spoiler) {
            if (!options.spoiler.enable) {
                builder.push_text(node.toString()); // @TODO interpret markdown inside
                return options.text(node.toString());
            }

            let spoiler_builder = new HTMLBuilder({parent: builder});
            let content = render_inline(markdown, node.nodes, spoiler_builder, html_doc, options, false);
            let content_raw = spoiler_builder.toString();

            if (spoiler_builder.element_count() === 1 && content_raw.match(/^\<img/)) {
                builder.push('div', {'class': `${options.spoiler.image_class_name} ${options.spoiler.hidden_class_name}`});
                builder.push_raw(content_raw);
                builder.pop();
            }
            if (node.nodes.length === 1 && node.nodes[0] instanceof md.Image) {
                let container = html_doc.createElement('div');
                container.className = options.spoiler.class_name;
                let div = html_doc.createElement('div');
                let image = content[0];
                image.classList.add(options.spoiler.image_class_name);
                div.className = `${options.spoiler.image_class_name} ${options.spoiler.hidden_class_name}`;
                div.appendChild(image);
                container.appendChild(div);
                return container;
            }

            let element = html_doc.createElement('span');
            let content_element = html_doc.createElement('span');
            content.forEach(node => content_element.appendChild(node));
            element.appendChild(content_element);

            element.className = `${options.spoiler.class_name} ${options.spoiler.hidden_class_name}`;

            return element;
        } else if (node instanceof md.InlineLatex) {
            let element = render_latex(node, html_doc, options);
            if (options.inline_html_block) {
                if (element.nodeName === '#text') {
                    return element.textContent;
                }
            }
            return element;
        }
    }).filter(node => node !== null && node !== undefined);
}

function render_blocks(markdown, blocks, builder, parent, html_doc, options) {
    blocks.forEach(block => {
        if (block instanceof md.Heading) {
            let heading = html_doc.createElement(block.level);

            heading.id = block.get_id();

            builder.push(block.level, {id: block.get_id()});

            render_inline(markdown, block.nodes, builder, html_doc, options, false).forEach(node => heading.appendChild(node));

            builder.pop();
            parent.appendChild(heading);
        } else if (block instanceof md.Paragraph) {
            if (options.paragraph_as_text) {
                render_inline(markdown, block.nodes, builder, html_doc, options, true).forEach(node => parent.appendChild(node));
            } else {
                let paragraph = html_doc.createElement('p');

                builder.push('p');
                render_inline(markdown, block.nodes, builder, html_doc, options, true).forEach(node => paragraph.appendChild(node));
                builder.pop();

                parent.appendChild(paragraph);
            }
        } else if (block instanceof md.BlockCode) {
            builder.push('div', {'class': options.block_code});
            builder.push('pre');
            builder.push('code', {'class': `language-${block.language}`});
            builder.push_raw(block.code);
            builder.pop();
            builder.pop();
            builder.pop();


            let div = html_doc.createElement('div');

            div.className = options.block_code;

            let pre = html_doc.createElement('pre');
            let element = html_doc.createElement('code');

            element.appendChild(html_doc.createTextNode(block.code));

            element.className = `language-${block.language}`;

            pre.appendChild(element);
            div.appendChild(pre);
            parent.appendChild(div);
        } else if (block instanceof md.BlockQuote) {
            let quote = html_doc.createElement('blockquote');

            builder.push('blockquote');
            render_inline(markdown, block.nodes, builder, html_doc, options, true).forEach(node => quote.appendChild(node));
            builder.pop();

            parent.appendChild(quote);
        } else if (block instanceof md.InlineHTML) {
            /*if (options.inline_html) {
                parent.innerHTML += render_inline(markdown, block.nodes, html_doc, merge_objects(options, { inline_html_block: true }), true).map(node => {
                    if (typeof node === 'string') {
                        return node;
                    } else {
                        return node.outerHTML;
                    }
                }).join('');
            } else*/ {
                let paragraph = html_doc.createElement('p');

                render_inline(markdown, [new md.Text(block.toString())], builder, html_doc, options, true).forEach(node => paragraph.appendChild(node));

                parent.appendChild(paragraph);
            }
        } else if (block instanceof md.InlineLatex) {
            let element = render_latex(block, html_doc, options);
            if (element.nodeName === '#text' && !options.paragraph_as_text) {
                let paragraph = html_doc.createElement('p');
                paragraph.appendChild(element);
                parent.appendChild(paragraph);
                return;
            }
            parent.appendChild(element);
        } else if (block instanceof md.List) {
            parent.appendChild(render_list(markdown, block, builder, html_doc, options));
        } else if (block instanceof md.TableOfContents) {
            parent.appendChild(render_list(markdown, block.as_list(markdown), builder, html_doc, options));
        }
    });
}

function render_list(markdown, list, builder, html_doc, options, level = 0) {
    if (level > 3)
        level = 3;

    let html_list = html_doc.createElement(list.ordered ? 'ol' : 'ul');

    list.nodes.forEach(entry => {
        let li = html_doc.createElement('li');

        if (options.checkbox.enable && typeof entry.checked === 'boolean') {
            li.style['list-style-type'] = 'none';
            let checkbox = html_doc.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = entry.checked;
            checkbox.style['list-style-type'] = 'none';
            checkbox.style.margin = '0 0.2em 0 -1.3em';

            if (options.checkbox.disabled_property) {
                checkbox.disabled = true;
            }

            li.appendChild(checkbox);
        }

        options.paragraph_as_text = true;

        render_blocks(markdown, entry.nodes, builder, li, html_doc, options);

        options.paragraph_as_text = false;

        entry.sublists.map(sublist => render_list(markdown, sublist, builder, html_doc, options, level + 1))
            .forEach(sublist => li.appendChild(sublist));

        html_list.appendChild(li);
    });

    return html_list;
}

/**
 * Renders the markdown document into an HTML node.
 * @param {MDDocument} markdown The markdown document.
 * @param {Document} html_doc The DOM document.
 * @param options
 */
export default function render(markdown, html_doc, options = {}) {
    options = merge_default_options(options);
    options.inline_html_block = false;
    options.text = text => {
        let helper = html_doc.createElement('textarea');
        helper.innerHTML = text;
        return html_doc.createTextNode(helper.value);
    };

    let doc_div;
    if (options.parent) {
        doc_div = options.parent;
    } else {
        doc_div = html_doc.createElement('div');
    }

    let builder = new HTMLBuilder();
    render_blocks(markdown, markdown.blocks, builder, doc_div, html_doc, options);
    console.log(builder.toString());

    return doc_div;
}
