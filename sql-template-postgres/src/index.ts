import {SqlClient, SqlTemplate, SimpleObject, sqlTemplate} from '@triptease/sql-template';
import {compose} from '@triptease/sql-template/CompositeTemplate';
import {Client, Pool, PoolConfig} from "pg";

export class PostgresClient implements SqlClient {
    private pool: Pool;

    constructor(connectionDetails: PoolConfig, private logger = (sql: string) => console.log('PostgresClient.query', sql)) {
        this.pool = new Pool(connectionDetails);
    }

    async query(sqlFragment: SqlTemplate): Promise<SimpleObject[]> {
        const client = await this.pool.connect();
        try {
            const sql = postgresText(sqlFragment);
            this.logger(sql);
            const {rows} = await client.query(sql, [...sqlFragment.values]);
            return rows;
        } finally {
            client.release();
        }
    }

    async close() {
        return this.pool.end();
    }
}

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

export const escapeIdentifier = Client.prototype.escapeIdentifier;
export const escapeLiteral = Client.prototype.escapeLiteral;

export function id(identifier: string): SqlTemplate {
    return sqlTemplate(escapeIdentifier(identifier), []);
}

export function ids(identifiers: string[]): SqlTemplate {
    return compose(identifiers.map(id));
}
