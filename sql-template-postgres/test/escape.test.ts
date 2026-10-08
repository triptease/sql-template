import {describe, expect, it} from 'bun:test';
import {escapeIdentifier, escapeLiteral} from '@triptease/sql-template-postgres';
import pg from 'pg';

describe('escapeIdentifier', () => {
    it('quotes and doubles quotes', () => {
        expect(escapeIdentifier('users')).toEqual('"users"');
        expect(escapeIdentifier('we"ird')).toEqual('"we""ird"');
        expect(escapeIdentifier("user's")).toEqual('"user\'s"');
    });

    it('throws on non strings', () => {
        expect(() => escapeIdentifier(1 as unknown as string)).toThrow(TypeError);
    });
});

describe('escapeLiteral', () => {
    it('quotes and doubles quotes', () => {
        expect(escapeLiteral("it's")).toEqual("'it''s'");
    });

    it('uses E strings when there are backslashes', () => {
        expect(escapeLiteral("a\\'b")).toEqual(" E'a\\\\''b'");
    });

    it('throws on non strings (pg silently returns an empty literal)', () => {
        expect(() => escapeLiteral(null as unknown as string)).toThrow(TypeError);
    });
});

describe('ported from pg', () => {
    const client = new pg.Client();
    const samples = ['', 'plain', "it's", 'we"ird', 'back\\slash', "\\'; DROP TABLE users; --", 'ünïcödé 😀', 'new\nline'];
    for (const sample of samples) {
        it(`matches pg for ${JSON.stringify(sample)}`, () => {
            expect(escapeIdentifier(sample)).toEqual(client.escapeIdentifier(sample));
            expect(escapeLiteral(sample)).toEqual(client.escapeLiteral(sample));
        });
    }
});
