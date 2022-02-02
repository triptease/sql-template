import {describe, it} from 'mocha';
import {expect} from 'chai';
import {id, SQL} from "@triptease/sql-template";
import {prepareStatement} from "@triptease/sql-template-postgres";

describe('prepareStatement', () => {
    it('can automatically generate a name from the SQL ("An operator name is a sequence of up to NAMEDATALEN-1 (63 by default)")', function () {
        const dynamic = "user's";
        const statement = prepareStatement(SQL`SELECT * FROM ${id(dynamic)} WHERE name = ${'dan'}`);
        expect(statement).to.eql({
            name: '3b2c9eed3db8e538bcee7c0d480856b984c0e16af2ac79d4a0d0e7094a6ec54',
            text: 'SELECT * FROM "user\'s" WHERE name = $1',
            values: ['dan']
        });
        expect(statement.name?.length).to.eql(63);
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