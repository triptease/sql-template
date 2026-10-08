import {describe, expect, it} from 'bun:test';
import {id, SQL} from '@triptease/sql-template';
import {debugQuery} from '@triptease/sql-template-postgres';

const injection = "'); DROP TABLE users; --";

describe('debugQuery', () => {
    it('escapes identifiers and strings', () => {
        expect(debugQuery(SQL`select ${"it's"} from ${id('we"ird')}`)).toEqual(`select 'it''s' from "we""ird"`);
        expect(debugQuery(SQL`select ${injection}`)).toEqual(`select '''); DROP TABLE users; --'`);
    });

    it('renders null and undefined as NULL', () => {
        expect(debugQuery(SQL`select ${null}, ${undefined}`)).toEqual('select NULL, NULL');
    });

    it('renders booleans, numbers and bigints', () => {
        expect(debugQuery(SQL`select ${true}, ${false}, ${1.5}, ${10n}`)).toEqual('select TRUE, FALSE, 1.5, 10');
    });

    it('parenthesises negative numbers so they cannot start a -- comment', () => {
        expect(debugQuery(SQL`select 1 -${-1}, 1 -${-2n}`)).toEqual('select 1 -(-1), 1 -(-2)');
    });

    it('quotes NaN and Infinity instead of emitting bare words', () => {
        expect(debugQuery(SQL`select ${NaN}, ${Infinity}, ${-Infinity}`)).toEqual(`select 'NaN', 'Infinity', '-Infinity'`);
    });

    it('renders Dates as quoted ISO strings', () => {
        expect(debugQuery(SQL`select ${new Date('2024-01-02T03:04:05.678Z')}`)).toEqual(`select '2024-01-02T03:04:05.678Z'`);
    });

    it('renders Buffers and typed arrays as hex bytea literals', () => {
        expect(debugQuery(SQL`select ${Buffer.from([0, 1, 254, 255])}`)).toEqual(`select '\\x0001feff'::bytea`);
        expect(debugQuery(SQL`select ${new Uint8Array([39, 59])}`)).toEqual(`select '\\x273b'::bytea`);
    });

    it('renders arrays as escaped array literals (used to be inlined raw)', () => {
        // previously: select 1); DROP TABLE users; --
        expect(debugQuery(SQL`select ${['1); DROP TABLE users; --']}`)).toEqual(`select '{"1); DROP TABLE users; --"}'`);
        expect(debugQuery(SQL`select ${[injection, 'a"b', 'c\\d', null, 1, [2, 3]]}`))
            .toEqual(`select  E'{"''); DROP TABLE users; --","a\\\\"b","c\\\\\\\\d",NULL,"1",{"2","3"}}'`);
    });

    it('renders objects as escaped JSON (used to be inlined via toString)', () => {
        expect(debugQuery(SQL`select ${{a: injection}}`)).toEqual(`select '{"a":"''); DROP TABLE users; --"}'`);
        const evil = {toString: () => '1; DROP TABLE users; --'};
        expect(debugQuery(SQL`select ${evil}`)).toEqual(`select '{}'`);
    });

    it('throws for values that have no SQL representation', () => {
        expect(() => debugQuery(SQL`select ${Symbol('x')}`)).toThrow(TypeError);
        expect(() => debugQuery(SQL`select ${() => 1}`)).toThrow(TypeError);
    });
});
