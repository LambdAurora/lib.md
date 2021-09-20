/*
 * Copyright © 2021 LambdAurora <aurora42lambda@gmail.com>
 *
 * This file is part of lib.md.
 *
 * Licensed under the MIT license. For more information,
 * see the LICENSE file.
 */

import { merge_objects } from "./utils.mjs";

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
 * @version 1.1.0
 * @since 1.1.0
 */
export const Tag = Object.freeze({
    "!doctype": make_tag("!DOCTYPE", { self_closing: true }),
    a: make_tag("a", { create: () => new Link() }),
    abbr: make_tag("abbr"),
    address: make_tag("address"),
    area: make_tag("area", { self_closing: true }),
    article: make_tag("article"),
    aside: make_tag("aside"),
    audio: make_tag("audio"),
    b: make_tag("b"),
    base: make_tag("base", { self_closing: true }),
    bdi: make_tag("bdi"),
    bdo: make_tag("bdo"),
    blockquote: make_tag("blockquote"),
    body: make_tag("body"),
    br: make_tag("br", { self_closing: true }),
    button: make_tag("button"),
    canvas: make_tag("canvas"),
    caption: make_tag("caption"),
    cite: make_tag("cite"),
    code: make_tag("code", { parse_inside: false }),
    col: make_tag("col", { self_closing: true }),
    colgroup: make_tag("colgroup"),
    data: make_tag("data"),
    datalist: make_tag("datalist"),
    dd: make_tag("dd"),
    del: make_tag("del"),
    details: make_tag("details"),
    dfn: make_tag("dfn"),
    dialog: make_tag("dialog"),
    div: make_tag("div"),
    dl: make_tag("dl"),
    dt: make_tag("dt"),
    em: make_tag("em"),
    fieldset: make_tag("fieldset"),
    figcaption: make_tag("figcaption"),
    figure: make_tag("figure"),
    footer: make_tag("footer"),
    form: make_tag("form"),
    h1: make_tag("h1"),
    h2: make_tag("h2"),
    h3: make_tag("h3"),
    h4: make_tag("h4"),
    h5: make_tag("h5"),
    h6: make_tag("h6"),
    head: make_tag("head"),
    header: make_tag("header"),
    hr: make_tag("hr", { self_closing: true }),
    html: make_tag("html"),
    i: make_tag("i"),
    iframe: make_tag("iframe"),
    img: make_tag("img", { required_attributes: [ "src", "alt" ], self_closing: true, create: () => new Image() }),
    input: make_tag("input", { self_closing: true }),
    ins: make_tag("ins"),
    kbd: make_tag("kbd"),
    label: make_tag("label"),
    legend: make_tag("legend"),
    li: make_tag("li"),
    link: make_tag("link", { self_closing: true }),
    main: make_tag("main"),
    map: make_tag("map"),
    mark: make_tag("mark"),
    meta: make_tag("meta", { self_closing: true }),
    meter: make_tag("meter"),
    nav: make_tag("nav"),
    noscript: make_tag("noscript"),
    ol: make_tag("ol"),
    optgroup: make_tag("optgroup"),
    option: make_tag("option"),
    output: make_tag("output"),
    p: make_tag("p"),
    param: make_tag("param", { self_closing: true }),
    picture: make_tag("picture"),
    pre: make_tag("pre"),
    progress: make_tag("progress"),
    q: make_tag("q"),
    rp: make_tag("rp"),
    rt: make_tag("rt"),
    ruby: make_tag("ruby"),
    s: make_tag("s"),
    samp: make_tag("samp"),
    script: make_tag("script", { parse_inside: false, escape_inside: false }),
    section: make_tag("section"),
    select: make_tag("select"),
    small: make_tag("small"),
    source: make_tag("source", { self_closing: true }),
    span: make_tag("span"),
    strong: make_tag("strong"),
    style: make_tag("style", { parse_inside: false, escape_inside: false }),
    sub: make_tag("sub"),
    summary: make_tag("summary"),
    sup: make_tag("sup"),
    svg: make_tag("svg"),
    table: make_tag("table"),
    tbody: make_tag("tbody"),
    td: make_tag("td"),
    template: make_tag("template"),
    textarea: make_tag("textarea"),
    tfoot: make_tag("tfoot"),
    th: make_tag("th"),
    thead: make_tag("thead"),
    time: make_tag("time"),
    title: make_tag("title"),
    tr: make_tag("tr"),
    track: make_tag("track", { self_closing: true }),
    u: make_tag("u"),
    ul: make_tag("ul"),
    var: make_tag("var"),
    video: make_tag("video"),
    wbr: make_tag("wbr", { self_closing: true })
});

