import {Expression} from "./Expression.js";

/**
 * The error for something that is not a usable expression where one is required.
 * An instance of a user subclass of Expression has no `kind` brand, so no adapter could render it:
 * it is rejected rather than being bound as a value or silently dropped.
 */
export function invalidExpression(value: unknown, where: string): TypeError {
    if (value instanceof Expression) {
        return new TypeError(`${where}: ${value.constructor.name} extends Expression but is not a supported kind of expression. ` +
            `Subclassing Expression is not supported: build expressions with SQL, text, id, value or template instead`);
    }
    return new TypeError(`${where} can only contain Expressions but got ${value === null ? 'null' : typeof value}`);
}
