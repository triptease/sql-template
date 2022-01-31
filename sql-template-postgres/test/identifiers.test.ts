import {describe, it} from 'mocha';
import {expect} from 'chai';
import {spread, SQL} from "@triptease/sql-template";
import {id, ids, queryConfig} from "../src/api";


describe('Postgres query config', () => {

    it('supports correctly escaping identifiers', function() {
        const dynamic = "user's";
        expect(queryConfig(SQL`SELECT * FROM ${id(dynamic)} WHERE name = ${'dan'}`)).to.eql({
            text: 'SELECT * FROM "user\'s" WHERE name = $1',
            values: ['dan']
        });
    });

    it('automatically handles arrays of identifiers', function() {
        expect(queryConfig(SQL`${ids(['first_name', 'last_name'])}`)).to.eql({
            text: `"first_name", "last_name"`,
            values: []
        });
    });

    it('automatically handles arrays and ids', function() {
        const template = SQL`INSERT INTO users (${ids(['first_name', 'last_name'])}) VALUES (${spread(['Dan', 'Bodart'])})`;
        expect(queryConfig(template)).to.eql({
            text: `INSERT INTO users ("first_name", "last_name") VALUES ($1, $2)`,
            values: ['Dan', 'Bodart']
        });
    });

    it('handles null', function() {
        expect(queryConfig(SQL`SELECT * FROM users WHERE name = ${null}`)).to.eql({
            text: `SELECT * FROM users WHERE name = $1`,
            values: [null]
        });
    });

    it('maps undefined to null', function() {
        expect(queryConfig(SQL`SELECT * FROM users WHERE name = ${undefined}`)).to.eql({
            text: `SELECT * FROM users WHERE name = $1`,
            values: [null]
        });
    });

});