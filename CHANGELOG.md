# lib.md changelog

## 1.0.0

- Initial release.

## 1.8.0

- Reworked Markdown parser options and include typescript type definition.
- Added support for custom emojis.
- Refactored emoji integration.

### 1.8.1

- Fixed newlines as line breaks being enabled by default.
- Fixed bad whitespaces inserted between 2 HTML elements which can cause spacing issues in some cases.

### 1.8.2

- Fix spacing between inline elements.

### 1.8.3

- Fix image parsing throwing when the alt text is empty.

## 1.9.0

- Improve comment parsing to be more reliable.
- Added disallowed HTML tags options in parser.
- Made HTML inline parsing slightly smarter, but still not fully fixed.

### 1.9.1

- Fixed the `mod.d.ts` file.

### 1.9.2

- Removed the `mod.d.ts` file as it was causing issues with the Deno runtime, might come back later.

### 1.9.3

- Restored the `mod.d.ts` file. *Sighs*, I jumped the gun a tad too quickly.

### 1.9.4

- Fixed Markdown quote parsing.

### 1.9.5

- Allow support for audio HTML.

### 1.9.6

- Fixed Markdown parser infinite loop and some undefined issues when using inline HTML.

## 1.10.0

- Added footnote support.

## 2.0.0

- Rewritten in Typescript.
- Split the HTML utilities into a separate library: [lib.html](https://github.com/LambdAurora/lib.html).
- Removed the abstract parser framework.
- Split the previous `md.InlineLatex` node into two nodes: `md.InlineLatex` and `md.LatexDisplay`.
- Made Markdown hierarchy more consistent.
- `HeadingLevel` is now an enum with number values.
- Renamed `render` to `render_to_dom`.
- Improved documentation.

## 2.1.0

- Severely improved HTML parsing inside of Markdown.
- Fixed inline HTML block element name from `InlineHTML` to `InlineHtml`.
- Fixed comments being badly inserted inside documents.
- Updated lib.html.

### 2.1.1

- Fixed null tooltip handling.
- Updated lib.html.

## 2.2.0

- Added rendering options for better flexibility.
  - Added heading post processing.
  - Added highlight class name option.
  - Added link class name options.
  - Added table class name option.
- Updated lib.html.

## 2.3.0

- Added allowed attributes in inline HTML rendering option.
- Fixed bad handling of malformed image elements.

### 2.3.1

- Added a way to disable attribute sanitization in inline HTML rendering.
