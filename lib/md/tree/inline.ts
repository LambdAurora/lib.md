/*
 * Copyright 2024 LambdAurora <email@lambdaurora.dev>
 *
 * This file is part of lib.md.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Text } from "./base.ts";
import * as html from "@lambdaurora/libhtml";

/**
 * Represents skin tones of emojis.
 */
export enum EmojiSkinTones {
	LIGHT = "light",
	MEDIUM_LIGHT = "medium_light",
	MEDIUM = "medium",
	MEDIUM_DARK = "medium_dark",
	DARK = "dark"
}

/**
 * Represents an emoji.
 *
 * @version 2.0.0
 * @since 1.2.0
 */
export class Emoji extends Text {
	/**
	 * @param id the emoji's id
	 * @param variant the emoji variant id
	 * @param custom `true` if the emoji is custom, or `false` otherwise
	 */
	constructor(id: string, public variant: string | number | null = null, public custom: boolean = false) {
		super(id);
		this.variant = variant;
		this.custom = custom;
	}

	public override is_linebreak(): false {
		return false;
	}

	/**
	 * Returns whether this emoji has a variant specified.
	 *
	 * @returns `true` if this emoji has a variant, otherwise `false`
	 */
	public has_variant(): boolean {
		return this.variant !== null;
	}

	/**
	 * Returns whether this emoji is a custom emoji.
	 *
	 * @returns `true` if this emoji is custom, or `false` otherwise
	 */
	public is_custom(): boolean {
		return this.custom;
	}

	public override toString(): string {
		if (this.has_variant()) {
			const inside = super.toString() + '~' + this.variant;

			if (this.custom)
				return `:~${inside}:`;
			else
				return `:${inside}:`;
		} else
			return `:${super.toString()}:`;
	}

	public override toJSON(): object {
		return {type: "emoji", content: this.content, variant: this.variant, custom: this.custom};
	}
}

export class InlineCode extends Text {
	/**
	 * @param content the text content
	 */
	constructor(content: string) {
		super(content);
	}

	public override is_linebreak(): false {
		return false;
	}

	public override toString(): string {
		const content = super.toString();
		if (content.includes("`")) {
			return "```" + content + "```";
		} else {
			return "`" + content + "`";
		}
	}

	public override toJSON(): object {
		return {type: "inline_code", content: this.content};
	}

	public as_html(): html.Element {
		return html.create_element("code").with_child(new html.Text(this.content));
	}
}

/**
 * Represents an inline link.
 *
 * @version 2.0.0
 * @since 1.2.0
 */
export class InlineLink extends Text {
	/**
	 * @param link the URL
	 */
	constructor(link: string) {
		super(link);
	}

	public override is_linebreak(): false {
		return false;
	}

	public override toJSON(): object {
		return {type: "inline_link", content: this.content};
	}

	public as_html(): html.Element {
		return html.create_element("a").with_attr("href", this.content)
			.with_child(this.content);
	}
}
