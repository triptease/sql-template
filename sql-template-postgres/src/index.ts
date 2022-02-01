import {Client, QueryConfig} from "pg";
import {BinaryLike, createHash, randomBytes} from 'crypto';
import {Expression, Identifier, Template, Text, Value} from '@triptease/sql-template';

const escapeIdentifier = Client.prototype.escapeIdentifier;
const escapeLiteral = Client.prototype.escapeLiteral;

export function debugQuery(sql: Template): string {
    return sql.expressions.reduce((a: string, e: Expression) => {
        if (e instanceof Text) return a + e.text;
        if (e instanceof Identifier) return a + escapeIdentifier(e.identifier);
        if (e instanceof Value) return a + (typeof e.value === 'string' ? escapeLiteral(e.value) : e.value);
        return a;
    }, '');
}

export function postgresSql(sql: Template): string {
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
        text: postgresSql(template),
        values: template.expressions.flatMap(e => e instanceof Value ? [e.value] : [])
    }
}

function hashSHA256(value: BinaryLike): string {
    return createHash('sha256').update(value).digest('hex');
}

export function prepareStatement(template: Template, name?: string): QueryConfig {
    const {text, values} = statement(template);
    return {
        name: name ?? `urn:hash::sha256:${hashSHA256(text)}`,
        text,
        values
    }
}



