import {Expression} from "./Expression";
import {template, Template} from "./Template";
import {text} from "./Text";

export class Identifier extends Expression {
    constructor(public identifier: string) {
        super();
    }
}

export function id(identifier: string): Identifier {
    return new Identifier(identifier);
}

export function ids(identifiers: any[], separator: string = ', '): Template {
    return template(...identifiers.flatMap((v, i) => i > 0 ? [text(separator), id(v)] : [id(v)]));
}
