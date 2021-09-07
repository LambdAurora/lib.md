/*
 * Copyright © 2021 LambdAurora <aurora42lambda@gmail.com>
 *
 * This file is part of lib.md.
 *
 * Licensed under the MIT license. For more information,
 * see the LICENSE file.
 */

/*
* INLINES
*/

/**
 * Escapes the given text.
 * 
 * @param {string} text the text to escape
 * @return {string} the escaped text
 */
export function escape_text(text) {
    return text
        .replaceAll(/&/g, '&amp;')
        .replaceAll(/</g, '&lt;')
        .replaceAll(/>/g, '&gt;');
}

/**
* Represents a text node.
*
* @version 1.0.0
* @since 1.0.0
*/
export class Text {
   /**
    * @param {string} content The text content.
    */
   constructor(content) {
       this.content = content;
   }

   toString() {
       return escape_text(this.content);
   }

   toJSON() {
       return this.content;
   }
}
