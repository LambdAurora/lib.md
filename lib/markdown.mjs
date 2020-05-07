/*
 * Copyright © 2020 LambdAurora <aurora42lambda@gmail.com>
 *
 * This file is part of lib.md.
 *
 * Licensed under the MIT license. For more information,
 * see the LICENSE file.
 */

export class Element {
    constructor(nodes) {
        if (typeof nodes === "string") {
            nodes = [nodes];
        }
        this.nodes = nodes.map(node => {
            if (typeof node === "string") 
                node = new Text(node);
            return node;
        });
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

    toString() {
        return this.nodes.map(node => node.toString()).join(" ");
    }
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

    toString() {
        return this.content;
    }

    toJSON() {
        return this.content;
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

    toString() {
        return "`" + super.toString() + "`";
    }

    toJSON() {
        return { type: "inline_code", content: this.content };
    }
}

export class Linebreak extends Text {
    constructor() {
        super("  \n");
    }

    toJSON() {
        return { type: "linebreak" };
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
        super(title);
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
}

export class Image extends Link {
    constructor(url, alt, tooltip) {
        super(url, alt, tooltip);
    }

    toString() {
        return "!" + super.toString();
    }
}

/*
 *  BLOCKS
 */

export class BlockElement extends Element {
    constructor(nodes) {
        super(nodes);
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
        super(nodes);
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
        return this.nodes.map((node, index) => node.toString() + ((index + 1 < this.nodes.length && !(node instanceof Linebreak)) ? " " : "")).join("");
    }

    toJSON() {
        return { type: "paragraph", nodes: this.nodes };
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

export class Document {
    constructor(blocks) {
        if (blocks === undefined)
            blocks = [];
        this.blocks = blocks;
    }

    /**
     * Pushes a block element in this document.
     * @param {BlockElement|Text|string} block The block to push.
     * @return {Document} This document.
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

    toString() {
        let references = [];
        this.blocks.forEach(block => references = references.concat(get_references(block)));
        return this.blocks.map(block => block.toString() + "\n").join("\n") 
            + references.map(ref => `[${ref.name}]: ${ref.ref.toString()}\n`).join("\n");
    }
}
