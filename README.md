# lib.md

<p align="center">
	<img src="https://img.shields.io/badge/language-JS-9B599A.svg?style=flat-square" alt="JS" />
	<a href="https://raw.githubusercontent.com/LambdAurora/lib.md/main/LICENSE"><img src="https://img.shields.io/badge/license-MPL%202.0-blue.svg?style=flat-square" alt="GitHub license" /></a>
	<a href="https://jsr.io/@lambdaurora/libmd"><img src="https://jsr.io/badges/@lambdaurora/libmd?style=flat-square" alt="JSR badge" /></a>
	<img src="https://shields.io/github/v/tag/LambdAurora/lib.md?sort=semver&style=flat-square" />
	<a href="https://github.com/LambdAurora/lib.md/issues/"><img src="https://img.shields.io/github/issues/LambdAurora/lib.md.svg?style=flat-square" alt="GitHub issues" /></a>
</p>

<p align="center">
	A library offering a Markdown parser, AST, and renderer.
</p>

## Examples

Run the `deno task serve:examples` command to get access to the examples in your web browser.

The `file_render` example requires deno with `--allow-write` and `--allow-read`, and a file path to a markdown file.

[You can also visit the live Markdown previewer!](https://lambdaurora.dev/lib.md/examples/previewer)

## Usage

### Deno

Add [the library from JSR](https://jsr.io/@lambdaurora/libmd):

```shell
deno add @lambdaurora/libmd
```

Then import it:

```typescript
import * as md from "@lambdaurora/libmd";
```

### Web

Import the library using [esm.sh](https://esm.sh):

```javascript
import * as md from "https://esm.sh/jsr/@lambdaurora/libmd@2.0.0";
```
