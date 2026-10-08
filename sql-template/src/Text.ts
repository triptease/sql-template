import {Expression, kind, kindOf} from "./Expression.js";

export interface Text {
    readonly [kind]: 'text';
}

/** Raw SQL, inserted verbatim without any escaping. */
export class Text extends Expression {
    readonly text: string;

    constructor(text: string) {
        super();
        if (typeof text !== 'string') throw new TypeError(`Text must be a string but was ${typeof text}`);
        this.text = text;
        if (new.target === Text) Object.freeze(this);
    }
}

Object.defineProperty(Text.prototype, kind, {value: 'text'});

export function isText(value: unknown): value is Text {
    return kindOf(value) === 'text';
}

/** Raw SQL, inserted verbatim without any escaping (*use with care*). */
export function text(text: string): Text {
    return new Text(text);
}

export const raw: typeof text = text;
