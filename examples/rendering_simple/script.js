import md from "../../lib/index.mjs";

fetch("https://raw.githubusercontent.com/lapislang/reference/master/items/functions.md") // temp, should revert to ./example.md when lists are finished.
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.text();
    })
    .then(text => {
        let doc = md.parser.parse(text);
        let div = md.render(doc, document, { image: { class_name: "responsive_img" }, spoiler: { enable: true } });
        document.body.appendChild(div);

        console.log(JSON.stringify(doc, null, 2))

        document.querySelectorAll(".spoiler_hidden").forEach(spoiler => {
            spoiler.addEventListener("click", _ => {
                spoiler.classList.remove("spoiler_hidden");
            });
        });
    })
    .catch(reason => console.error(reason));
