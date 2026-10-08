import {describe, expect, it} from 'bun:test';
import {id, SQL} from '@triptease/sql-template';
import {unsafe, type UnsafeSQL} from '@triptease/sql-template-postgres';

function recorder(): UnsafeSQL & {calls: [string, unknown[] | undefined][]} {
    const calls: [string, unknown[] | undefined][] = [];
    return {
        calls,
        unsafe(text: string, values?: unknown[]) {
            calls.push([text, values]);
            return Promise.resolve([{ok: true}]);
        }
    };
}

describe('unsafe (Bun.sql)', () => {
    it('passes the statement text and values to sql.unsafe', async () => {
        const sql = recorder();
        const rows = await unsafe(sql, SQL`select * from ${id('users')} where name = ${'dan'} and age = ${3}`);
        expect(rows).toEqual([{ok: true}]);
        expect(sql.calls).toEqual([['select * from "users" where name = $1 and age = $2', ['dan', 3]]]);
    });

    it('converts arrays to postgres array literals and Dates to ISO strings', async () => {
        const sql = recorder();
        const date = new Date('2024-01-02T03:04:05.678Z');
        await unsafe(sql, SQL`select ${[1, 2]}, ${['a"b', 'c,d', null]}, ${date}, ${[date]}`);
        expect(sql.calls[0]![1]).toEqual(['{"1","2"}', '{"a\\"b","c,d",NULL}', '2024-01-02T03:04:05.678Z', '{"2024-01-02T03:04:05.678Z"}']);
    });

    it('converts bigints to strings (like pg) so values outside the int8 range work', async () => {
        const sql = recorder();
        await unsafe(sql, SQL`select ${12345678901234567890n}, ${-1n}, ${[1n, 2n]}`);
        expect(sql.calls[0]![1]).toEqual(['12345678901234567890', '-1', '{"1","2"}']);
    });

    it('passes everything else through unchanged', async () => {
        const sql = recorder();
        const object = {a: 1};
        const bytes = new Uint8Array([1, 2]);
        await unsafe(sql, SQL`select ${null}, ${object}, ${bytes}, ${'s'}, ${true}`);
        const values = sql.calls[0]![1]!;
        expect(values).toEqual([null, object, bytes, 's', true]);
        expect(values[1]).toBe(object);
        expect(values[2]).toBe(bytes);
    });

    it('is type compatible with Bun.sql, transactions and reserved connections', () => {
        const accepts = (_: UnsafeSQL) => true;
        // type level only: these must compile
        const check = (sql: Bun.SQL, tx: Bun.TransactionSQL, reserved: Bun.ReservedSQL) => accepts(sql) && accepts(tx) && accepts(reserved);
        expect(typeof check).toEqual('function');
    });
});
