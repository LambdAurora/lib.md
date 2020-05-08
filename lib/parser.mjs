import * as md from "./markdown.mjs";

const SPOILER_REGEX = /\|\|(?<content>.+)\|\|/;
const LINK_REGEX = /\[(?<title>.+)\](?:(?:\((?<url>[a-z]+\:\/\/[.\S]+)(?: "(?<tooltip>[^"]+)")?\))|(?:\[(?<ref>[^\[\]]+)\]))/;
const IMAGE_REGEX = /!\[(?<name>.+)\](?:(?:\((?<url>[a-z]+\:\/\/[.\S]+)(?: "(?<tooltip>[^"]+)")?\))|(?:\[(?<ref>[^\[\]]+)\]))/;
const REFERENCE_REGEX = /^\[(?<name>[^\[\]]+)\]: (?<url>[a-z]+\:\/\/[.\S]+)(?: "(?<tooltip>[^"]+)")?$/;

const ELEMENT_OPENERS = [ "![", "[", "||", "**", "*", "~~", "__", "_" ];

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
            } else if (line.startsWith("> ")) {
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
                } else {
                    current += "\n" + line;
                }

                if (line.startsWith("```") && current_block === "code") {
                    blocks.push(current);
                    current_block = "none";
                    current = null;
                }
            } else if (line === "") {
                current_block = "none";
                if (current) {
                    blocks.push(current);
                    current = null;
                }
            } else if ((found = line.match(REFERENCE_REGEX)) !== null) {
                let name = found.groups.name;
                let url = found.groups.url;
                let tooltip = found.groups.tooltip;
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

        blocks.forEach(block => {
            // Heading
            if (block.startsWith("#")) {
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
            // Quotes
            } else if (block.startsWith("> ")) {
                let nodes = this.parse_nodes(block.replace(/> /, ""), true);
                document.push(new md.BlockQuote(nodes));
            // Block code
            } else if (block.startsWith("```")) {
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
        let is_reading_sub_nodes = false;
        let is_reading_element = false;
        let index = 0;

        let word = "";

        while (index < line.length) {
            let char = line[index];



            index++;
        }

        // Checks for a linebreak if allowed.
        if (allow_linebreak && line.endsWith("  ")) {
            nodes.push(md.LINEBREAK);
        }
        return nodes;
    }
}

export default MarkdownParser = new MarkdownParser();
