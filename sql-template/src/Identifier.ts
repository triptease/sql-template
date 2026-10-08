import {Expression, kind, kindOf} from "./Expression.js";
import {template, Template} from "./Template.js";
import {text} from "./Text.js";
import {separated} from "./separated.js";

export interface Identifier {
    readonly [kind]: 'identifier';
}

/** A dynamic identifier (table, column, ...) that adapters escape. */
export class Identifier extends Expression {
    readonly identifier: string;

    constructor(identifier: string) {
        super();
        if (typeof identifier !== 'string') throw new TypeError(`Identifier must be a string but was ${typeof identifier}`);
        this.identifier = identifier;
        if (new.target === Identifier) Object.freeze(this);
    }
}

Object.defineProperty(Identifier.prototype, kind, {value: 'identifier'});

export function isIdentifier(value: unknown): value is Identifier {
    return kindOf(value) === 'identifier';
}

export function id(identifier: string): Identifier {
    return new Identifier(identifier);
}

/**
 * Multiple identifiers separated by `separator` (default `text(', ')`).
 * The separator is an Expression so any raw SQL is explicit at the call site.
 */
export function ids(identifiers: readonly string[], separator: Expression = text(', ')): Template {
    return template(...separated(identifiers.map(id), separator));
}
