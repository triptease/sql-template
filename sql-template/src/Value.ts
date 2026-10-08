import {Expression, isExpression, kind, kindOf} from "./Expression.js";
import {template, Template} from "./Template.js";
import {text} from "./Text.js";
import {invalidExpression} from "./invalid.js";
import {separated} from "./separated.js";

export interface Value {
    readonly [kind]: 'value';
}

/** A value that adapters pass as a bound parameter. The wrapper is frozen; the wrapped value is not copied. */
export class Value extends Expression {
    readonly value: unknown;

    constructor(value: unknown) {
        super();
        this.value = value;
        if (new.target === Value) Object.freeze(this);
    }
}

Object.defineProperty(Value.prototype, kind, {value: 'value'});

export function isValue(value: unknown): value is Value {
    return kindOf(value) === 'value';
}

/**
 * Wraps `value` as a bound Value. Expressions are passed through unchanged and `undefined` becomes `null`.
 * Throws for an instance of a user subclass of Expression (subclassing Expression is not supported).
 */
export function value(value: unknown): Expression {
    if (isExpression(value)) return value;
    if (value instanceof Expression) throw invalidExpression(value, 'SQL');
    if (value === undefined) return new Value(null);
    return new Value(value);
}

/**
 * Multiple values separated by `separator` (default `text(', ')`).
 * The separator is an Expression so any raw SQL is explicit at the call site.
 */
export function values(values: readonly unknown[], separator: Expression = text(', ')): Template {
    return template(...separated(values.map(value), separator));
}

export const spread: typeof values = values;
