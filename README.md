# lib.md

<p align="center">
	<img src="https://img.shields.io/badge/language-JS-9B599A.svg?style=flat-square" alt="JS" />
	<a href="https://raw.githubusercontent.com/LambdAurora/lib.md/main/LICENSE"><img src="https://img.shields.io/badge/license-MPL%202.0-blue.svg?style=flat-square" alt="GitHub license" /></a>
	<img src="https://shields.io/github/v/tag/LambdAurora/lib.md?sort=semver&style=flat-square" />
	<a href="https://github.com/LambdAurora/lib.md/issues/"><img src="https://img.shields.io/github/issues/LambdAurora/lib.md.svg?style=flat-square" alt="GitHub issues" /></a>
</p>

<p align="center">
	A library offering a Markdown parser, AST, and renderer, with an HTML parser and AST included.
</p>

## Examples

Run a webserver in this directory (if you have it type `http-server . -p 8080`) then open `localhost:8080/examples/rendering_simple/` in your web browser.

The `file_render` example requires deno with `--allow-write` and `--allow-read`, and a file path to a markdown file.

[You can also visit the live Markdown previewer!](https://lambdaurora.dev/lib.md/examples/previewer)

## Use

To use the library:

```js
import { md, html } from "https://deno.land/x/libmd@v<version>/mod.mjs";
```

Hello world[^fancy name]

[^1]: Simple text
[^fancy name]: Fancy name footnote.
[^3]: Moar text
