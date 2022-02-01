import {describe, it} from 'mocha';
import {expect} from 'chai';
import {id, SQL} from "@triptease/sql-template";
import {prepareStatement} from "@triptease/sql-template-postgres";

describe('prepareStatement', () => {
    it('can automatically generate a name from the SQL', function () {
        const dynamic = "user's";
        expect(prepareStatement(SQL`SELECT * FROM ${id(dynamic)} WHERE name = ${'dan'}`)).to.eql({
            name: 'urn:hash::sha256:3b2c9eed3db8e538bcee7c0d480856b984c0e16af2ac79d4a0d0e7094a6ec547',
            text: 'SELECT * FROM "user\'s" WHERE name = $1',
            values: ['dan']
        });
    });

    it('can provide name from the SQL', function () {
        const dynamic = "user's";
        expect(prepareStatement(SQL`SELECT * FROM ${id(dynamic)} WHERE name = ${'dan'}`, 'foo')).to.eql({
            name: 'foo',
            text: 'SELECT * FROM "user\'s" WHERE name = $1',
            values: ['dan']
        });
    });
});