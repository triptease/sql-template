import {Expression} from "./Expression";
import {template, Template} from "./Template";
import {text} from "./Text";

export class Value extends Expression {
    constructor(public value: any) {
        super();
    }
}

export function value(value: any): Expression {
    if (value instanceof Expression) return value;
    if (value === undefined) return new Value(null);
    return new Value(value);
}


export function values(values: any[], separator: string = ','): Template {
    return template(...values.flatMap((v, i) => i > 0 ? [text(separator), value(v)] : [value(v)]));
}

export const spread = values;