import {describe, it} from 'mocha';
import {expect} from 'chai';
import {text, value, SQL, spread, template} from '@triptease/sql-template';

describe('SQL', () => {
    it('text', function () {
        expect(SQL``).to.eql(template());
        expect(SQL`select 1;`).to.eql(template(text('select 1;')));
    });

    it('text and value', function () {
        expect(SQL`${1}`).to.eql(template(value(1)));
        const name = 'Dan';
        expect(SQL`select * from user where name = ${name};`).to.eql(template(
            text('select * from user where name = '),
            value(name),
            text(';')
        ));
    });

    it('does not introduce any spaces', function () {
        expect(SQL`Hello${1}SQL${2}`).to.eql(template(
            text('Hello'),
            value(1),
            text('SQL'),
            value(2),
        ));
    });

    it('handles null', function () {
        expect(SQL`SELECT * FROM users WHERE name = ${null}`).to.eql(template(
            text('SELECT * FROM users WHERE name = '),
            value(null),
        ));
    });

    it('maps undefined to null', function () {
        expect(SQL`SELECT * FROM users WHERE name = ${undefined}`).to.eql(template(
            text('SELECT * FROM users WHERE name = '),
            value(null),
        ));
    });

    it('can nest SQL expressions', function () {
        expect(SQL`SELECT * ${SQL`FROM users WHERE name = ${undefined}`}`).to.eql(template(
            text('SELECT * '),
            text('FROM users WHERE name = '),
            value(null),
        ));
    });

    it('can keep a array as a single value', function () {
        expect(SQL`${['Dan', 'Bodart']}`).to.eql(template(
            value(['Dan', 'Bodart'])
        ));
    });

    it('can spread an array into multiple values', function () {
        expect(SQL`(${spread(['Dan', 'Bodart'])})`).to.eql(template(
            text('('),
            value('Dan'),
            text(', '),
            value('Bodart'),
            text(')'),
        ));
    });
})
