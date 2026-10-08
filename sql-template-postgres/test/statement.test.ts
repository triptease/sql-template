import {describe, expect, it} from 'bun:test';
import {id, ids, spread, SQL} from "@triptease/sql-template";
import {prepareStatement, statement} from "@triptease/sql-template-postgres";
import type pg from "pg";

describe('statement', () => {
    it('supports correctly escaping identifiers', function() {
        const dynamic = "user's";
        expect(statement(SQL`SELECT * FROM ${id(dynamic)} WHERE name = ${'dan'}`)).toEqual({
            text: 'SELECT * FROM "user\'s" WHERE name = $1',
            values: ['dan']
        });
    });

    it('automatically handles arrays of identifiers', function() {
        expect(statement(SQL`${ids(['first_name', 'last_name'])}`)).toEqual({
            text: `"first_name", "last_name"`,
            values: []
        });
    });

    it('automatically handles arrays and ids', function() {
        const template = SQL`INSERT INTO users (${ids(['first_name', 'last_name'])}) VALUES (${spread(['Dan', 'Bodart'])})`;
        expect(statement(template)).toEqual({
            text: `INSERT INTO users ("first_name", "last_name") VALUES ($1, $2)`,
            values: ['Dan', 'Bodart']
        });
    });
});
describe('QueryConfig', () => {
    it('is assignable to pg QueryConfig', () => {
        const config: pg.QueryConfig = statement(SQL`select ${1}`);
        const prepared: pg.QueryConfig = prepareStatement(SQL`select ${1}`);
        expect([config.values, prepared.values]).toEqual([[1], [1]]);
    });
});
