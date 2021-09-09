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
import { merge_objects, purge_inline_html } from './utils.mjs';

const DEFAULT_OPTIONS = {
    allow_escape: true,
    checkbox: true,
    code_block_from_indent: false,
    highlight: true,
    image: true,
    latex: false,
    link: true,
    list: true,
    newline_as_linebreaks: false,
    spoiler: true,
    table: true,
    table_of_contents: true,
    underline: true
};

const CODE_BLOCK_INDENT_DETECTION_REGEX = /^( {4})|(\t)/
const LIST_DETECTION_REGEX = /^ *(-|\*|\+|(?:[0-9]+\.)) +.+/;
const LIST_CHECKBOX_REGEX = /^(\[([Xx ])\]\s+).+/i;
const QUOTE_DETECTION_REGEX = /^\s*\>\s/;
const QUOTE_MULTILINE_REGEX = /\n\s*\>\s/;
const TABLE_DETECTION_REGEX = /^[ \t]*\|.*\|/;
const TABLE_SEPARATOR_REGEX = /^[ \t]*\|(?:\:?-+\:?\|)+([ \t]*)$/;

const ESCAPED_UNICODE = /^\\(?:u([0-9A-Fa-f]{4}))|(?:x([0-9A-Fa-f]{2}))|(?:U([0-9A-Fa-f]{8}))/;

const INLINE_HTML_DETECTION_REGEX = /^\s*\<(\/)?([A-z]+).*\>/i;
const INLINE_HTML_OPENER_REGEX = /\<([A-z]+).*?\>/gi;
const INLINE_HTML_CLOSER_REGEX = /\<\/([A-z]+)\>/gi;
const INLINE_HTML_SKIP_REGEX = /^\<(\/)?([A-z]+).*?\>/;
const INLINE_HTML_BR_REGEX = /^\<(br)(?: ?\/)?\>/;
const INLINE_HTML_SINGLE_TAG = Object.values(html.Tag).filter(tag => tag.self_closing).map(tag => tag.name);
const INLINE_HTML_IGNORE_TAG = [ "iframe", "noembed", "noframes", "plaintext", "script", "style", 'svg', "textarea", "title", "xmp" ];

const INLINE_CODE_REGEX = /^(?:```((?:.|\n)+?)```)|(?:`((?:.|\n)+?)`)/;

// Note: this regex is unused because Firefox doesn't support named groups :c
//const REFERENCE_REGEX = /^\[(?<name>[^\[\]]+)\]: (?<url>[a-z]+\:\/\/[.\S]+)(?: "(?<tooltip>[^"]+)")?$/;
const REFERENCE_REGEX = /^\[([^\[\]]+)\]: ([a-z]+\:\/\/[.\S]+)(?: "([^"]+)")?$/;

function try_parse_link(input, start) {
    let rest = input.substr(start);
    if (rest[0] !== "[")
        return null;

    // Try to determine where the title/alt part ends.
    let counter = 0;
    let i;
    for (i = 1; (i < rest.length && counter >= 0); i++) {
        if (rest[i] === "[")
            counter++;
        else if (rest[i] === "]")
            counter--;
    }

    if (i >= rest.length)
        return null;

    const title = rest.substr(1, i - 2);

    // Now kind it's getting more specific.
    if (rest[i] === "(") {
        // URL with tooltip case
        i++;
        let j;
        counter = 0;
        for (j = i; (j < rest.length && counter >= 0); j++) {
            if (rest[j] === ")")
                counter--;
        }

        if (j > rest.length)
            return null;

        let part = rest.substr(i, (j - i) - 1).split(" ");
        let url = part.shift();
        let tooltip = part.join(" ");
        if (!tooltip.startsWith('"') || !tooltip.endsWith('"'))
            tooltip = null;
        else
            tooltip = tooltip.substr(1, tooltip.length - 2);

        return { title: title, url: url, tooltip: tooltip, skip: j };
    } else if (rest[i] === "[") {
        // Reference case.
        i++;
        let j;
        for (j = i; (j < rest.length && rest[j] !== "]"); j++) {}

        if (j > rest.length)
            return null;

        let reference = rest.substr(i, j - i);
        return { title: title, ref_name: reference, skip: j + 1 };
    } else {
        // It's invalid :c
        return null;
    }
}

