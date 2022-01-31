import {describe, it, Suite} from 'mocha';
import {expect} from 'chai'
import {PostgreSqlContainer, StartedPostgreSqlContainer} from 'testcontainers';
import {PostgresClient} from "../src";
import {PoolConfig} from "pg";
import {SQL} from "../../sql-template/src";
import {getDockerInfo} from "testcontainers/dist/docker/functions/get-info";

describe('Postgres Client', async function () {
    let postgres: StartedPostgreSqlContainer;
    let config: PoolConfig;
    let client: PostgresClient;
    let lastQuery: String;

    this.timeout(60_000);

    before(async function () {
        if (await isDockerAvailable()) {
            postgres = await new PostgreSqlContainer().start();
            config = {
                host: postgres.getHost(),
                port: postgres.getPort(),
                database: postgres.getDatabase(),
                user: postgres.getUsername(),
                password: postgres.getPassword(),
            };
        } else {
            this.skip();
        }
    });

    after(async () => {
        if (postgres) {
            await postgres.stop();
        }
    });

    beforeEach(() => {
        client = new PostgresClient(config, (sql) => lastQuery = sql);
    })

    afterEach(async () => {
        if (client) {
            await client.close();
        }
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

async function isDockerAvailable() {
    try {
        await getDockerInfo();
    } catch (e) {
        console.warn("Docker not available skipping tests");
        return false;
    }
    return true;
}
