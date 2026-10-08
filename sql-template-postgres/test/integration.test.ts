import {afterAll, beforeAll, describe, expect, it} from 'bun:test';
import pg from 'pg';
import {id, ids, SQL, type Template, values} from '@triptease/sql-template';
import {debugQuery, prepareStatement, statement} from '@triptease/sql-template-postgres';

// Runs real queries against DATABASE_URL with pg.
// Skipped locally when DATABASE_URL is unset, but required in CI.
const url = process.env.DATABASE_URL;
const ci = process.env.CI === 'true';

if (!url) {
    if (ci) {
        it('DATABASE_URL must be set in CI for the postgres integration tests', () => {
            throw new Error('DATABASE_URL is not set but CI=true: the postgres integration tests are required in CI');
        });
    } else {
        console.warn('Skipping postgres integration tests: set DATABASE_URL (e.g. postgres://postgres:postgres@localhost:5432/postgres) to run them');
    }
}

type Row = Record<string, unknown>;

const injection = `'); DROP TABLE users; --`;
const nasty = `it's a "quoted" \\back\\slash\\' ${injection}`;

describe.skipIf(!url)('postgres integration (pg)', () => {
    let pool: pg.Pool;
    const run = async (template: Template): Promise<Row[]> => (await pool.query(statement(template))).rows;
    const raw = async (text: string): Promise<Row[]> => (await pool.query(text)).rows;

    const table = `we"ird 'table ${process.pid}`;
    const column = `col"umn 'name`;

    beforeAll(async () => {
        pool = new pg.Pool({connectionString: url, max: 2});
        await run(SQL`DROP TABLE IF EXISTS ${id(table)}`);
        await run(SQL`CREATE TABLE ${id(table)} (${id(column)} text, n int)`);
    });

    afterAll(async () => {
        try {
            await run(SQL`DROP TABLE IF EXISTS ${id(table)}`);
        } finally {
            await pool.end();
        }
    });

    it('escapes identifiers and binds strings with quotes and backslashes', async () => {
        await run(SQL`INSERT INTO ${id(table)} (${ids([column, 'n'])}) VALUES (${values([nasty, 1])})`);
        await run(SQL`INSERT INTO ${id(table)} (${ids([column, 'n'])}) VALUES (${values([injection, 2])})`);
        const rows = await run(SQL`SELECT ${id(column)} AS v FROM ${id(table)} ORDER BY n`);
        expect(rows.map(r => r.v)).toEqual([nasty, injection]);
    });

    it('binds null', async () => {
        expect(await run(SQL`SELECT ${null}::text AS v, ${undefined}::int AS w`)).toEqual([{v: null, w: null}]);
    });

    it('supports IN via values()', async () => {
        const rows = await run(SQL`SELECT x FROM generate_series(1, 5) x WHERE x IN (${values([1, 3, 5])}) ORDER BY x`);
        expect(rows.map(r => r.x)).toEqual([1, 3, 5]);
    });

    it('supports = any() with an int array', async () => {
        const rows = await run(SQL`SELECT x FROM generate_series(1, 5) x WHERE x = any(${[2, 4]}::int[]) ORDER BY x`);
        expect(rows.map(r => r.x)).toEqual([2, 4]);
    });

    it('supports text arrays with quotes, commas, backslashes and nulls', async () => {
        const array = ['a"b', 'c,d', 'e\\f', "g'h", null, '{}', 'NULL'];
        const rows = await run(SQL`SELECT unnest(${array}::text[]) AS v`);
        expect(rows.map(r => r.v)).toEqual(array);
    });

    it('binds Dates', async () => {
        const date = new Date('2024-01-02T03:04:05.678Z');
        const [row] = await run(SQL`SELECT ${date}::timestamptz AS v, extract(epoch from ${date}::timestamptz)::float8 AS e`);
        expect((row!.v as Date).toISOString()).toEqual(date.toISOString());
        expect(row!.e).toEqual(date.getTime() / 1000);
    });

    it('binds bytea', async () => {
        const bytes = Buffer.from([0, 1, 39, 92, 254, 255]);
        const [row] = await run(SQL`SELECT ${bytes}::bytea AS v, encode(${bytes}::bytea, 'hex') AS h`);
        expect(Buffer.from(row!.v as Uint8Array)).toEqual(bytes);
        expect(row!.h).toEqual('0001275cfeff');
    });

    it('binds objects as jsonb', async () => {
        const object = {text: nasty, list: [1, 2], nested: {ok: true}};
        const [row] = await run(SQL`SELECT ${object}::jsonb AS v, ${object}::jsonb ->> 'text' AS t`);
        expect(row).toEqual({v: object, t: nasty});
    });

    it('binds JSON strings and arrays as jsonb via ::text::jsonb', async () => {
        const [row] = await run(SQL`SELECT ${JSON.stringify({a: [1, 2]})}::text::jsonb AS o, ${JSON.stringify([1, 'b'])}::text::jsonb AS a`);
        expect(row).toEqual({o: {a: [1, 2]}, a: [1, 'b']});
    });

    it('binds bigints, including values outside the int8 range', async () => {
        const [row] = await run(SQL`SELECT ${12345678901234567890n}::numeric::text AS n, ${9007199254740993n}::int8::text AS i, ${-5n}::int4 AS s`);
        expect(row).toEqual({n: '12345678901234567890', i: '9007199254740993', s: -5});
    });

    describe('debugQuery output gives the same results as the bound statement', () => {
        const cases: [string, Template][] = [
            ['strings', SQL`SELECT ${nasty}::text AS v`],
            ['null', SQL`SELECT ${null}::text AS v`],
            ['numbers', SQL`SELECT ${42}::int AS a, ${-1}::int AS b, ${1.5}::float8 AS c, 1 -${-1} AS d`],
            ['non finite numbers', SQL`SELECT ${NaN}::float8::text AS a, ${Infinity}::float8::text AS b, ${-Infinity}::float8::text AS c`],
            ['booleans', SQL`SELECT ${true}::bool AS a, ${false}::bool AS b`],
            ['Dates', SQL`SELECT ${new Date('2024-01-02T03:04:05.678Z')}::timestamptz AS v`],
            ['bytea', SQL`SELECT encode(${Buffer.from([0, 39, 92, 255])}::bytea, 'hex') AS v`],
            ['arrays', SQL`SELECT ${['a"b', 'c,d', 'e\\f', null, injection]}::text[]::text AS v`],
            ['nested arrays', SQL`SELECT ${[[1, 2], [3, 4]]}::int[]::text AS v`],
            ['objects', SQL`SELECT ${{text: nasty}}::jsonb AS v`],
            ['bigints', SQL`SELECT ${12345678901234567890n}::numeric::text AS v`],
            ['identifiers', SQL`SELECT 1 AS ${id(`a"b'c`)}`],
        ];
        for (const [description, template] of cases) {
            it(description, async () => {
                const expected = await run(template);
                expect(await raw(debugQuery(template))).toEqual(expected);
            });
        }
    });

    it('runs prepared statements', async () => {
        const connection = await pool.connect();
        try {
            const template = SQL`SELECT ${'dan'}::text AS name, ${1}::int AS n`;
            const prepared = prepareStatement(template);
            expect((await connection.query(prepared)).rows).toEqual([{name: 'dan', n: 1}]);
            expect((await connection.query(prepareStatement(SQL`SELECT ${'bob'}::text AS name, ${2}::int AS n`))).rows).toEqual([{name: 'bob', n: 2}]);
            const statements = await connection.query(statement(SQL`SELECT statement FROM pg_prepared_statements WHERE name = ${prepared.name}`));
            expect(statements.rows).toEqual([{statement: prepared.text}]);
        } finally {
            connection.release();
        }
    });
});
