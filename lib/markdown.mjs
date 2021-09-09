/*
 * Copyright © 2021 LambdAurora <aurora42lambda@gmail.com>
 *
 * This file is part of lib.md.
 *
 * Licensed under the MIT license. For more information,
 * see the LICENSE file.
 */

/**
 * Represents an element.
 *
 * @version 1.0.0
 * @since 1.0.0
 */
export class Element {
    /**
     * @param {string|(Element|Text|string)[]} nodes the inner nodes of the element
     * @param {boolean} allow_linebreaks `true` if linebreaks are allowed inside this element, else `false`.
     */
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
     *
     * @param {string|Element} node the node to push
     * @return this element
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
     *
     * @return {string} the nodes as a string
     */
    get_nodes_as_string() {
        return this.nodes.map(node => node.toString()).join("");
    }

    /**
     * Returns the element as plain text.
     *
     * @return {string} the element as plain text
     */
    as_plain_text() {
        return this.nodes.map(node => {
            if (node instanceof Text)
                return node.content;
            else
                return node.as_plain_text();
        }).join("");
    }

    toString() {
        return this.get_nodes_as_string();
    }
}

/**
 * Returns the nodes a string with linebreaks.
 *
 * @param nodes the nodes
 * @return {string} the nodes as a string
 */
function to_string_with_linebreaks(nodes) {
    return nodes.map((node, index) => node.toString() + ((index + 1 < nodes.length && !(node instanceof Text && node.is_linebreak())) ? " " : "")).join("");
}

/**
 * Purges the nodes from linebreaks
 *
 * @param nodes the nodes to purge
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
     *
     * @return {boolean} `true` if this reference has a tooltip, else `false`.
     */
    has_tooltip() {
        return this.tooltip && this.tooltip !== "";
    }

    toString() {
        return this.url + (this.has_tooltip() ? ` "${this.tooltip}"` : "");
    }
}

/*
 * Inlines
 */

/**
 * Represents a text node.
 *
 * @version 1.0.0
 * @since 1.0.0
 */
export class Text {
    /**
     * @param {string} content the text content
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
     * @param {string} content the text content
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
     * @param {string|(Element|Text|string)[]} content the inner nodes of the element
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
     * @param {string|(Element|Text|string)[]} content the inner nodes of the element
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

/**
 * Represents an underlined element.
 *
 * This is a non-standard element.
 *
 * @version 1.0.0
 * @since 1.0.0
 */
export class Underline extends Element {
    /**
     * @param {string|(Element|Text|string)[]} content the inner nodes of the element
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
     * @param {string|(Element|Text|string)[]} content the inner nodes of the element
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

/**
 * Represents an highlighted element.
 *
 * This is a non-standard element.
 *
 * @version 1.0.0
 * @since 1.0.0
 */
export class Highlight extends Element {
    /**
     * @param {string|(Element|Text|string)[]} content the inner nodes of the element
     */
    constructor(content) {
        super(content, false);
    }

    toString() {
        return `==${super.toString()}==`;
    }

    toJSON() {
        return { type: "highlight", nodes: this.nodes };
    }
}

/**
 * Represents a spoiler element.
 *
 * This is a non-standard element but present in Discord's markdown.
 *
 * Content inside the spoiler element should be hidden when rendered by default.
 *
 * @version 1.0.0
 * @since 1.0.0
 */
export class Spoiler extends Element {
    /**
     * @param {string|(Element|Text|string)[]} content the inner nodes of the element
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

/**
 * Represents a link.
 *
 * @version 1.0.0
 * @since 1.0.0
 */
export class Link extends Element {
    /**
     * @param {string} url the URL to link
     * @param {string|(Element|Text|string)[]} title the title
     * @param {string} tooltip the optional tooltip
     * @param {string} reference non-empty string if the link is referenced later in the document
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
     *
     * @return {boolean} `true` if this element has a tooltip, else `false`
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

/**
 * Represents an image.
 *
 * @version 1.0.0
 * @since 1.0.0
 */
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
 * Blocks
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
     * @param {string|(Element|Text|string)[]} nodes the inner nodes of the element
     * @param {String} level the heading level
     */
    constructor(nodes, level) {
        super(nodes, false);
        this.level = level;
    }

