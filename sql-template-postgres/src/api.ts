import {sqlTemplate, SqlTemplate} from "../../sql-template/src";
import {Client} from "pg";
import {compose} from "../../sql-template/src/CompositeTemplate";

const escapeIdentifier = Client.prototype.escapeIdentifier;
const escapeLiteral = Client.prototype.escapeLiteral;

export function postgresText(sql: SqlTemplate): string {
    let count = 1;
    return sql.text.replace(/\?/g, () => `\$${count++}`);
}

// Debug only
export function postgresQuery(sql: SqlTemplate): string {
    const values = [...sql.values];
    return sql.text.replace(/\?/g, () => {
        const value = values.shift();
        if (typeof value === 'string') return escapeLiteral(value);
        return value;
    });
}
export function id(identifier: string): SqlTemplate {
    return sqlTemplate(escapeIdentifier(identifier), []);
}

export function ids(identifiers: string[]): SqlTemplate {
    return compose(identifiers.map(id));
}