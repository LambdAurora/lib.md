import md from "../../lib/index.mjs";
import katex from "https://cdn.jsdelivr.net/npm/katex@0.11.1/dist/katex.mjs"; // For inline LaTeX rendering

const markdown_preview = document.getElementById("markdown_preview");

let parser_options = {
    latex: true,
    newline_as_linebreaks: false
};
let render_options = {
    image: { class_name: "responsive_img" },
    latex: {
        katex: katex
    },
    spoiler: { enable: true },
    parent: markdown_preview
};

const textarea = document.getElementById("markdown_editor");
const checkbox_newline_as_linebreaks = document.getElementById("newline_as_linebreaks");
const checkbox_indent_as_code = document.getElementById("indent_as_code");

if (localStorage.getItem("text")) {
    textarea.value = localStorage.getItem("text");
}

textarea.addEventListener("input", render);
checkbox_newline_as_linebreaks.addEventListener("click", render);
checkbox_indent_as_code.addEventListener("click", render);

function render() {
    parser_options.newline_as_linebreaks = checkbox_newline_as_linebreaks.checked;
    parser_options.code_block_from_indent = checkbox_indent_as_code.checked;

    localStorage.setItem("text", textarea.value);

    let start = new Date().getTime();
    let markdown_doc = md.parser.parse(textarea.value, parser_options);
    console.log("Parsed in: " + (new Date().getTime() - start) + "ms");
    markdown_preview.innerHTML = "";
    start = new Date().getTime();
    md.render(markdown_doc, document, render_options);

    console.log("Rendered in: " + (new Date().getTime() - start) + "ms");

    document.querySelectorAll(".spoiler_hidden").forEach(spoiler => {
        spoiler.addEventListener("click", _ => {
            spoiler.classList.remove("spoiler_hidden");
        });
    });
}

document.querySelector("#pdf_export").addEventListener("click", button => {
    console.log(markdown_preview);
    let opt = {
        margin:      1,
        filename:    "preview.pdf",
        pagebreak:   { mode: ["avoid-all", "css"], avoid: [".katex-display"] },
        image:       { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF:       { unit: "in", format: "letter", orientation: "portrait" }
    };
    html2pdf(markdown_preview, opt).save();
});

render();
