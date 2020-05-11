/*
 * Copyright © 2020 LambdAurora <aurora42lambda@gmail.com>
 *
 * This file is part of lib.md.
 *
 * Licensed under the MIT license. For more information,
 * see the LICENSE file.
 */

export class Element {
    constructor(nodes, allow_linebreaks = true) {
        if (typeof nodes === "string") {
            nodes = [nodes];
        }
        this.nodes = nodes.map(node => {
            if (typeof node === "string") 
                node = new Text(node);
            return node;
        });
        if (!allow_linebreaks)
            this.nodes = purge_linebreaks(this.nodes);
    }

    /**
     * Pushes a new node in this element.
     * @param {string|Element} node The node to push.
     * @return This element.
     */
    push(node) {
        if (typeof node === "string") {
            node = new Text(node);
        }
        this.nodes.push(node);
        return this;
    }

    /**
     * Returns the nodes of this element as a string.
     * @return {string} The nodes as a string.
     */
    get_nodes_as_string() {
        return this.nodes.map(node => node.toString()).join("");
    }

    toString() {
        return this.get_nodes_as_string();
    }
}

/**
 * Returns the nodes a string with linebreaks.
 * @param nodes The nodes.
 * @return {string} The nodes as a string.
 */
function to_string_with_linebreaks(nodes) {
    return nodes.map((node, index) => node.toString() + ((index + 1 < nodes.length && !(node instanceof Text && node.is_linebreak())) ? " " : "")).join("");
}

/**
 * Purges the nodes from linebreaks.
 * @param nodes The nodes to purge.
 */
function purge_linebreaks(nodes) {
    return nodes.filter(node => !(node instanceof Text && node.is_linebreak()));
}

export class Reference {
    constructor(url, tooltip) {
        this.url = url;
        this.tooltip = tooltip;
    }

    /**
     * Returns whether this reference has a tooltip or not.
     * @return {boolean} True if this reference has a tooltip, else false.
     */
    has_tooltip() {
        return this.tooltip && this.tooltip !== "";
    }

    toString() {
        return this.url + (this.has_tooltip() ? ` "${this.tooltip}"` : "");
    }
}

/*
 * INLINES
 */

/**
 * Represents a text node.
 */
export class Text {
    /**
     * 
     * @param {string} content The text content.
     */
    constructor(content) {
        this.content = content;
    }

    is_linebreak() {
        return this.content === "  \n";
    }

    toString() {
        return this.content;
    }

    toJSON() {
        if (this.is_linebreak()) {
            return { type: "linebreak" };
        } else {
            return this.content;
        }
    }
}

export class InlineCode extends Text {
    /**
     * 
     * @param {string} content The text content.
     */
    constructor(content) {
        super(content);
    }

    is_linebreak() {
        return false;
    }

    toString() {
        let content = super.toString();
        if (content.includes("`")) {
            return "```" + content + "```";
        } else {
            return "`" + content + "`";
        }
    }

    toJSON() {
        return { type: "inline_code", content: this.content };
    }
}

export const LINEBREAK = new Text("  \n");

export class Italic extends Element {
    /**
     * @param {string|Element[]} content The content.
     */
    constructor(content) {
        super(content, true);
    }

    toString() {
        const content = super.toString();
        if (content.includes("*")) {
            return `_${content}_`;
        } else {
            return `*${content}*`;
        }
    }

    toJSON() {
        return { type: "italic", nodes: this.nodes };
    }
}

export class Bold extends Element {
    /**
     * @param {string|Element[]} content The content.
     */
    constructor(content) {
        super(content, true);
    }

    toString() {
        return `**${super.toString()}**`;
    }

    toJSON() {
        return { type: "bold", nodes: this.nodes };
    }
}

export class Underline extends Element {
    /**
     * @param {string|Element[]} content The content.
     */
    constructor(content) {
        super(content, true);
    }

    toString() {
        return `__${super.toString()}__`;
    }

    toJSON() {
        return { type: "underline", nodes: this.nodes };
    }
}

export class Strikethrough extends Element {
    /**
     * @param {string|Element[]} content The content.
     */
    constructor(content) {
        super(content, false);
    }

    toString() {
        return `~~${super.toString()}~~`;
    }

    toJSON() {
        return { type: "strikethrough", nodes: this.nodes };
    }
}

export class Spoiler extends Element {
    /**
     * @param {string|Element[]} content The content.
     */
    constructor(content) {
        super(content, false);
    }

    toString() {
        return `||${super.toString()}||`;
    }

    toJSON() {
        return { type: "spoiler", nodes: this.nodes };
    }
}

export class Link extends Element {
    /**
     * 
     * @param {string} url The URL to link.
     * @param {string|Element[]} title The title.
     * @param {string} tooltip The optional tooltip.
     * @param {string} reference Non empty string if the link is referenced later in the document.
     */
    constructor(url, title, tooltip, reference) {
        if (title === undefined || title === "") {
            title = new Text(url);
        }
        if (reference === undefined) {
            reference = "";
        }
        super(title, false);
        this.ref = new Reference(url, tooltip);
        this.ref_name = reference;
    }

