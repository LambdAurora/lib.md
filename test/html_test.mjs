/*
 * Copyright © 2021 LambdAurora <aurora42lambda@gmail.com>
 *
 * This file is part of lib.md.
 *
 * Licensed under the MIT license. For more information,
 * see the LICENSE file.
 */

import { html } from '../lib/index.mjs';

let main = new html.Element('main');
main.attr('class', ['uwu', 'owo']);

main.append_child(new html.Comment("Here's a very simple comment."));

let first_paragraph = new html.Element('p');
first_paragraph.append_child(new html.Text('hello world!'));
first_paragraph.append_child(new html.Text("Let's test escaping <span>nice?</span>"));
main.append_child(first_paragraph);

console.log(main.toString());
console.log(JSON.stringify(main.toJSON(), null, '  '));
console.log(main.html());
