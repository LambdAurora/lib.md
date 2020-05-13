/*
 * Copyright © 2020 LambdAurora <aurora42lambda@gmail.com>
 *
 * This file is part of lib.md.
 *
 * Licensed under the MIT license. For more information,
 * see the LICENSE file.
 */

import * as md from "./markdown.mjs";
import { merge_objects } from "./utils.mjs";

const DEFAULT_OPTIONS = {
    image: true,
    link: true,
    list: true,
    spoiler: true,
    table_of_contents: true,
    underline: true
};

// TODO: remove those 3 regexes as they are unused and cannot be used.
/*const SPOILER_REGEX = /\|\|(?<content>.+)\|\|/;
const LINK_REGEX = /^\[(?<title>.+?)\](?:(?:\((?<url>[a-z]+\:\/\/[.\S]+)(?: "(?<tooltip>[^"]+)")?\))|(?:\[(?<ref>[^\[\]]+)\]))/;
const IMAGE_REGEX = /^!\[(?<alt>.+?)\](?:(?:\((?<url>[a-z]+\:\/\/[.\S]+)(?: "(?<tooltip>[^"]+)")?\))|(?:\[(?<ref>[^\[\]]+)\]))/;*/

const LIST_DETECTION_REGEX = /^ *(-|\*|\+|(?:[0-9]+\.)) +.+/;
const QUOTE_DETECTION_REGEX = /^\s*\>\s/;
const QUOTE_MULTILINE_REGEX = /\n\s*\>\s/;