/**
 * Tries to parse a tag in the text at the specified index.
 * @param {string} text The text to parse.
 * @param start The tag start index.
 * @param {string} delimiter The tag delimiter (1 character).
 * @param delimiter_repeat How many time the tag delimiter character is repeated to form the delimiter.
 * @return Returns a an object if the tag has been parsed successfully, else null.
 */
function try_parse_tag(text, start, delimiter, delimiter_repeat) {
    let rest = text.substr(start);
    for (let i = 0; i < delimiter_repeat; i++) {
        if (rest[i] !== delimiter)
            return null;
    }

    let found = false;

    let i;
    let saved_i = false;
    for (i = 2; i < rest.length; i++) {
        let result;
        if (rest[i] === "[" && (result = try_parse_link(rest, i))) {
            // Kind of sad that this link is "lostly" parsed.
            // The image check also is done here.
            i += result.skip - 1;
        } else {
            let delimiter_count = 0;
            while (rest[i + delimiter_count] === delimiter) {
                delimiter_count++;
            }
            if (delimiter_count === delimiter_repeat) {
                // yay the end of the tag!
                i++;
                found = true;
                break;
            } else if (delimiter_repeat === 1 && delimiter_count > 1) {
                found = true;
                if (delimiter_count === 3) {
                    i += delimiter_count;
                    break;
                }
                saved_i = i;
                i += delimiter_count - 1;
            }
        }
    }

    if (!found)
        return null;

    if (i >= rest.length && (rest[rest.length - 1] !== delimiter)) {
        if (saved_i && saved_i <= rest.length) {
            i = saved_i + 1;
        } else {
            return null;
        }
    }

    let tag = rest.substr(delimiter_repeat, i - 1 - delimiter_repeat);
    return { tag: tag, skip: tag.length + 2 * delimiter_repeat, delimiter_repeat: delimiter_repeat };
}

/**
 * Tries to parse a single tag by parsing with different delimiters through decreasing the delimiter repeat until a match is found.
 * @param {string} text The text to parse.
 * @param start The tag start index.
 * @param {string} delimiter The tag delimiter (1 character).
 * @param delimiter_repeat How many time the tag delimiter character is repeated to form the delimiter for the first iteration.
 * @return Returns a an object if the tag has been parsed successfully, else null.
 */
function try_parse_possible_tags(text, start, delimiter, delimiter_repeat) {
    for (let i = delimiter_repeat; i > 0; i--) {
        let result = try_parse_tag(text, start, delimiter, i);
        if (result)
            return result;
    }

    return null;
}

/**
 * Tries to parse an inline code in the text at the specified index.
 * @param {string} text The text to parse in.
 * @param start The inline code start index.
 */
function try_parse_inline_code(text, start) {
    let rest = text.substr(start);
    let matched = rest.match(INLINE_CODE_REGEX);
    if (!matched)
        return null;

    let code = matched[1];
    if (!code)
        code = matched[2];

    return { el: new md.InlineCode(code), skip: matched[0].length };
}

function push_text_if_present(text, nodes) {
    if (text && text !== "") {
        if (text.endsWith("\n"))
            text = text.replace(/\s+$/, "");
        nodes.push(new md.Text(text.replace(/&nbsp;/g, "\xa0")));
    }
    return "";
}

function is_list_ordered(regex_match) {
    return !(regex_match[1] === "-" || regex_match[1] === "+" || regex_match[1] === "*");
}

class MarkdownParser {
    parse(string, options = {}) {
        options = merge_objects(DEFAULT_OPTIONS, options);

        let doc = new md.MDDocument();

        options.doc = doc;
        this.parse_blocks(string, options).forEach(block => doc.push(block));

        return doc;
    }

