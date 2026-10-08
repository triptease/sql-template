import {afterAll, beforeAll, describe, expect, it} from 'bun:test';
import * as core from '@triptease/sql-template';
import {Expression, id, kind, SQL, Template, text, value} from '@triptease/sql-template';
import {debugQuery, prepareStatement, statement} from '@triptease/sql-template-postgres';
import {loadDuplicateCopy} from './copy.js';

describe('adapter', () => {
    it('includes hand built nested Templates (they used to be dropped, losing e.g. a WHERE clause)', () => {
        const where = new Template([text(' WHERE id = '), value(1)]);
        const query = new Template([text('DELETE FROM users'), new Template([where])]);
        expect(statement(query)).toEqual({text: 'DELETE FROM users WHERE id = $1', values: [1]});
        expect(debugQuery(query)).toEqual('DELETE FROM users WHERE id = 1');
    });

    it('throws on unknown Expression kinds (they used to be silently dropped)', () => {
        class Unknown extends Expression {}
        Object.defineProperty(Unknown.prototype, kind, {value: 'unknown'});
        const query = SQL`DELETE FROM users ${new Unknown()}`;
        expect(() => statement(query)).toThrow('Unsupported expression kind: unknown');
        expect(() => prepareStatement(query)).toThrow(TypeError);
        expect(() => debugQuery(query)).toThrow(TypeError);
    });

    it('throws when given something that is not a Template', () => {
        expect(() => statement({expressions: []} as unknown as Template)).toThrow('Not an Expression: object');
    });

    it('does not inject a raw string separator', () => {
        expect(() => statement(SQL`${core.values([1, 2], '); DROP TABLE users; --' as unknown as Expression)}`)).toThrow(TypeError);
        expect(statement(SQL`${core.values([1, 2], text(' OR '))}`)).toEqual({text: '$1 OR $2', values: [1, 2]});
    });

    describe('with a duplicate copy of the core package', () => {
        let copy: typeof core;
        let dispose: () => void;
        beforeAll(async () => ({module: copy, dispose} = await loadDuplicateCopy<typeof core>()));
        afterAll(() => dispose());

        it('renders templates from the other copy (they used to become empty text and no values)', () => {
            expect(copy.Template).not.toBe(Template);
            const query = copy.SQL`SELECT * FROM ${copy.id('users')} WHERE name = ${'dan'}`;
            expect(statement(query)).toEqual({text: 'SELECT * FROM "users" WHERE name = $1', values: ['dan']});
            expect(debugQuery(query)).toEqual(`SELECT * FROM "users" WHERE name = 'dan'`);
        });

        it('renders a mix of both copies', () => {
            const query = SQL`SELECT * FROM ${id('users')} ${copy.SQL`WHERE name = ${'dan'}`}`;
            expect(statement(query)).toEqual({text: 'SELECT * FROM "users" WHERE name = $1', values: ['dan']});
        });
    });
});
