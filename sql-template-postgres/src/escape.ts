// escapeIdentifier and escapeLiteral are ported from node-postgres (pg/lib/utils.js),
// Copyright (c) 2010 - 2021 Brian Carlson, MIT License: https://github.com/brianc/node-postgres
// The only change is that non-string input throws instead of being coerced.

function requireString(value: unknown, what: string): string {
    if (typeof value !== 'string') throw new TypeError(`${what} must be a string but was ${value === null ? 'null' : typeof value}`);
    return value;
}

/** Quotes an identifier for Postgres, e.g. `user's "x"` -> `"user's ""x"""`. */
export function escapeIdentifier(str: string): string {
    return '"' + requireString(str, 'Identifier').replace(/"/g, '""') + '"';
}

/** Quotes a string literal for Postgres, e.g. `it's` -> `'it''s'` (uses `E'...'` when it contains backslashes). */
export function escapeLiteral(str: string): string {
    requireString(str, 'Literal');
    let hasBackslash = false;
    let escaped = "'";
    for (let i = 0; i < str.length; i++) {
        const c = str[i];
        if (c === "'") {
            escaped += c + c;
        } else if (c === '\\') {
            escaped += c + c;
            hasBackslash = true;
        } else {
            escaped += c;
        }
    }
    escaped += "'";
    if (hasBackslash) escaped = ' E' + escaped;
    return escaped;
}

/** @internal Lower-case hex of the bytes of a typed array / DataView / Buffer. */
export function hex(view: ArrayBufferView): string {
    const bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
    let result = '';
    for (const b of bytes) result += b.toString(16).padStart(2, '0');
    return result;
}

// Ported from pg/lib/utils.js (MIT, see above)
function escapeElement(element: string): string {
    return '"' + element.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

/**
 * @internal Converts a JS array to a Postgres array literal the same way pg does
 * (ported from pg/lib/utils.js arrayString, MIT), except Dates are always sent as UTC ISO strings.
 */
export function arrayLiteral(array: readonly unknown[]): string {
    return '{' + array.map(item => {
        if (item === null || item === undefined) return 'NULL';
        if (Array.isArray(item)) return arrayLiteral(item);
        if (ArrayBuffer.isView(item)) return '\\\\x' + hex(item);
        if (item instanceof Date) return escapeElement(item.toISOString());
        if (typeof item === 'object') return escapeElement(JSON.stringify(item));
        return escapeElement(String(item));
    }).join(',') + '}';
}