    group_blocks(string, options = {}) {
        options = merge_objects(DEFAULT_OPTIONS, options);

        // The goal is to group lines to block elements.
        let lines = string.split("\n");
        let blocks = [];

        let current_block = "none";
        let current;

        let found;

        let inline_html_opener = "";
        let inline_html_opener_counter = 0;

        function push_group(new_current_block = "none") {
            if (current) {
                blocks.push({ block: current, type: current_block });
                current = null;
            }
            current_block = new_current_block;
            inline_html_opener = "";
            inline_html_opener_counter = 0;
        }

        function do_paragraph(line) {
            if (current_block !== "paragraph") {
                push_group("paragraph");
                current = line;
            } else {
                current += "\n" + line;
            }
        }

        lines.forEach((line, index) => {
            if (options.code_block_from_indent && (found = line.match(CODE_BLOCK_INDENT_DETECTION_REGEX)) && current_block !== "code") {
                if (current_block !== "indent_code_block") {
                    push_group("indent_code_block");
                    current = line.substr(found[0].length);
                    return;
                }

                current += "\n" + line.substr(found[0].length);
            } else if ((found = line.match(INLINE_HTML_DETECTION_REGEX)) || current_block === "inline_html") {
                let tags = line.matchAll(INLINE_HTML_OPENER_REGEX);
                let tag;
                while (tag = tags.next().value) {
                    if (!INLINE_HTML_SINGLE_TAG.includes(tag[1]) && !INLINE_HTML_IGNORE_TAG.includes(tag[1])) {
                        if (inline_html_opener === "") {
                            inline_html_opener = tag[1];
                            inline_html_opener_counter = 1;
                        } else if (inline_html_opener === tag[1]) {
                            inline_html_opener_counter++;
                        }
                    }
                }

                tags = line.matchAll(INLINE_HTML_CLOSER_REGEX);
                while (tag = tags.next().value) {
                    if (tag[1] === inline_html_opener) {
                        inline_html_opener_counter--;
                        if (inline_html_opener_counter <= 0) {
                            if (inline_html_opener_counter === 0)
                                current += "\n" + line;
                            push_group();
                            return;
                        }
                    }
                }

                if (line === "" && inline_html_opener === "") {
                    push_group();
                    return;
                }
                // Inline HTML
                if (current_block !== "inline_html") {
                    if (current) {
                        blocks.push({ block: current, type: current_block });
                    }
                    current_block = "inline_html";
                    current = line;
                } else {
                    current += "\n" + line;
                }
            } else if (line.startsWith("```") || current_block === "code") {
                if (current_block !== "code") {
                    push_group("code");
                    current = line;
                    return;
                } else if (!line.startsWith("```")) {
                    current += "\n" + line;
                }

                if (line.startsWith("```") && current_block === "code") {
                    push_group();

                    if (line.length > 3) {
                        current_block = "paragraph";
                        current = line.substr(3);
                    }
                }
            } else if (options.latex && (line.startsWith("$$") || current_block === "inline_latex")) {
                if (current_block !== "inline_latex") {
                    push_group("inline_latex");
                    current = line;
                    return;
                } else if (!line.startsWith("$$")) {
                    current += "\n" + line;
                }

                if (line.startsWith("$$") && current_block === "inline_latex") {
                    push_group();

                    if (line.length > 3) {
                        current_block = "paragraph";
                        current = line.substr(3);
                    }
                }
            } else if (line.startsWith("#")) {
                // Push the heading as a block.
                blocks.push({ block: line, type: "heading" });
            } else if (options.table_of_contents && line.toLowerCase() === "[[toc]]") {
                push_group("table_of_contents");
                current = line;
                push_group();
            } else if (line.match(QUOTE_DETECTION_REGEX)) {
                if (current_block !== "quote") {
                    push_group("quote");
                    current = line;
                } else {
                    current += "\n" + line;
                }
            } else if (options.list && ((found = line.match(LIST_DETECTION_REGEX)) || (current_block.startsWith("list") && line.startsWith(" ")))) {
                // List
                if (!current_block.startsWith("list")) {
                    push_group();

                    let ordered = is_list_ordered(found);

                    current_block = "list_" + (ordered ? "ordered" : "unordered");
                    current = line;
                } else {
                    // Ordered/Unordered mixing prevention.
                    if (found && line.match(/^ {2,}/) === null) {
                        let ordered = is_list_ordered(found);

                        if (current_block !== ("list_" + (ordered ? "ordered" : "unordered"))) {
                            push_group("list_" + (ordered ? "ordered" : "unordered"));
                            current = line;
                            return;
                        }
                    }
                    current += "\n" + line;
                }
            } else if (options.table && (found = line.match(TABLE_DETECTION_REGEX))) {
                if (current_block !== "table") {
                    let next = lines[index + 1];
                    if (next && (found = next.match(TABLE_SEPARATOR_REGEX))) {
                        push_group("table");
                        current = line.replace(/^\s*/, "");;
                        return;
                    } else {
                        do_paragraph(line);
                        return;
                    }
                }

                if (found = line.match(TABLE_SEPARATOR_REGEX)) {
                    line = line.substr(0, (line.length - found[1].length));
                }

                current += "\n" + line.replace(/^\s*/, "");
            } else if (line === "") {
                push_group();
            } else if (options.doc && (found = line.match(REFERENCE_REGEX)) !== null) {
                let name = found[1];
                let url = found[2];
                let tooltip = found[3];
                options.doc.ref(name, new md.Reference(url, tooltip));
            } else {
                do_paragraph(line);
            }
        });

        push_group();

        return blocks;
    }

