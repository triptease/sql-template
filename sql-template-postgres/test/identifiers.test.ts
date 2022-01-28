import {describe, it} from 'mocha';
import {expect} from 'chai';
import {id, ids, postgresQuery, postgresText} from "@triptease/sql-template-postgres";
import {SqlTemplate, SQL, spread} from "@triptease/sql-template";


describe('SQL', () => {
    it('supports correctly escaping identifiers', function() {
        const dynamic = "user's";
        const fragment: SqlTemplate = SQL`SELECT * FROM ${id(dynamic)} WHERE name = ${'dan'}`;
        expect(postgresText(fragment)).to.eql(`SELECT * FROM "user's" WHERE name = $1`);
        expect(fragment.values).to.eql(['dan']);
    });

    it('automatically handles arrays of identifiers', function() {
        const fragment: SqlTemplate = SQL`${ids(['first_name', 'last_name'])}`;
        expect(postgresText(fragment)).to.eql(`"first_name", "last_name"`);
        expect(fragment.values).to.eql([]);
    });

    it('automatically handles arrays and ids', function() {
        const fragment: SqlTemplate = SQL`INSERT INTO users (${ids(['first_name','last_name'])}) VALUES (${spread(['Dan', 'Bodart'])})`;
        expect(postgresText(fragment)).to.eql(`INSERT INTO users ("first_name", "last_name") VALUES ($1, $2)`);
        expect(fragment.values).to.eql(['Dan', 'Bodart']);
    });

    it('handles null', function() {
        const fragment: SqlTemplate = SQL`SELECT * FROM users WHERE name = ${null}`;
        expect(postgresQuery(fragment)).to.eql('SELECT * FROM users WHERE name = null');
    });

    it('maps undefined to null', function() {
        const fragment: SqlTemplate = SQL`SELECT * FROM users WHERE name = ${undefined}`;
        expect(postgresQuery(fragment)).to.eql('SELECT * FROM users WHERE name = null');
    });

});