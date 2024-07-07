/*
 * Copyright 2024 LambdAurora <email@lambdaurora.dev>
 *
 * This file is part of lib.md.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import * as html from "@lambdaurora/libhtml";
import { HtmlRenderable, Text } from "./base.ts";

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

	/**
	 * Returns whether this node is a linebreak.
	 *
	 * @returns `false` as emoji nodes cannot be linebreaks
	 */
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

	/**
	 * Returns a representation of this node suitable for JSON-serialization.
	 *
	 * @returns the representation of this node for JSON-serialization
	 */
	public override toJSON(): object {
		return {type: "emoji", content: this.content, variant: this.variant, custom: this.custom};
	}
}

export class InlineCode extends Text implements HtmlRenderable {
	/**
	 * @param content the text content
	 */
	constructor(content: string) {
		super(content);
	}

	/**
	 * Returns whether this node is a linebreak.
	 *
	 * @returns `false` as inline code nodes cannot be linebreaks
	 */
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

	/**
	 * Returns a representation of this node suitable for JSON-serialization.
	 *
	 * @returns the representation of this node for JSON-serialization
	 */
	public override toJSON(): object {
		return {type: "inline_code", content: this.content};
	}

	/**
	 * Returns this node as an HTML node.
	 *
	 * @returns the corresponding HTML node
	 */
	public as_html(): html.Element {
		return html.code([new html.Text(this.content)]);
	}
}

/**
 * Represents an inline link.
 *
 * @version 2.0.0
 * @since 1.2.0
 */
export class InlineLink extends Text implements HtmlRenderable {
	/**
	 * @param link the URL
	 */
	constructor(link: string) {
		super(link);
	}

	/**
	 * Returns whether this node is a linebreak.
	 *
	 * @returns `false` as inline link nodes cannot be linebreaks
	 */
	public override is_linebreak(): false {
		return false;
	}

	/**
	 * Returns a representation of this node suitable for JSON-serialization.
	 *
	 * @returns the representation of this node for JSON-serialization
	 */
	public override toJSON(): object {
		return {type: "inline_link", content: this.content};
	}

	/**
	 * Returns this node as an HTML node.
	 *
	 * @returns the corresponding HTML node
	 */
	public as_html(): html.Element {
		return html.a({
			attributes: {
				href: this.content
			},
			children: [this.content]
		});
	}
}
