/*
 * Copyright © 2021 LambdAurora <aurora42lambda@gmail.com>
 *
 * This file is part of lib.md.
 *
 * Licensed under the MIT license. For more information,
 * see the LICENSE file.
 */

import { merge_objects } from './utils.mjs';

export class Node {}

/*
 * Elements
 */

function make_tag(name, options = {}) {
    const complete_options = Object.freeze(
        merge_objects({
            required_attributes: Object.freeze([]),
            self_closing: false,
            create: () => new Element(name)
        }, options)
    );
    return {
        name: name,
        ...complete_options
    };
}

export const Tag = Object.freeze({
    a: make_tag('a', { create: () => new Link() }),
    blockquote: make_tag('blockquote'),
    br: make_tag('br', { self_closing: true }),
    code: make_tag('code'),
    div: make_tag('div'),
    em: make_tag('em'),
    h1: make_tag('h1'),
    h2: make_tag('h2'),
    h3: make_tag('h3'),
    h4: make_tag('h4'),
    h5: make_tag('h5'),
    h6: make_tag('h6'),
    img: make_tag('img', { required_attributes: [ 'src', 'alt' ], self_closing: true, create: () => new Image() }),
    input: make_tag('input', { self_closing: true }),
    li: make_tag('li'),
    main: make_tag('main'),
    ol: make_tag('ol'),
    p: make_tag('p'),
    pre: make_tag('pre'),
    span: make_tag('span'),
    strong: make_tag('strong'),
    template: make_tag('template'),
    ul: make_tag('ul')
});

export function create_element(tag) {
    let actual_tag = typeof tag === 'string' ? Tag[tag] : Tag[tag.name];
    
    if (actual_tag === undefined || actual_tag === null) {
        throw new Error(`Invalid tag "${tag}" was specified`);
    }

    return actual_tag.create();
}

export class Element extends Node {
    constructor(tag) {
        super();

        if (typeof tag === 'string') {
            this.tag = Tag[tag];
        } else {
            this.tag = Tag[tag.name];
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
     * @param {Node} node the node to append
     */
    append_child(node) {
        if (this.tag.self_closing) {
            throw new Error('Cannot append children to a self-closing tag.');
        } else if (typeof node === 'string') {
            node = new Text(node);
        } else if (!(node instanceof Node)) {
            throw new Error(`The appended node must be a Node object, found ${node}.`);
        }

        this.children.push(node);
    }

    attr(name, value) {
        for (const [i, attribute] of this.attributes.entries()) {
            if (name === attribute.name) {
                if (value !== undefined && value !== null) {
                    let replaced_attr = create_attribute(name, value);
                    this.attributes[i] = replaced_attr;
                    return replaced_attr;
                }
                return attribute;
            }
        }

        let attribute = create_attribute(name, value);
        this.attributes.push(attribute);
        return attribute;
    }

    html() {
        let result = '<' + this.tag.name;

        if (this.attributes.length !== 0) {
            result += ' ' + this.attributes.map(attr => attr.html()).join(' ');
        }

        if (this.tag.self_closing) {
            result += ' />';
        } else {
            result += '>';

            if (this.children.length !== 0) {
                let is_last_text = false;
                for (const child of this.children) {
                    if (child instanceof Text) {
                        if (is_last_text)
                            result += ' ';
                        is_last_text = true;
                    } else is_last_text = false;
                    result += child.html(this.tag === Tag.code);
                }
            }
            result += '</' + this.tag.name + '>';
        }

        return result;
    }

    toString() {
        return `Element{tag: "${this.tag.name}", `
            + `attributes: [${this.attributes.map(attr => attr.toString()).join(', ')}], `
            + `children: [${this.children.map(child => child.toString()).join(', ')}]}`;
    }

    toJSON() {
        return {
            type: 'tag',
            tag: this.tag.name,
            attributes: this.attributes.map(attr => attr.toJSON()),
            children: this.children.map(child => child.toJSON())
        };
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

    href(new_value) {
        return this.attr('href', new_value).value;
    }

    title(new_value) {
        return this.attr('title', new_value).value;
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
        return this.attr('src', new_value).value;
    }

    alt(new_value) {
        return this.attr('alt', new_value).value;
    }

    title(new_value) {
        return this.attr('title', new_value).value;
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
        .replaceAll(/&/g, '&amp;')
        .replaceAll(/</g, '&lt;')
        .replaceAll(/>/g, '&gt;')
        .replaceAll(/"/g, '&quot;')
        .replaceAll(/'/g, '&#39;');
}

export function create_attribute(name, value) {
    if (name === 'class') {
        return new ClassAttribute(value);
    } else {
        return new Attribute(name, value);
    }
}

export class Attribute {
    constructor(name, value) {
        this.name = name;
        this._value = value;
    }

    value() {
        return this._value;
    }

    html() {
        return `${this.name}="${escape_attribute(this.value())}"`;
    }

    toString() {
        return `Attribute{name: "${this.name}", value: "${this.value()}"]}`;
    }

    toJSON() {
        return {
            type: 'attribute',
            name: this.name,
            value: this.value()
        };
    }
}

export class ClassAttribute extends Attribute {
    constructor(value) {
        super('class', '');

        if (value instanceof Array) {
            this._value = value;
        } else if (typeof value === 'string') {
            if (value.includes(' ')) {
                this._value = value.split(' ');
            } else {
                this._value = [value];
            }
        } else {
            this._value = [];
        }
    }

    add(class_name) {
        this._value.push(class_name);
    }

    value() {
        return this._value.join(' ');
    }

    toString() {
        return `ClassAttribute{name: "${this.name}", value: "${this.value()}", classes: [${this._value.join(', ')}}`
    }

    toJSON() {
        return {
            type: 'class_attribute',
            name: this.name,
            value: this.value(),
            classes: this._value
        };
    }
}

/*
 * INLINES
 */

/**
 * Escapes the given text.
 *
 * @param {string} text the text to escape
 * @return {string} the escaped text
 */
export function escape_text(text) {
    return text
        .replaceAll(/&/g, '&amp;')
        .replaceAll(/</g, '&lt;')
        .replaceAll(/>/g, '&gt;');
}

/**
* Represents a text node.
*
* @version 1.1.0
* @since 1.1.0
*/
export class Text extends Node {
   /**
    * @param {string} content the text content
    */
   constructor(content) {
       super();

       this.content = content;
   }

   html(raw = false) {
        if (raw) {
            return this.content;
        } else {
            return escape_text(this.content);
        }
   }

   toString() {
       return `TextNode{${this.content}}`;
   }

   toJSON() {
       return this.content;
   }
}

/**
 * Represents a comment node.
 */
export class Comment extends Text {
    /**
     * @param {string} content the comment content
     */
    constructor(content) {
        super(content);
    }

    html() {
        return `<!-- ${super.html()} -->`;
    }

    toString() {
        return `CommentNode{${this.content}}`;
    }

    toJSON() {
        return {
            type: 'comment',
            content: this.content
        };
    }
}
