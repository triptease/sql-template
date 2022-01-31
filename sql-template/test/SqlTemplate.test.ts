import {describe, it} from 'mocha';
import {expect} from 'chai';
import {raw, SQL, SqlTemplate, spread, sqlTemplate} from '@triptease/sql-template';

describe('SQL', () => {
    it('works with an empty expression', function() {
        expect(SQL``).to.eql(sqlTemplate());
    });

    it('works with no text and multiple values', function() {
        expect(SQL`${'a'}${'b'}`).to.eql(sqlTemplate(
            '??',
            ['a', 'b']
        ));
    });

    it('does not introduce any spaces', function() {
        expect(SQL`Hello${1}Sql${2}`).to.eql(sqlTemplate(
            'Hello?Sql?',
            [1, 2]
        ));
    });

    it('handles null', function() {
        expect(SQL`SELECT * FROM users WHERE name = ${null}`).to.eql(sqlTemplate(
            'SELECT * FROM users WHERE name = ?',
            [null]
        ));
    });

    it('maps undefined to null', function() {
        expect(SQL`SELECT * FROM users WHERE name = ${undefined}`).to.eql(sqlTemplate(
            'SELECT * FROM users WHERE name = ?',
            [null]
        ));
    });

    it('creates a SqlFragment from a template literal', function() {
        expect(SQL`SELECT * FROM users WHERE name = ${'dan'}`).to.eql(sqlTemplate(
            'SELECT * FROM users WHERE name = ?',
            ['dan']
        ));
    });

    it('can use a raw dynamic variable', function() {
        const dynamic = 'users';
        expect(SQL`SELECT * FROM ${raw(dynamic)} WHERE name = ${'dan'}`).to.eql(sqlTemplate(
            'SELECT * FROM users WHERE name = ?',
            ['dan']));
    });

    it('can keep a array as a single value', function() {
        expect(SQL`${['Dan', 'Bodart']}`).to.eql(sqlTemplate(
            '?',
            [['Dan', 'Bodart']]
        ));
    });

    it('can spread an array into multiple values', function() {
        expect(SQL`(${spread(['Dan', 'Bodart'])})`).to.eql(sqlTemplate(
            `(?, ?)`,
            ['Dan', 'Bodart']
        ));
    });

});