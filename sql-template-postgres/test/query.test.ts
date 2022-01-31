import {describe, it} from 'mocha';
import {expect} from 'chai';
import {id, ids, spread, SQL} from "@triptease/sql-template";
import {query} from "@triptease/sql-template-postgres";

describe('query', () => {
    it('supports correctly escaping identifiers', function() {
        const dynamic = "user's";
        expect(query(SQL`SELECT * FROM ${id(dynamic)} WHERE name = ${'dan'}`)).to.eql({
            text: 'SELECT * FROM "user\'s" WHERE name = $1',
            values: ['dan']
        });
    });

    it('automatically handles arrays of identifiers', function() {
        expect(query(SQL`${ids(['first_name', 'last_name'])}`)).to.eql({
            text: `"first_name", "last_name"`,
            values: []
        });
    });

    it('automatically handles arrays and ids', function() {
        const template = SQL`INSERT INTO users (${ids(['first_name', 'last_name'])}) VALUES (${spread(['Dan', 'Bodart'])})`;
        expect(query(template)).to.eql({
            text: `INSERT INTO users ("first_name", "last_name") VALUES ($1, $2)`,
            values: ['Dan', 'Bodart']
        });
    });
});