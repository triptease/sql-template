import type {Template} from '@triptease/sql-template';
import {arrayLiteral} from './escape.js';
import {statement} from './statement.js';

/**
 * Anything with Bun.sql's `unsafe(text, values)` method: `Bun.sql`, `new SQL(...)`,
 * the transaction in `sql.begin(tx => ...)` or a connection from `sql.reserve()`.
 * Typed structurally so that "bun" is never imported at runtime.
 */
export interface UnsafeSQL {
    unsafe(text: string, values?: unknown[]): Promise<unknown>;
}

function bunValue(value: unknown): unknown {
    // Bun cannot bind JS arrays to array typed parameters, so send a postgres array literal like pg does
    if (Array.isArray(value)) return arrayLiteral(value);
    // Bun sends Date.toString() unless the parameter is a timestamp
    if (value instanceof Date) return value.toISOString();
    return value;
}

/**
 * Runs the template with Bun.sql as a parameterised query: `await unsafe(sql, SQL\`select ...\`)`.
 * Despite the name (Bun's method for SQL text it did not build itself), every value is a bound parameter
 * and every identifier is escaped.
 */
export function unsafe<T = Record<string, unknown>[]>(sql: UnsafeSQL, template: Template): Promise<T> {
    const {text, values} = statement(template);
    return sql.unsafe(text, values.map(bunValue)) as Promise<T>;
}
