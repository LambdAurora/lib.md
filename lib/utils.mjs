/*
 * Copyright © 2020 LambdAurora <aurora42lambda@gmail.com>
 *
 * This file is part of lib.md.
 *
 * Licensed under the MIT license. For more information,
 * see the LICENSE file.
 */

export function merge_objects(source, target) {
    Object.keys(source).forEach(key => {
        if (!target[key]) {
            target[key] = source[key];
        } else if (typeof target[key] === "object")  {
            target[key] = merge_objects(source[key], target[key]);
        }
    });
    return target;
}