    /**
     * Returns the identifier of this heading.
     *
     * @return {string} the identifier
     */
    get_id() {
        return encodeURI(this.as_plain_text()).replace(/%20/g, "-").toLocaleLowerCase();
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
     *
     * @return {boolean} `true` if this code block has a specified language, else `false`
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

export class List extends Element {
    constructor(entries, ordered) {
        super(entries.map(entry => {
            if (entry instanceof ListEntry)
                return entry;
            return new ListEntry([entry], null);
        }), true);
        this.ordered = ordered;
    }

    /**
     * Pushes a new entry in this list.
     *
     * @param {string|Element} node the node to push
     * @return {List} this list
     */
    push(node) {
        if (!(node instanceof ListEntry)) {
            if (node instanceof List) {
                node = new ListEntry("", [node]);
            } else {
                node = new ListEntry([node]);
            }
        }
        return super.push(node);
    }

    /**
     * Gets the last entry in this list.
     *
     * @return {ListEntry} the last entry
     */
    get_last() {
        return this.nodes[this.nodes.length - 1];
    }

    toString() {
        let entries = this.nodes.map(node => node.toString())
            .map((node, index) => {
                if (this.ordered) {
                    return `${index + 1}. ${node}`;
                } else {
                    return `- ${node}`;
                }
            })
            .map(node => node.split("\n")
                .map((node, index) => {
                    if (index !== 0) {
                        return " " + node;
                    } else {
                        return node;
                    }
                })
                .join("\n")
            ).join("\n");
        return entries;
    }

    toJSON() {
        return { type: "list", entries: this.nodes, ordered: this.ordered };
    }
}

export class ListEntry extends Element {
    /**
     * @param {string|(Element|Text|string)[]} nodes the inner nodes of the element
     * @param {List[]|null} sublists if present, the sublist of this entry, else `null`
     * @param {boolean|null} checked `true` or `false` if this entry is a checkbox, else `null`
     */
    constructor(nodes, sublists = [], checked = null) {
        super(nodes, false);
        this.checked = checked;
        this.sublists = sublists;
        if (!this.sublists)
            this.sublists = [];
    }

    toString() {
        let content = this.nodes.map(block => block.toString()).join("\n");

        if (typeof this.checked === "boolean") {
            if (this.checked)
                content = "[x] " + content;
            else
                content = "[ ] " + content;
        }

        if (this.sublists.length > 0) {
            content += "\n" + this.sublists.map(sublist => sublist.toString().split("\n").map(line => "  " + line).join("\n")).join("\n");
        }

        return content;
    }

    toJSON() {
        return { type: "list_entry", nodes: this.nodes, sublists: this.sublists, checked: this.checked };
    }
}

export class InlineHTML extends Element {
    constructor(nodes) {
        super(nodes, true);
    }

    toJSON() {
        return { type: "inline_html", content: this.nodes };
    }
}

export class InlineLatex extends Element {
    constructor(raw, display_mode = false) {
        super([]);
        this.raw = raw;
        this.display_mode = display_mode;
    }

    toString() {
        if (this.display_mode)
            return `$$\n${this.raw}\n$$`;
        else
            return `$${this.raw}$`;
    }

    toJSON() {
        return { type: "inline_latex", raw: this.raw, display_mode: this.display_mode };
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
 * Represents a table of contents.
 *
 * This is a non-standard element.
 *
 * @version 1.0.0
 * @since 1.0.0
 */
export class TableOfContents extends BlockElement {
    constructor() {
        super([]);
    }

    /**
     * Returns the table of contents as a standard list.
     *
     * @param {MDDocument} doc the Markdown document
     * @return {List} the equivalent list
     */
    as_list(doc) {
        let list = new List([], true);

        let headings = doc.blocks.filter(block => block instanceof Heading);
        let allow_h1 = headings.filter(block => block.level === HeadingLevel.H1).length > 1;
        if (!allow_h1) {
            headings = headings.filter(block => block.level !== HeadingLevel.H1);
        }

        let current = [list];

        function push_heading(list, heading) {
            list.push(new ListEntry([new Paragraph([new Link(`#${heading.get_id()}`, heading.nodes)])]));
        }

        headings.forEach(heading => {
            let level = parseInt(heading.level[1]);
            if (!allow_h1)
                level--;

            if (level !== 1) {
                while (!current[level - 1])
                    level--;
            }

            if (level === 1) {
                push_heading(list, heading);
                current = [list]; // Time to rebuild.
                current[1] = list.get_last();
            } else {
                if (current.length > level + 1) {
                    current.splice(level);
                }

                let parent = current[level - 1];
                if (parent.sublists.length === 0) {
                    parent.sublists.push(new List([], true));
                }

                let parent_list = parent.sublists[parent.sublists.length - 1];
                push_heading(parent_list, heading);
                current[level] = parent_list.get_last();
            }
        });

        return list;
    }

    toString() {
        return "[[ToC]]";
    }

    toJSON() {
        return { type: "table_of_contents" };
    }
}

/**
 * Gets all "external" references in the element nodes.
 * It will search for a Link or Image object and checks whether it has an "external" reference or not, if it has it will add it in the returning array.
 *
 * @param {Element} element the current element to extract references
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
     *
     * @param {BlockElement|Text|string} block the block to push
     * @return {MDDocument} this document
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

    /**
     * Pushes a new reference in this document.
     *
     * @param {string} name the reference name
     * @param {Reference} reference the reference to push
     * @return {MDDocument} this document
     */
    ref(name, reference) {
        if (!this.has_ref(name)) {
            this.references.push({ name: name, ref: reference });
        }
        return this;
    }

    /**
     * Returns whether this document has a reference or not.
     *
     * @param {string} name the reference name
     * @return {boolean} `true` if the reference is found, else `false`
     */
    has_ref(name) {
        return this.references.find(ref => ref.name === name);
    }

    /**
     * Clears this document.
     *
     * @return {MDDocument} this document
     */
    clear() {
        this.blocks = [];
        this.references = [];
        return this;
    }

    toString() {
        let references = this.references;
        this.blocks.forEach(block => references = references.concat(get_references(block)));
        return this.blocks.map(block => block.toString() + "\n").join("\n")
            + (references.length !== 0 ? "\n" + references.filter(ref => ref.ref.url !== undefined).map(ref => `[${ref.name}]: ${ref.ref.toString()}`).filter((v, i, arr) => arr.indexOf(v) === i).join("\n")
                + "\n" : "");
    }
}
