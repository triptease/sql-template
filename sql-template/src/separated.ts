import {type Expression, isExpression} from "./Expression.js";

/** @internal Interleaves `separator` between `expressions`. */
export function separated(expressions: readonly Expression[], separator: Expression): Expression[] {
    if (!isExpression(separator)) {
        throw new TypeError('separator must be an Expression, e.g. text(\', \') (raw strings are no longer accepted)');
    }
    return expressions.flatMap((e, i) => i > 0 ? [separator, e] : [e]);
}
