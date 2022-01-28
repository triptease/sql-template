import {describe, it} from 'mocha';
import {expect} from 'chai';
import {raw, SQL, SqlTemplate, spread} from '@triptease/sql-template';

describe('SQL', () => {
    it('works with an empty expression', function() {
        const fragment: SqlTemplate = SQL``;
        expect(fragment.text).to.eql('');
        expect(fragment.values).to.eql([]);
    });

    it('works with no text and multiple values', function() {
        const fragment: SqlTemplate = SQL`${'a'}${'b'}`;
        expect(fragment.text).to.eql('??');
        expect(fragment.values).to.eql(['a', 'b']);
    });

    it('does not introduce any spaces', function() {
        const fragment: SqlTemplate = SQL`Hello${1}Sql${2}`;
        expect(fragment.text).to.eql('Hello?Sql?');
        expect(fragment.values).to.eql([1, 2]);
    });

    it('handles null', function() {
        const fragment: SqlTemplate = SQL`SELECT * FROM users WHERE name = ${null}`;
        expect(fragment.text).to.eql('SELECT * FROM users WHERE name = ?');
        expect(fragment.values).to.eql([null]);
    });

    it('maps undefined to null', function() {
        const fragment: SqlTemplate = SQL`SELECT * FROM users WHERE name = ${undefined}`;
        expect(fragment.text).to.eql('SELECT * FROM users WHERE name = ?');
        expect(fragment.values).to.eql([null]);
    });

    it('creates a SqlFragment from a template literal', function() {
        const fragment: SqlTemplate = SQL`SELECT * FROM users WHERE name = ${'dan'}`;
        expect(fragment.text).to.eql('SELECT * FROM users WHERE name = ?');
        expect(fragment.values).to.eql(['dan']);
    });

    it('can use a raw dynamic variable', function() {
        const dynamic = 'users';
        const fragment: SqlTemplate = SQL`SELECT * FROM ${raw(dynamic)} WHERE name = ${'dan'}`;
        expect(fragment.text).to.eql('SELECT * FROM users WHERE name = ?');
        expect(fragment.values).to.eql(['dan']);
    });

    it('can keep a array as a single value', function() {
        const fragment: SqlTemplate = SQL`${['Dan', 'Bodart']}`;
        expect(fragment.text).to.eql(`?`);
        expect(fragment.values).to.eql([['Dan', 'Bodart']]);
    });

    it('can spread an array into multiple values', function() {
        const fragment: SqlTemplate = SQL`(${spread(['Dan', 'Bodart'])})`;
        expect(fragment.text).to.eql(`($1, $2)`);
        expect(fragment.values).to.eql(['Dan', 'Bodart']);
    });

});