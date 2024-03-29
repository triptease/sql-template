import {Expression} from "./Expression";

export class Text extends Expression {
    constructor(public readonly text: string) {
        super();
    }
}

export function text(text: string): Text {
    return new Text(text);
}

export const raw = text;
