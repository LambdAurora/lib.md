# lib.md Markdown rendering example

[_lib.md_][libmd] is a Markdown parser and renderer library written in **JavaScript**.

## Text formats

**Bold** *Italic*

**Bold *Italic***

__Underline__ ~~Strikethrough~~

## Links

[A link][libmd]

Link references are supported so you can write `[A link][libmd]` with a reference later in the document like that: `[libmd]: https://github.com/LambdAurora/lib.md`.

## Images

![random fox][foxxos]

## Quote

> Here's a quotation  
> It can be multiline

## Code

You can put inline code `inside of back ticks` or you can put a block code:

```js
import md from "../../lib/index.mjs";

fetch("./example.md")
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

        document.querySelectorAll(".spoiler_hidden").forEach(spoiler => {
            spoiler.addEventListener("click", _ => {
                spoiler.classList.remove("spoiler_hidden");
            });
        });
    })
    .catch(reason => console.error(reason));
```

## Inline HTML

You can put inline HTML inside your document:

<p align="center">
    <img src="https://img.shields.io/badge/language-JS-9B599A.svg?style=flat-square" alt="JS"></img>
    <a href="https://raw.githubusercontent.com/LambdAurora/lib.md/master/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="GitHub license"></img></a>
    <a href="https://github.com/LambdAurora/lib.md/issues/"><img src="https://img.shields.io/github/issues/LambdAurora/lib.md.svg?style=flat-square" alt="GitHub issues"></img></a>
</p>

<p align="center">
    A Markdown parser and renderer library.
</p>

## Spoiler tags

Spoiler tags are an "extension" as they are not supported in the Markdown standard.  
You can put in a spoiler tag any text and even images. ||Some text in **spoiler tag**||

||![random fox][foxxos]||

[libmd]: https://github.com/LambdAurora/lib.md "lib.md homepage"
[foxxos]: https://foxrudor.de "Visit the website!"