    /**
     * Parse the specified block.
     * @param block The block to parse.
     * @param options The options.
     * @return {Element} The block element.
     */
    parse_block(block, options = {}) {
        if (typeof block === "string") {
            block = this.group_blocks(block, options)[0]; // Really bad.
        }

        let found;

        switch (block.type) {
            case "heading":
                {
                    // Heading
                    let nodes = block.block.split(" ");
                    let level;
                    switch (nodes[0].length) {
                        case 1:
                            level = md.HeadingLevel.H1;
                            break;
                        case 2:
                            level = md.HeadingLevel.H2;
                            break;
                        case 3:
                            level = md.HeadingLevel.H3;
                            break;
                        case 4:
                            level = md.HeadingLevel.H4;
                            break;
                        case 5:
                            level = md.HeadingLevel.H5;
                            break;
                        default:
                            level = md.HeadingLevel.H6;
                            break;
                    }
                    nodes.shift();
                    nodes = this.parse_nodes(nodes.join(" "), false, options);
                    return new md.Heading(nodes, level);
                }
            case "quote":
                {
                    // Quotes
                    let nodes = this.parse_nodes(block.block.replace(QUOTE_DETECTION_REGEX, "").replace(QUOTE_MULTILINE_REGEX, "\n"), true, options);
                    return new md.BlockQuote(nodes);
                }
            case "code":
            case "indent_code_block":
                {
                    // Block code
                    let lines = block.block.split("\n");
                    let language = "";
                    if (lines[0].split(" ").length === 1) {
                        language = lines[0].replace(/```/, "");
                    } else {
                        lines[0] = lines[0].replace(/```/, "");
                    }
                    let code = lines.filter(line => !line.startsWith("```")).join("\n");
                    return new md.BlockCode(code, language);
                }
            case "inline_html":
                // Inline HTML
                block = purge_inline_html(block.block);
                let modified_options = merge_objects(options, { inline_html_block: true });
                return new md.InlineHTML(this.parse_nodes(block, true, modified_options));
            case "inline_latex":
                {
                    // Inline LaTeX
                    let lines = block.block.split("\n");
                    lines[0] = lines[0].replace(/^\s*\$\$/, "");
                    if (lines[0] === "")
                        lines.shift();
                    return new md.InlineLatex(lines.filter(line => !line.startsWith("$$")).join("\n"), true);
                }
            case "list_ordered":
            case "list_unordered":
                // List
                // This becomes a bit difficult.
                block = block.block.replace(/^\s*/, ""); // Bad spaces >:C
                found = block.match(LIST_DETECTION_REGEX);
                let ordered = is_list_ordered(found);

                let list = new md.List([], ordered);

                const regex = /^ *(-|\*|\+|(?:[0-9]+\.)) +/;

                // I don't wanna do that.
                let lines = block.split("\n");
                let current = lines.shift().replace(regex, ""); // First node, so we don't need anything to identify it.
                let raw_list = []; // The goal is to make a first "raw" list with every part separated.
                lines.forEach(line => {
                    found = line.match(LIST_DETECTION_REGEX);
                    if (found) {
                        if (current) {
                            raw_list.push(current);
                        }
                        current = line;
                    } else {
                        current += "\n" + line;
                    }
                });

                if (current) {
                    raw_list.push(current);
                }

                // Now with the raw list we build the markdown list.
                // To do so, we an array named current which represent the last entry and the index represent the entry "level".
                // The parent list can be found with the index - 1, if it doesn't exist just go decrease the index.

                current = [];

                options.list = false; // Prevent some weird things.

                raw_list.forEach(raw_entry => {
                    let level = raw_entry.match(/^( *)/);
                    if (!level) {
                        level = 0;
                    } else {
                        level = level[1].length / 2 >> 0;
                    }

                    if (level !== 0) {
                        while (!current[level - 1])
                            level--;
                    }

                    if (level === 0) {
                        raw_entry = raw_entry.replace(regex, "").replace(/\n */g, "\n");
                        let checked = "none";
                        if (options.checkbox) {
                            let checkbox = raw_entry.match(LIST_CHECKBOX_REGEX);
                            if (checkbox) {
                                raw_entry = raw_entry.substr(checkbox[1].length);
                                checked = checkbox[2] !== " ";
                            }
                        }
                        list.push(new md.ListEntry(this.parse_blocks(raw_entry, merge_objects(options, { doc: null })), [], checked));
                        current = []; // Time to rebuild.
                        current[0] = list.get_last();
                    } else {
                        found = raw_entry.match(LIST_DETECTION_REGEX);
                        ordered = is_list_ordered(found);

                        if (current.length > level + 1) {
                            current.splice(level);
                        }

                        let parent = current[level - 1];
                        if (parent.sublists.length === 0) {
                            parent.sublists.push(new md.List([], ordered));
                        } else {
                            if (parent.sublists[parent.sublists.length - 1].ordered !== ordered) {
                                parent.sublists.push(new md.List([], ordered));
                            }
                        }

                        let parent_list = parent.sublists[parent.sublists.length - 1];
                        raw_entry = raw_entry.replace(regex, "").replace(/\n */g, "\n");
                        let checked = "none";
                        if (options.checkbox) {
                            let checkbox = raw_entry.match(LIST_CHECKBOX_REGEX);
                            if (checkbox) {
                                raw_entry = raw_entry.substr(checkbox[1].length);
                                checked = checkbox[2] !== " ";
                            }
                        }
                        parent_list.push(new md.ListEntry(this.parse_blocks(raw_entry, merge_objects(options, { doc: null })), [], checked));
                        current[level] = parent_list.get_last();
                    }
                });

                options.list = true; // Restore the option.

                return list;
            case "table_of_contents":
                return new md.TableOfContents();
            default:
                let nodes = this.parse_nodes(block.block, true, options);
                return new md.Paragraph(nodes);
        }
    }

