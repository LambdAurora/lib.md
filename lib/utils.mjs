/*
 * Copyright © 2021 LambdAurora <aurora42lambda@gmail.com>
 *
 * This file is part of lib.md.
 *
 * Licensed under the MIT license. For more information,
 * see the LICENSE file.
 */

/**
 * Merges the properties of two objects and will keep intact the properties of the target object.
 *
 * @param {Object} source the source object
 * @param {Object} target the target object
 * @return {Object} the merged object
 */
export function merge_objects(source, target) {
    if (source === null || source === undefined) {
        return target;
    } else if (target === null || target === undefined) {
        target = {};
    }
    Object.keys(source).forEach(key => {
        if (target[key] === undefined) {
            target[key] = source[key];
        } else if (typeof target[key] === 'object')  {
            target[key] = merge_objects(source[key], target[key]);
        }
    });
    return target;
}

export function purge_inline_html(html) {
    let regex = /<\/?(?:(?:iframe)|(?:noembed)|(?:noframes)|(?:plaintext)|(?:script)|(?:style)|(?:textarea)|(?:title)|(?:xmp)).*?\>/gi;
    let current;
    while (current = regex.exec(html)) {
        html = html.substr(0, current.index) + '&lt;' + html.substr(current.index + 1);
    }
    return html;
}
