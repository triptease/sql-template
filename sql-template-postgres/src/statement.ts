import {createHash} from 'node:crypto';
import {type Expression, type Identifier, kindOf, type Template, type Text, type Value} from '@triptease/sql-template';
import {arrayLiteral, escapeIdentifier, escapeLiteral, hex} from './escape.js';

/** Structurally compatible with pg's `QueryConfig`, so pg is not a dependency. */
export interface QueryConfig {
    text: string;
    values: unknown[];
    name?: string;
}

/** @internal Renders a template, escaping identifiers and delegating values. Throws on anything it does not understand. */
function render(template: Template, renderValue: (value: unknown) => string): string {
    let sql = '';
    const visit = (e: Expression): void => {
        const kind = kindOf(e);
        switch (kind) {
            case 'text': {
                const text = (e as Text).text;
                if (typeof text !== 'string') throw new TypeError('Text expression without a string');
                sql += text;
                return;
            }
            case 'identifier':
                sql += escapeIdentifier((e as Identifier).identifier);
                return;
            case 'value':
                sql += renderValue((e as Value).value);
                return;
            case 'template':
                for (const child of (e as Template).expressions) visit(child);
                return;
            default:
                throw new TypeError(kind === undefined
                    ? `Not an Expression: ${e === null ? 'null' : typeof e}`
                    : `Unsupported expression kind: ${kind}`);
        }
    };
    visit(template);
    return sql;
}

/** Converts a DB agnostic template into a postgres statement (`$1`, `$2`, ... placeholders plus values). */
export function statement(template: Template): QueryConfig {
    const values: unknown[] = [];
    const text = render(template, value => '$' + values.push(value));
    return {text, values};
}

function hashSHA256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
}

/** Like `statement` but named, so postgres prepares it. The default name is derived from the SQL text. */
export function prepareStatement(template: Template, name?: string): Required<QueryConfig> {
    const {text, values} = statement(template);
    return {
        name: name ?? hashSHA256(text).slice(0, 63),
        text,
        values
    };
}

function numberLiteral(value: number | bigint): string {
    if (typeof value === 'number' && !Number.isFinite(value)) return `'${value}'`; // 'NaN', 'Infinity', '-Infinity'
    const text = String(value);
    // parenthesise negatives so that e.g. `1 -${-1}` cannot become a `--` comment
    return text.startsWith('-') ? `(${text})` : text;
}

/** @internal Renders a value as an escaped postgres literal. */
function literal(value: unknown): string {
    if (value === null || value === undefined) return 'NULL';
    switch (typeof value) {
        case 'string':
            return escapeLiteral(value);
        case 'number':
        case 'bigint':
            return numberLiteral(value);
        case 'boolean':
            return value ? 'TRUE' : 'FALSE';
        case 'object':
            if (value instanceof Date) return escapeLiteral(value.toISOString());
            if (ArrayBuffer.isView(value)) return `'\\x${hex(value)}'::bytea`;
            if (Array.isArray(value)) return escapeLiteral(arrayLiteral(value));
            return escapeLiteral(JSON.stringify(value));
        default:
            throw new TypeError(`Cannot render a ${typeof value} as SQL`);
    }
}

/**
 * Renders the template as a single SQL string with every value inlined as an escaped literal.
 * Intended for logging/debugging: prefer `statement`/`prepareStatement` (bound parameters) for execution,
 * as inlined literals can be typed differently by postgres (e.g. arrays become text array literals).
 */
export function debugQuery(template: Template): string {
    return render(template, literal);
}
