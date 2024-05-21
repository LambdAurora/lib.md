import * as html from "@lambdaurora/libhtml";
import * as md from "../../mod.ts";
import katex from "https://cdn.jsdelivr.net/npm/katex@0.11.1/dist/katex.mjs"; // For inline LaTeX rendering
import EmojiConvertor from "https://cdn.jsdelivr.net/npm/emoji-js@3.6.0/lib/emoji.min.js";

declare var Prism: any;

{
	const splitter = document.getElementById("splitter")!;
	const editor = document.getElementById("editor")!;
	const preview = document.getElementById("preview")!;

	let editor_value = 50;
	const preview_value = () => 100 - editor_value;

	function apply() {
		editor.style.flexBasis = `calc(${editor_value}% - 4px)`;
		preview.style.flexBasis = `calc(${preview_value()}% - 4px)`;
	}

	apply();

	let data: null | { old_x: number; old_y: number; } = null;

	splitter.addEventListener("mousedown", e => {
		data = { old_x: e.clientX, old_y: e.clientY };
	});

	splitter.parentElement!.addEventListener("mouseup", e => {
		data = null;
	});

	splitter.parentElement!.addEventListener("mousemove", e => {
		if (!data) return;

		const delta = { x: e.clientX - data.old_x - 8, y: e.clientY - data.old_y };

		delta.x = delta.x / (editor.parentElement!.scrollWidth) * 100;

		editor_value = 50 + delta.x;
		apply();
	})
}

const markdown_preview = document.getElementById("markdown_preview")!;

const emoji_convertor = new EmojiConvertor();
emoji_convertor.img_set = "twitter";
// Hi, let's use Twemoji for the demo (https://twemoji.twitter.com/).
emoji_convertor.img_sets.twitter.path = "https://twemoji.maxcdn.com/v/latest/72x72/";
// Fix the heart emoji.
(emoji_convertor.data as any)["2764"] = emoji_convertor.data["2764-fe0f"];
delete (emoji_convertor.data as any)["2764-fe0f"];
emoji_convertor.init_colons();

let parser_options: Partial<md.parser.ParserOptions> = {
	code: {},
	emoji: {
		match: (emoji) => !emoji.is_custom() && (emoji_convertor.map as any).colons[emoji.content]
	},
	latex: true,
	link: {
		auto_link: true
	},
	meta_control: {
		newline_as_linebreaks: false
	}
};
let render_options: Partial<md.DomRenderOptions> = {
	emoji: node => {
		if (node.has_variant()) {
			return html.parse(emoji_convertor.replace_colons(`:${node.content}::skin-tone-${node.variant}:`));
		} else {
			return html.parse(emoji_convertor.replace_colons(node.toString()));
		}
	},
	footnote: {
		footnote_src_link_class: "ls_footnote_src_link"
	},
	image: { class_name: "ls_responsive_img" },
	latex: {
		katex: katex
	},
	spoiler: { enable: true },
	table: {
		process: t => {
			t.attr("class", "ls_grid_table");
		}
	},
	parent: markdown_preview
};

const textarea = document.getElementById("markdown_editor") as HTMLTextAreaElement;

class OptionCheckbox {
	private el: HTMLInputElement;

	constructor(public readonly name: string, callback: (option: OptionCheckbox) => void, should_load: boolean) {
		this.el = document.getElementById(name) as HTMLInputElement;
		this.el.addEventListener("click", () => {
			callback(this);
			this.save();
		});

		const value = window.localStorage.getItem("options." + name);
		if (value !== undefined) {
			this.set(value === "true");
			if (should_load) {
				callback(this);
			}
		}
	}

	public get(): boolean {
		return this.el.checked;
	}

	public set(value: boolean): void {
		this.el.checked = value;
	}

	public save(): void {
		window.localStorage.setItem("options." + this.name, this.get().toString());
	}
}

const checkbox_newline_as_linebreaks = new OptionCheckbox("newline_as_linebreaks", render, false);
const checkbox_indent_as_code = new OptionCheckbox("indent_as_code", render, false);

const checkbox_indent_paragraphs = new OptionCheckbox("indent_paragraphs", (option) => {
	if (option.get()) {
		document.getElementById("indent_paragraphs_style")!.innerHTML = "p { text-indent: 2em; }";
	} else {
		document.getElementById("indent_paragraphs_style")!.innerHTML = "";
	}
}, true);

{
	const text = localStorage.getItem("text");
	if (text) {
		textarea.value = text;
	}
}

textarea.addEventListener("input", render);

function render(): void {
	parser_options.meta_control!.newline_as_linebreaks = checkbox_newline_as_linebreaks.get();
	parser_options.code!.block_from_indent = checkbox_indent_as_code.get();

	localStorage.setItem("text", textarea.value);

	let start = new Date().getTime();
	let markdown_doc = md.parser.parse(textarea.value, parser_options);
	console.log(markdown_doc);
	console.log("Parsed in: " + (new Date().getTime() - start) + "ms");

	markdown_preview.innerHTML = "";
	start = new Date().getTime();
	md.render_to_dom(markdown_doc, document, render_options);

	console.log("Rendered Markdown in: " + (new Date().getTime() - start) + "ms");

	// Highlight all code blocks.
	for (const element of markdown_preview.querySelectorAll("pre code[class*='language-']")) {
		Prism.highlightElement(element);
	}

	console.log("Rendered in: " + (new Date().getTime() - start) + "ms");

	document.querySelectorAll(".spoiler_hidden").forEach(spoiler => {
		spoiler.addEventListener("click", _ => {
			spoiler.classList.remove("spoiler_hidden");
		});
	});
}

render();