const INLINE_HTML_DETECTION_REGEX = /^\s*\<(\/)?([A-z]+).*\>/;
const INLINE_HTML_CLOSER_DETECTION_REGEX = /\<\/([A-z]+)\>.*?$/;
const INLINE_HTML_BR_REGEX = /^\<(br)(?: ?\/)?\>/;
const INLINE_HTML_SINGLE_TAG = [ "br", "aside", "audio", "b", "col", "embed", "hr", "img", "object", "param", "source", "track", "wbr" ];

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

    let i;
    let saved_i = false;
    for (i = 2; i < rest.length; i++) {
        let result;
        if (rest[i] === "[" && (result = try_parse_link(rest, i))) {
            // Kind of sad that this link is "lostly" parsed.
            // The image check also is done here.
            i += result.skip - 1;
        } else {
            let j = 0;
            while (rest[i + j] === delimiter) {
                j++;
            }
            if (j === delimiter_repeat) {
                // yay the end of the tag!
                i++;
                break;
            } else if (delimiter_repeat === 1 && j > 1) {
                if (j === 3) {
                    i += j;
                    break;
                }
                saved_i = i;
                i += j - 1;
            }
        }
    }

    if (i > rest.length) {
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

        lines.forEach(line => {
            if ((found = line.match(INLINE_HTML_DETECTION_REGEX)) || current_block === "inline_html") {
                /*if (found && !INLINE_HTML_SINGLE_TAG.includes(found[2])) {
                    if (inline_html_opener === "") {
                        inline_html_opener = found[2];
                        inline_html_opener_counter++;
                    } else if (inline_html_opener === found[2]) {
                        inline_html_opener_counter++;
                    }
                } else if (found = line.match(INLINE_HTML_CLOSER_DETECTION_REGEX)) {
                    if (found[1] === inline_html_opener) {
                        inline_html_opener_counter--;
                        if (inline_html_opener_counter < 0) {
                            current_block = "none";
                            if (current) {
                                blocks.push(current);
                                current = null;
                            }
                            return;
                        }
                    }
                }*/
                if (line === "" && inline_html_opener === "") {
                    current_block = "none";
                    if (current) {
                        blocks.push(current);
                        current = null;
                    }
                    return;
                }
                // Inline HTML
                if (current_block !== "inline_html") {
                    if (current) {
                        blocks.push(current);
                    }
                    current_block = "inline_html";
                    current = line;
                } else {
                    current += "\n" + line;
                }
            } else if (line.startsWith("```") || current_block === "code") {
                if (current_block !== "code") {
                    if (current) {
                        blocks.push(current);
                    }
                    current_block = "code";
                    current = line;
                    return;
                } else if (!line.startsWith("```")) {
                    current += "\n" + line;
                }

                if (line.startsWith("```") && current_block === "code") {
                    blocks.push(current);
                    current_block = "none";
                    current = null;

                    if (line.length > 3) {
                        current_block = "paragraph";
                        current = line.substr(3);
                    }
                }
            } else if (line.startsWith("#")) {
                // Push the heading as a block.
                blocks.push(line);
            } else if (line.match(QUOTE_DETECTION_REGEX)) {
                if (current_block !== "quote") {
                    if (current) {
                        blocks.push(current);
                    }
                    current_block = "quote";
                    current = line;
                } else {
                    current += "\n" + line;
                }
            } else if (options.list && ((found = line.match(LIST_DETECTION_REGEX)) || (current_block.startsWith("list") && line.startsWith(" ")))) {
                // List
                if (!current_block.startsWith("list")) {
                    if (current) {
                        blocks.push(current);
                    }

                    let ordered = is_list_ordered(found);

                    current_block = "list_" + (ordered ? "ordered" : "unordered");
                    current = line;
                } else {
                    // Ordered/Unordered mixing prevention.
                    if (found && line.match(/^ {2,}/) === null) {
                        let ordered = is_list_ordered(found);

                        if (current_block !== ("list_" + (ordered ? "ordered" : "unordered"))) {
                            if (current) {
                                blocks.push(current);
                            }

                            current_block = "list_" + (ordered ? "ordered" : "unordered");
                            current = line;
                            return;
                        }
                    }
                    current += "\n" + line;
                }
            } else if (line === "") {
                current_block = "none";
                if (current) {
                    blocks.push(current);
                    current = null;
                }
            } else if (options.doc && (found = line.match(REFERENCE_REGEX)) !== null) {
                let name = found[1];
                let url = found[2];
                let tooltip = found[3];
                options.doc.ref(name, new md.Reference(url, tooltip));
            } else {
                if (current_block !== "paragraph") {
                    if (current) {
                        blocks.push(current);
                    }
                    current_block = "paragraph";
                    current = line;
                } else {
                    current += "\n" + line;
                }
            }
        });

        if (current)
            blocks.push(current);

        return blocks;
    }

    parse_blocks(string, options = {}) {
        options = merge_objects(DEFAULT_OPTIONS, options);

        let blocks = this.group_blocks(string, options);

        // So we have our blocks, now we can parse the blocks individually.
        // Identifying which block is what is kind of easy as you just have to see what is its beginning
        // (except heading using a divider beneath it)

        return blocks.map(block => {
            let found;

            if (block.startsWith("#")) {
                // Heading
                let nodes = block.split(" ");
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
                nodes = this.parse_nodes(nodes.join(" "), false);
                return new md.Heading(nodes, level);
            } else if (options.list && (found = block.match(LIST_DETECTION_REGEX))) {
                // List
                // This becomes a bit difficult.
                block = block.replace(/^\s*/, ""); // Bad spaces >:C
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
                        list.push(new md.ListEntry(this.parse_blocks(raw_entry.replace(regex, "").replace(/\n */g, "\n"), options)));
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
                        parent_list.push(new md.ListEntry(this.parse_blocks(raw_entry.replace(regex, "").replace(/\n */g, "\n"), options)));
                        current[level] = parent_list.get_last();
                    }
                });

                options.list = true; // Restore the option.

                return list;
            } else if (block.match(QUOTE_DETECTION_REGEX)) {
                // Quotes
                let nodes = this.parse_nodes(block.replace(QUOTE_DETECTION_REGEX, "").replace(QUOTE_MULTILINE_REGEX, "\n"), true);
                return new md.BlockQuote(nodes);
            } else if (block.startsWith("```")) {
                // Block code
                let lines = block.split("\n");
                let language = "";
                if (lines[0].split(" ").length === 1) {
                    language = lines[0].replace(/```/, "");
                } else {
                    lines[0] = lines[0].replace(/```/, "");
                }
                let code = lines.filter(line => !line.startsWith("```")).join("\n");
                return new md.BlockCode(code, language);
            } else if (block.match(INLINE_HTML_DETECTION_REGEX)) {
                // Inline HTML
                return new md.InlineHTML(block);
            } else {
                let nodes = this.parse_nodes(block, true);
                return new md.Paragraph(nodes);
            }
        });
    }

    parse_nodes(line, allow_linebreak, options = {}) {
        options = merge_objects(DEFAULT_OPTIONS, options);

        let nodes = [];
        let index = 0;

        let word = "";

        while (index < line.length) {
            let char = line[index];

            let result;
            if (char === "<" && (result = line.substr(index).match(INLINE_HTML_BR_REGEX))) {
                if (result[1] === "br") {
                    word = push_text_if_present(word, nodes);
                    if (allow_linebreak) {
                        nodes.push(md.LINEBREAK);
                    }
                    index += result[0].length;
                }
            } else if (char === "`" && (result = try_parse_inline_code(line, index))) {
                // Inline code
                word = push_text_if_present(word, nodes);
                nodes.push(result.el);
                index += result.skip;
                continue;
            } else if (char === " " && line[index + 1] === " " && line[index + 2] === "\n" && allow_linebreak) {
                // Linebreak!
                word = push_text_if_present(word, nodes);
                nodes.push(md.LINEBREAK);

                index += 3;
                continue;
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
