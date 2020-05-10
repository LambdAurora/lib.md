import * as md from "./markdown.mjs";

// TODO: remove those 3 regexes as they are unused and cannot be used.
/*const SPOILER_REGEX = /\|\|(?<content>.+)\|\|/;
const LINK_REGEX = /^\[(?<title>.+?)\](?:(?:\((?<url>[a-z]+\:\/\/[.\S]+)(?: "(?<tooltip>[^"]+)")?\))|(?:\[(?<ref>[^\[\]]+)\]))/;
const IMAGE_REGEX = /^!\[(?<alt>.+?)\](?:(?:\((?<url>[a-z]+\:\/\/[.\S]+)(?: "(?<tooltip>[^"]+)")?\))|(?:\[(?<ref>[^\[\]]+)\]))/;*/

const QUOTE_DETECTION_REGEX = /^\s*\>\s/;

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
 * @param {string} text The text to parse in.
 * @param start The tag start index.
 * @param {string} delimiter The tag delimiter (2 characters).
 * @return {string|null} Returns a string if the tag has been parsed successfully, else null.
 */
function try_parse_tag(text, start, delimiter) {
    let rest = text.substr(start);
    if (!rest.startsWith(delimiter))
        return null;

    let i;
    for (i = 2; i < rest.length; i++) {
        let result;
        if (rest[i] === "[" && (result = try_parse_link(rest, i))) {
            // Kind of sad that this link is "lostly" parsed.
            // The image check also is done here.
            i += result.skip - 1;
        } else if (rest[i] === delimiter[0] && rest[i + 1] === delimiter[1]) {
            // yay the end of the spoiler tag!
            i++;
            break;
        }
    }

    if (i >= rest.length)
        return null;

    let tag = rest.substr(2, i - 3);
    return tag;
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
        nodes.push(new md.Text(text));
    }
    return "";
}

class MarkdownParser {
    parse(string) {
        let document = new md.Document();

        // The goal is to group lines to block elements.
        let lines = string.split("\n");
        let blocks = [];

        let current_block = "none";
        let current;

        let found;

        lines.forEach(line => {
            // Heading.
            if (line.startsWith("#")) {
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
            } else if (line === "") {
                current_block = "none";
                if (current) {
                    blocks.push(current);
                    current = null;
                }
            } else if ((found = line.match(REFERENCE_REGEX)) !== null) {
                let name = found[1];
                let url = found[2];
                let tooltip = found[3];
                document.ref(name, new md.Reference(url, tooltip));
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

        // So we have our blocks, now we can parse the blocks individually.
        // Identifying which block is what is kind of easy as you just have to see what is its beginning
        // (except heading using a divider beneath it)

        blocks.forEach(block => {
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
                document.push(new md.Heading(nodes, level));
            } else if (block.match(QUOTE_DETECTION_REGEX)) {
                // Quotes
                let nodes = this.parse_nodes(block.replace(QUOTE_DETECTION_REGEX, ""), true);
                document.push(new md.BlockQuote(nodes));
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
                document.push(new md.BlockCode(code, language));
            } else {
                let nodes = this.parse_nodes(block, true);
                document.push(new md.Paragraph(nodes));
            }
        });

        return document;
    }

    parse_nodes(line, allow_linebreak) {
        let nodes = [];
        let index = 0;

        let word = "";

        while (index < line.length) {
            let char = line[index];

            let result;
            if (char === "`" && (result = try_parse_inline_code(line, index))) {
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
            } else if (char === "[" && (result = try_parse_link(line, index))) {
                // Link
                word = push_text_if_present(word, nodes);

                let title = this.parse_nodes(result.title, false);

                nodes.push(new md.Link(result.url, title, result.tooltip, result.ref_name));

                index += result.skip;
                continue;
            } else if (char === "|" && (result = try_parse_tag(line, index, "||"))) {
                // Spoiler
                word = push_text_if_present(word, nodes);

                let content = this.parse_nodes(result);
                nodes.push(new md.Spoiler(content));

                index += result.length + 4;
                continue;
            } else if (char === "~" && (result = try_parse_tag(line, index, "~~"))) {
                // Strikethrough
                word = push_text_if_present(word, nodes);

                let content = this.parse_nodes(result);
                nodes.push(new md.Strikethrough(content));

                index += result.length + 4;
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