export function create_element(tag) {
    let actual_tag = typeof tag === "string" ? Tag[tag.toLowerCase()] : Tag[tag.name];
    
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
 * @version 1.2.0
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
     * @param {Node} node the node to append
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
     * @param {Node} node the node to append
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
     * @returns {Element|string|null} this current element if a value is specified, else the property value if present, otherwise `null`
     * @since 1.2.0
     */
    style(property, value = undefined) {
        if (value) {
            this.attr("style").set(property, value);
            return this;
        } else {
            let style = this.get_attr("style");
            if (style) return style.get(property);
            return null;
        }
    }

    html(raw = false) {
        let result = "<" + this.tag.name;

        if (this.attributes.length !== 0) {
            result += " " + this.attributes.map(attr => attr.html()).join(" ");
        }

        if (this.tag.self_closing) {
            result += " />";
        } else {
            result += ">";

            result += this.inner_html(raw) + "</" + this.tag.name + ">";
        }

        return result;
    }

    inner_html(raw = false) {
        let result = "";

        if (this.children.length !== 0) {
            let is_last_text = false;
            for (const child of this.children) {
                if (child instanceof Text) {
                    if (is_last_text)
                        result += " ";
                    is_last_text = true;
                } else is_last_text = false;
                result += child.html(raw || !this.tag.escape_inside);
            }
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
        return this.attr("href", new_value).value;
    }

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
        .replaceAll(/&/g, "&amp;")
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
 * @version 1.1.0
 * @since 1.1.0
 */
export class Attribute {
    constructor(name, value) {
        this.name = name;
        this._value = value.toString();
    }

    value() {
        return this._value;
    }

    html() {
        let value = this.value();
        if (value === "") {
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
            if (value.includes(" ")) {
                this._value = value.split(" ");
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
                let split = rule.split(":");
                let property_value = "";
                if (split[1]) property_value = split.slice(1).join(":");
                if (split[0]) this.set(split[0], property_value);
            });
        } else {
            this._value = {};
        }
    }

    set(property, value) {
        this._value[property] = value;
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
        let style = Object.entries(this._value).map(([key, value]) => `${key}: ${value}`).join(",");
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
 * Escapes the given text.
 *
 * @param {string} text the text to escape
 * @return {string} the escaped text
 */
export function escape_text(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
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

    html() {
        return `<!-- ${super.html()} -->`;
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
}

/*
 * Utils
 */

/**
 * Sanitizes recursively the given element(s).
 *
 * @param {Element|Text|Element[]} element the element(s) to sanitize
 * @param {Array} disallowed_tags the tags that should be escaped
 * @param {function} extra extra custom sanitizer
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
                return new Text(el.html(true));
            } else {
                execute(el.children, disallowed_tags);
                return extra(el);
            }
        }
    }

    if (element instanceof Element || element instanceof Text) {
        return execute([element], disallowed_tags.map(tag => (tag.name) ? tag.name : tag))[0];
    } else {
        return execute(element, disallowed_tags.map(tag => (tag.name) ? tag.name : tag));
    }
}

/*
 * Parser
 */

export function parse_nodes(source) {
    let nodes = [];

    parse_html(source, {
        tag: Tag.div,
        append_child: node => nodes.push(node)
    });

    return nodes;
}

export function parse(source, container = null) {
    if (container !== null) {
        parse_html(source, container);
        return container;
    } else {
        return parse_nodes(source)[0];
    }
}

const TAG_END_REGEX = /^\s*<\/\s*([^<>\s]+)\s*\>/;
const ATTRIBUTE_REGEX = /^\s*([^ \t\n\r"'>\/=]+)(?:\s*=\s*((?:[^"' \t\n\r<>`]+)|(?:'([^"]+?)')|(?:"([^']+?)")))?/;
const COMMENT_END_REGEX = /-->/;

function parse_text(source, start, parent) {
    let end = -1;
    for (let i = start; i < source.length; i++) {
        let character = source[i];
        if (character === "<") { // Possible control character.
            if (i === source.length - 1) // If it's the last character, it's not a control character.
                continue;

            if (!parent.tag.parse_inside) { // In the case of a code block we can ignore control characters, except the code ending tag.
                let result = TAG_END_REGEX.exec(source.substr(i));

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
        let length = end + 1;
        if (length !== 1)
            end++;
        return {
            text: new Text(source.substr(start, length)),
            end: Math.max(1, end)
        };
    } else {
        return null;
    }
}

function parse_html(source, parent) {
    let i = 0;
    while (i < source.length) {
        if (source[i] === "<") {
            let sub_source = source.substr(i);
            let result = parse_tag_start(sub_source);

            if (result) {
                let skip_length = result.length;

                let element = result.node;

                if (!result.self_closing && !element.tag.self_closing) {
                    // Not a self-closing tag, parse inside.
                    skip_length += parse_html(source.substr(i + result.length), element);
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
            let text_result = parse_text(source, i, parent);

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

function parse_tag_start(source) {
    let tag_result = source.match(/^<([^<>\s/][^<>\s]*)/);
    if (!tag_result)
        return null;

    if (source.startsWith("<!--"))
        return null;

    let node = create_element(tag_result[1]);

    let attributes_length = parse_attributes(source.substr(tag_result[0].length), node);

    let length = source.length;
    let self_closing = false;
    for (let i = (tag_result[0].length + attributes_length); i < source.length; i++) {
        if (source.charAt(i) === '/') {
            if ((i + 1) < source.length && source.charAt(i + 1) === '>') {
                self_closing = true;
                length = i + 2;
                break;
            }
        } else if (source.charAt(i) === '>') {
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

function remove_useless_comment_spaces(comment) {
    return comment.replace(/^\s*/, "").replace(/\s*$/, "");
}

export function parse_comment(source) {
    if (!source.startsWith("<!--"))
        return null;

    let i = 4;
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

    let result = COMMENT_END_REGEX.exec(source);

    if (!result) {
        return {
            comment: new Comment(remove_useless_comment_spaces(source.substr(4))),
            length: source.length
        };
    }

    return {
        comment: new Comment(remove_useless_comment_spaces(source.substr(4, result.index - 4))),
        length: result.index + 3
    };
}

function parse_attributes(source, parent) {
    let length = 0;
    let result;
    do {
        if (source.length > 0 && source.charAt(0) === '>')
            break;

        result = ATTRIBUTE_REGEX.exec(source);

        if (!result) break;

        source = source.substr(result.index + result[0].length);
        length += (result.index + result[0].length);

        let value = result[2];
        if (result[3]) value = result[3];
        else if (result[4]) value = result[4];
        else if (!value) value = "";

        parent.attr(result[1], value);
    } while (source.length > 0);

    return length;
}
