import pg from "pg";
import type {QueryConfig} from "pg";
import {createHash} from 'node:crypto';
import {type Expression, Identifier, type Template, Text, Value} from '@triptease/sql-template';

const escapeIdentifier = pg.Client.prototype.escapeIdentifier;
const escapeLiteral = pg.Client.prototype.escapeLiteral;

export function debugQuery(sql: Template): string {
    return sql.expressions.reduce((a: string, e: Expression) => {
        if (e instanceof Text) return a + e.text;
        if (e instanceof Identifier) return a + escapeIdentifier(e.identifier);
        if (e instanceof Value) return a + (typeof e.value === 'string' ? escapeLiteral(e.value) : e.value);
        return a;
    }, '');
}

function toSql(sql: Template): string {
    let count = 1;
    return sql.expressions.reduce((a: string, e: Expression) => {
        if (e instanceof Text) return a + e.text;
        if (e instanceof Identifier) return a + escapeIdentifier(e.identifier);
        if (e instanceof Value) return a + '$' + count++;
        return a;
    }, '');
}

export function statement(template: Template): QueryConfig {
    return {
        text: toSql(template),
        values: template.expressions.flatMap(e => e instanceof Value ? [e.value] : [])
    }
}

function hashSHA256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
}

export function prepareStatement(template: Template, name?: string): QueryConfig {
    const {text, values} = statement(template);
    return {
        name: name ?? hashSHA256(text).slice(0, 63),
        text,
        values
    }
}



