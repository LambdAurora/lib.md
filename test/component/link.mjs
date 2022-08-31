import { default as md } from "../../lib/index.mjs";

const LINK_TEST = "https://lambdaurora.dev";

let parsed_document = md.parser.parse(LINK_TEST, { auto_link: true });

console.log(parsed_document.blocks[0]);
