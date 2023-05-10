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
