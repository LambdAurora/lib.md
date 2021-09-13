import { default as md, html } from "../../lib/index.mjs";
import katex from "https://cdn.jsdelivr.net/npm/katex@0.11.1/dist/katex.mjs"; // For inline LaTeX rendering

if (Deno.args.length !== 1) {
    console.error("Please specify a file to render.");
    Deno.exit(1);
}

const markdown_path = Deno.args[0];

const decoder = new TextDecoder("utf-8");
const content = decoder.decode(await Deno.readFile(markdown_path));
let doc = md.parser.parse(content, { latex: true });

let main = html.create_element("main");
md.render_to_html(doc, {
    image: { class_name: "responsive_img" },
    spoiler: { enable: false },
    latex: {
        katex: katex
    },
    parent: main
});

let page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${markdown_path.replace(/\.md$/, "")}</title>
<link rel="stylesheet" type="text/css" href="https://lambdaurora.dev/style.css" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.11.1/dist/katex.css" integrity="sha384-bsHo4/LA+lkZv61JspMDQB9QP1TtO4IgOf2yYS+J6VdAYLVyx1c3XKcsHh0Vy8Ws" crossorigin="anonymous">
<style>
:root {
    --ls-theme-primary: #1717ef;
    --ls-theme-foreground: #444;
    --ls-theme-background: #fff;

    --ls-theme-foreground-accentuated: #4d4d4d;
    --ls-theme-background-accentuated: #f8f8f8;
}

/* Typopography */

.strikethrough {
    text-decoration: line-through;
}

.underline {
    text-decoration: underline;
}

mark {
    background-color: red;
}

blockquote {
    border-left: solid red;
    padding-left: 1em;
}

code {
    padding: .2em .4em;
    margin: 0;
    border-radius: 3px;
    font-size: 90%;
    border: 1px solid #ffffff1a !important;
    background: #222;
    color: #bebebe;

    font-family: "Menlo", Consolas, "Liberation Mono", Menlo, Courier, monospace !important;
    font-feature-settings: normal !important;
}

pre > code {
    padding: 0 !important;
    margin: 0 !important;
    border: 0px !important;
    background: #ffffff00 !important;
}

/* Images */

.responsive_img {
    width: 100%;
    max-width: 600px;
    height: auto;
}

.block_code {
    max-width: 100vw;
    overflow-x: auto;
}

pre {
    /*width: min-content;*/
    overflow-x: auto;
    background-color: #141414;
    color: #ccc;
    padding: 16px;
    line-height: 1.45;
    border: 1px solid #ffffff1a !important;
    border-radius: 3px;
}
</style>
<!--Let browser know website is optimized for mobile-->
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body>
${main.html()}
</body>
</html>
`;

const encoder = new TextEncoder();
await Deno.writeFile(markdown_path.replace(/\.md$/, ".html"), encoder.encode(page));