    parse_blocks(string, options = {}) {
        options = merge_objects(DEFAULT_OPTIONS, options);

        let blocks = this.group_blocks(string, options);

        // So we have our blocks, now we can parse the blocks individually.
        // Identifying which block is what is kind of easy as you just have to see what is its beginning
        // (except heading using a divider beneath it)

        return blocks.map(block => this.parse_block(block, options));
    }

    parse_nodes(line, allow_linebreak, options = {}) {
        options = merge_objects(DEFAULT_OPTIONS, options);

        let nodes = [];
        let index = 0;

        let word = "";

        while (index < line.length) {
            let char = line[index];

            let result;
            if (char === "\\" && options.allow_escape) {
                if (result = line.substr(index).match(ESCAPED_UNICODE)) {
                    let code = result[1];
                    if (!code) code = result[2];
                    if (!code) code = result[3];

                    code = parseInt(code, 16);
                    word += String.fromCharCode(code);

                    index += result[0].length;
                    continue;
                } else {
                    if (index + 1 < line.length) {
                        word += line[index + 1];
                        index++;
                    } else {
                        word += char;
                    }
                }
            } else if (char === "<" &&
                ((result = line.substr(index).match(INLINE_HTML_BR_REGEX))
                    || (options.inline_html_block && (result = line.substr(index).match(INLINE_HTML_SKIP_REGEX)))
                    || (result = line.substr(index).match(/^\<!--.*--\>/)))) {
                if (result[1] === "br" || result[2] === "br") {
                    word = push_text_if_present(word, nodes);
                    if (allow_linebreak) {
                        nodes.push(md.LINEBREAK);
                    }
                    index += result[0].length;
                } else if (result[0].startsWith("<!--")) {
                    index += result[0].length;
                } else {
                    word += result[0];
                    index += result[0].length - 1;
                }
            } else if (char === "`" && (result = try_parse_inline_code(line, index))) {
                // Inline code
                word = push_text_if_present(word, nodes);
                nodes.push(result.el);
                index += result.skip;
                continue;
            } else if (options.latex && char === "$" && (result = try_parse_tag(line, index, "$", 1))) {
                // Inline Latex
                word = push_text_if_present(word, nodes);
                nodes.push(new md.InlineLatex(result.tag, false));
                index += result.skip;
                continue;
            } else if (char === " " && line[index + 1] === " " && line[index + 2] === "\n" && allow_linebreak) {
                // Linebreak!
                word = push_text_if_present(word, nodes);
                nodes.push(md.LINEBREAK);

                index += 3;
                continue;
            } else if (char === "\n") {
                if (options.newline_as_linebreaks) {
                    word = push_text_if_present(word, nodes);
                    nodes.push(md.LINEBREAK);
                } else {
                    word += " ";
                }
            } else if (char === "!" && (result = try_parse_link(line, index + 1))) {
                // Image
                word = push_text_if_present(word, nodes);

                let alt = result.title;

                nodes.push(new md.Image(result.url, alt, result.tooltip, result.ref_name));

                index += result.skip + 1;
                continue;
            } else if (char === "[" && options.link && (result = try_parse_link(line, index))) {
                // Link
                word = push_text_if_present(word, nodes);

                let title = this.parse_nodes(result.title, false);

                nodes.push(new md.Link(result.url, title, result.tooltip, result.ref_name));

                index += result.skip;
                continue;
            } else if (char === "|" && options.spoiler && (result = try_parse_tag(line, index, "|", 2))) {
                // Spoiler
                word = push_text_if_present(word, nodes);

                let content = this.parse_nodes(result.tag, false);
                nodes.push(new md.Spoiler(content));

                index += result.skip;
                continue;
            } else if (char === "~" && (result = try_parse_tag(line, index, "~", 2))) {
                // Strikethrough
                word = push_text_if_present(word, nodes);

                let content = this.parse_nodes(result.tag, true);
                nodes.push(new md.Strikethrough(content));

                index += result.skip;
                continue;
            } else if (char === "*" && (result = try_parse_possible_tags(line, index, "*", 2))) {
                // Bold or italic
                word = push_text_if_present(word, nodes);

                let content = this.parse_nodes(result.tag, true);
                if (result.delimiter_repeat === 2)
                    nodes.push(new md.Bold(content));
                else
                    nodes.push(new md.Italic(content));

                index += result.skip;
                continue;
            } else if (char === "_" && (result = try_parse_possible_tags(line, index, "_", 2))) {
                // Underline or italic
                word = push_text_if_present(word, nodes);

                let content = this.parse_nodes(result.tag, true);
                if (result.delimiter_repeat === 2)
                    if (options.underline) {
                        nodes.push(new md.Underline(content));
                    } else {
                        nodes.push(new md.Bold(content)); // In the true Markdown standard it's bold, but personally I prefer underline.
                    }
                else
                    nodes.push(new md.Italic(content));

                index += result.skip;
                continue;
            } else if (options.highlight && char === "=" && (result = try_parse_tag(line, index, "=", 2))) {
                // Highlight
                word = push_text_if_present(word, nodes);

                let content = this.parse_nodes(result.tag, true);
                nodes.push(new md.Highlight(content));

                index += result.skip;
                continue;
            } else {
                word += char;
            }

            index++;
        }

        push_text_if_present(word, nodes);

        // Checks for a linebreak if allowed.
        if (allow_linebreak && line.endsWith("  ")) {
            nodes.push(md.LINEBREAK);
        }
        return nodes;
    }
}

export default MarkdownParser = new MarkdownParser();
