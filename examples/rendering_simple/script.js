import { default as md, html } from "../../lib/index.mjs";
import "https://cdn.jsdelivr.net/npm/prismjs@1.24.1/prism.min.js";

fetch("./example.md")
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.text();
    })
    .then(text => {
        let doc = md.parser.parse(text, { latex: false });
        md.render(doc, document, {
            block_code: {
                highlighter: (code, language, parent) => {
                    if (Prism.languages[language]) {
                        html.parse(Prism.highlight(code, Prism.languages[language], language), parent);
                    } else {
                        parent.append_child(new html.Text(code));
                    }
                }
            },
            image: { class_name: "responsive_img" },
            spoiler: { enable: true },
            parent: document.querySelector("main")
        });

        document.querySelectorAll(".spoiler_hidden").forEach(spoiler => {
            spoiler.addEventListener("click", _ => {
                spoiler.classList.remove("spoiler_hidden");
            });
        });
    })
    .catch(reason => console.error(reason));
