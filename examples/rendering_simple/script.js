import md from "../../lib/index.mjs";
import katex from "https://cdn.jsdelivr.net/npm/katex@0.11.1/dist/katex.mjs"; // For inline LaTeX rendering

fetch("./example.md")
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.text();
    })
    .then(text => {
        let doc = md.parser.parse(text, { latex: true });
        md.render(doc, document, {
            image: { class_name: "responsive_img" },
            spoiler: { enable: true },
            latex: {
                katex: katex
            },
            parent: document.querySelector("main")
        });

        document.querySelectorAll(".spoiler_hidden").forEach(spoiler => {
            spoiler.addEventListener("click", _ => {
                spoiler.classList.remove("spoiler_hidden");
            });
        });
    })
    .catch(reason => console.error(reason));
