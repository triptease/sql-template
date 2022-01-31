import {Client, QueryConfig} from "pg";
import {Text} from '@triptease/sql-template/Text';
import {Identifier} from '@triptease/sql-template/Identifier';
import {Template} from '@triptease/sql-template/Template';
import {Value} from '@triptease/sql-template/Value';

const escapeIdentifier = Client.prototype.escapeIdentifier;
const escapeLiteral = Client.prototype.escapeLiteral;

export function debugQuery(sql: Template): string {
    return sql.expressions.flatMap(e => {
        if (e instanceof Text) return [e.text];
        if (e instanceof Identifier) return [escapeIdentifier(e.identifier)];
        if (e instanceof Value) return [typeof e.value === 'string' ? escapeLiteral(e.value) : e.value]
        return [];
    }).join('');
}

export function postgresSql(sql: Template): string {
    let count = 1;
    return sql.expressions.flatMap(e => {
        if (e instanceof Text) return [e.text];
        if (e instanceof Identifier) return [escapeIdentifier(e.identifier)];
        if (e instanceof Value) return '$' + count++
        return [];
    }).join('');
}

export function query(template: Template): QueryConfig {
    return {
        text: postgresSql(template),
        values: template.expressions.flatMap(e => e instanceof Value ? [e.value] : [])
    }
}



