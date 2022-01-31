import {SimpleObject, SqlClient, SqlTemplate} from "../../sql-template/src";
import {Pool, PoolConfig} from "pg";
import {postgresText} from "./api";

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