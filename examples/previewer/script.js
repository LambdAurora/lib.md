import md from "../../lib/index.mjs";

const markdown_preview = document.getElementById("markdown_preview");

let parser_options = {
    newline_as_linebreaks: false
};
let render_options = {
    image: { class_name: "responsive_img" },
    spoiler: { enable: true },
    parent: markdown_preview
};

const textarea = document.getElementById("markdown_editor");
const checkbox_newline_as_linebreaks = document.getElementById("newline_as_linebreaks");
const checkbox_indent_as_code = document.getElementById("indent_as_code");

textarea.addEventListener("input", render);
checkbox_newline_as_linebreaks.addEventListener("click", render);
checkbox_indent_as_code.addEventListener("click", render);

function render() {
    parser_options.newline_as_linebreaks = checkbox_newline_as_linebreaks.checked;
    parser_options.code_block_from_indent = checkbox_indent_as_code.checked;
    let doc = md.parser.parse(textarea.value, parser_options);
    markdown_preview.innerHTML = "";
    md.render(doc, document, render_options);

    document.querySelectorAll(".spoiler_hidden").forEach(spoiler => {
        spoiler.addEventListener("click", _ => {
            spoiler.classList.remove("spoiler_hidden");
        });
    });
}

render();
