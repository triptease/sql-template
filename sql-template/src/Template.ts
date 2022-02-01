import {Expression} from "./Expression";
import {Text} from "./Text";

export class Template extends Expression {
    constructor(public readonly expressions: ReadonlyArray<Expression>) {
        super();
    }
}

export function template(...expressions: Expression[]): Template {
    return new Template(expressions.flatMap(e => {
        if(e instanceof Text && e.text === '') return [];
        if(e instanceof Template) return e.expressions;
        return [e];
    }));
}