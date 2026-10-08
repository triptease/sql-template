/**
 * Brand used to identify expressions at runtime.
 *
 * It is registered with `Symbol.for` so that expressions created by a different copy of this package
 * (e.g. a duplicated install, or a different version pulled in by an adapter) are still recognised,
 * which `instanceof` cannot do. It is a symbol rather than a string field so that untrusted data
 * (e.g. the output of `JSON.parse`) can never masquerade as an expression.
 */
export const kind: unique symbol = Symbol.for('@triptease/sql-template/kind');

/** The kinds of expression understood by adapters. Adapters must throw on anything else. */
export type Kind = 'text' | 'identifier' | 'value' | 'template';

export interface Expression {
    readonly [kind]: Kind;
}

/** Base class of all expressions. Every concrete expression defines its `kind` brand on its prototype. */
export abstract class Expression {
}

/** The kind of `value` if it is an expression (from any copy of this package), otherwise `undefined`. */
export function kindOf(value: unknown): string | undefined {
    if (typeof value !== 'object' || value === null) return undefined;
    const k: unknown = (value as { [kind]?: unknown })[kind];
    return typeof k === 'string' ? k : undefined;
}

export function isExpression(value: unknown): value is Expression {
    return kindOf(value) !== undefined;
}