    /**
     * Returns whether this element has a tooltip or not.
     * @return {boolean} Ture if this element has a tooltip, else false.
     */
    has_tooltip() {
        return this.ref.has_tooltip();
    }

    toString() {
        return `[${super.toString()}]` + 
            (this.ref_name !== "" ? `[${this.ref_name}]` : `(${this.ref.toString()})`);
    }

    toJSON() {
        return { type: "link", url: this.ref.url, title: this.nodes, tooltip: this.ref.tooltip, ref_name: this.ref_name };
    }
}

export class Image extends Link {
    constructor(url, alt, tooltip, reference) {
        super(url, alt, tooltip, reference);
    }

    toString() {
        return "!" + super.toString();
    }

    toJSON() {
        return { type: "image", url: this.ref.url, alt: this.nodes, tooltip: this.ref.tooltip, ref_name: this.ref_name };
    }
}

/*
 *  BLOCKS
 */

export class BlockElement extends Element {
    constructor(nodes, allow_linebreaks) {
        super(nodes, allow_linebreaks);
    }
}

export const HeadingLevel = Object.freeze({
    H1: "h1",
    H2: "h2",
    H3: "h3",
    H4: "h4",
    H5: "h5",
    H6: "h6"
});

export class Heading extends BlockElement {
    /**
     * 
     * @param {string|Element[]} nodes The content element.
     * @param {String} level The heading level.
     */
    constructor(nodes, level) {
        super(nodes, false);
        this.level = level;
    }

    toString() {
        let content = this.nodes.map(node => node.toString()).join(" ");
        switch (this.level) {
            case HeadingLevel.H1:
                return "# " + content;
            case HeadingLevel.H2:
                return "## " + content;
            case HeadingLevel.H3:
                return "### " + content;
            case HeadingLevel.H4:
                return "#### " + content;
            case HeadingLevel.H5:
                return "##### " + content;
            case HeadingLevel.H6:
                return "###### " + content;
            default:
                throw new Error(`lib.md ;; Heading#toString(): invalid heading "${this.level}".`);
        }
    }

    toJSON() {
        return { type: "heading", level: this.level, nodes: this.nodes };
    }
}

export class Paragraph extends BlockElement {
    constructor(nodes) {
        super(nodes);
    }

    toString() {
        //return to_string_with_linebreaks(this.nodes);
        return super.toString();
    }

    toJSON() {
        return { type: "paragraph", nodes: this.nodes };
    }
}

export class BlockCode extends BlockElement {
    constructor(code, language) {
        super([], true);
        this.code = code;
        this.language = language;
    }

    push(code) {
        this.code += code;
        return this;
    }

    /**
     * Returns whether this code block has a language specified.
     * @return {boolean} True if this code block has a specified language, else false.
     */
    has_language() {
        return this.language && this.language !== "";
    }

    toString() {
        return "```" + (this.has_language() ? this.language + "\n" : "\n") + this.code + "\n```";
    }

    toJSON() {
        return { type: "block_code", code: this.code, language: this.language };
    }
}

export class BlockQuote extends BlockElement {
    constructor(nodes) {
        super(nodes);
    }

    toString() {
        return to_string_with_linebreaks(this.nodes).split("\n").map(quote => `> ${quote}`).join("\n");
    }

    toJSON() {
        return { type: "quote", nodes: this.nodes };
    }
}

/**
 * Gets all "external" references in the element nodes.
 * It will search for a Link or Image object and checks whether it has an "external" reference or not, if it has it will add it in the returning array.
 * @param {Element} element The current element to extract references.
 */
function get_references(element) {
    // References are only present in Link and Image and Image extends Link.
    if (element instanceof Link) {
        // Checks if it uses "external" reference.
        if (element.ref_name !== "") {
            return {name: element.ref_name, ref: element.ref};
        }
    // Not a Link or Image? Then retry with its child nodes.
    } else if (element instanceof Element) {
        return element.nodes.map(node => get_references(node)).filter(node => node !== undefined).flat();
    }
}

export class MDDocument {
    constructor(blocks) {
        if (blocks === undefined)
            blocks = [];
        this.blocks = blocks;
        this.references = [];
    }

    /**
     * Pushes a block element in this document.
     * @param {BlockElement|Text|string} block The block to push.
     * @return {MDDocument} This document.
     */
    push(block) {
        if (typeof block === "string") {
            block = new Text(block);
        }
        if (block instanceof Text) {
            block = new Paragraph([block]);
        }
        this.blocks.push(block);
        return this;
    }

    ref(name, reference) {
        if (!this.has_ref(name)) {
            this.references.push({ name: name, ref: reference });
        }
        return this;
    }

    has_ref(name) {
        return this.references.find(ref => ref.name === name);
    }

    toString() {
        let references = this.references;
        this.blocks.forEach(block => references = references.concat(get_references(block)));
        return this.blocks.map(block => block.toString() + "\n").join("\n")
            + (references.length !== 0 ? "\n" + references.filter(ref => ref.ref.url !== undefined).map(ref => `[${ref.name}]: ${ref.ref.toString()}`).filter((v, i, arr) => arr.indexOf(v) === i).join("\n")
                + "\n" : "");
    }
}
