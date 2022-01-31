import {describe, it} from 'mocha';
import {expect} from 'chai'
import {PostgreSqlContainer, StartedPostgreSqlContainer} from 'testcontainers';
import {PostgresClient} from "../src";
import {PoolConfig} from "pg";
import {SQL} from "../../sql-template/src";

describe('Postgres Client', function() {
    this.timeout(20_000);

    let postgres: StartedPostgreSqlContainer;
    let config: PoolConfig;
    let client: PostgresClient;
    let lastQuery: String;

    before(async () => {
        postgres = await new PostgreSqlContainer().start();

        config = {
            host: postgres.getHost(),
            port: postgres.getPort(),
            database: postgres.getDatabase(),
            user: postgres.getUsername(),
            password: postgres.getPassword(),
        };
    });

    after(async () => {
        postgres.stop();
        client.close();
    });

    beforeEach(() => {
        client = new PostgresClient(config, (sql) => lastQuery = sql);
    })

    afterEach(() => {
        client.close();
    })

    it('is able to query postgres', async function () {
        let results = await client.query(SQL`SELECT * from pg_database WHERE datname=${config.database}`);
        expect(results.length).to.eql(1);
    });

    it('logs the query', async function () {
        await client.query(SQL`SELECT * from pg_database WHERE datname=${config.database}`);
        expect(lastQuery).to.eql("SELECT * from pg_database WHERE datname=$1")
    });
});