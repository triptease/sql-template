import {Expression, isExpression, kind, kindOf} from "./Expression.js";
import {invalidExpression} from "./invalid.js";

function flatten(expressions: readonly unknown[], result: Expression[]): Expression[] {
    for (const e of expressions) {
        if (!isExpression(e)) throw invalidExpression(e, 'Template');
        const k = kindOf(e);
        if (k === 'template') flatten((e as Template).expressions, result);
        else if (k === 'text' && (e as { text?: unknown }).text === '') continue;
        else result.push(e);
    }
    return result;
}

export interface Template {
    readonly [kind]: 'template';
}

/**
 * A sequence of expressions. Construction always normalises: nested templates are flattened
 * (recursively) and empty text is removed, so adapters only ever see Text, Identifier and Value.
 * Templates are frozen.
 */
export class Template extends Expression {
    readonly expressions: ReadonlyArray<Expression>;

    constructor(expressions: ReadonlyArray<Expression>) {
        super();
        this.expressions = Object.freeze(flatten(expressions, []));
        if (new.target === Template) Object.freeze(this);
    }
}

Object.defineProperty(Template.prototype, kind, {value: 'template'});

export function isTemplate(value: unknown): value is Template {
    return kindOf(value) === 'template';
}

export function template(...expressions: Expression[]): Template {
    return new Template(expressions);
}
