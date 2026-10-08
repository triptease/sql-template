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

/**
 * Converts the values Bun.sql binds differently from pg. Bun encodes a parameter according to the type
 * postgres infers for it, which is not known here, so some differences remain (see the README):
 * plain objects only work for json/jsonb parameters, and strings or arrays bound to json/jsonb are stored
 * as JSON strings.
 */
function bunValue(value: unknown): unknown {
    // Bun cannot bind JS arrays to array typed parameters, so send a postgres array literal like pg does
    if (Array.isArray(value)) return arrayLiteral(value);
    // Bun sends Date.toString() unless the parameter is a timestamp (always UTC, unlike pg's local time)
    if (value instanceof Date) return value.toISOString();
    // Bun binds bigints as int8, which fails outside its range (e.g. numeric); pg sends them as strings
    if (typeof value === 'bigint') return value.toString();
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
