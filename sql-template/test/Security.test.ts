import {afterAll, beforeAll, describe, expect, it} from 'bun:test';
import * as core from '@triptease/sql-template';
import {
    Expression, id, ids, isExpression, isIdentifier, isTemplate, isText, isValue, kind, kindOf,
    SQL, Template, template, Text, text, Value, value, values
} from '@triptease/sql-template';
import {loadDuplicateCopy} from './copy.js';

describe('separator', () => {
    it('defaults to text(", ")', () => {
        expect(values([1, 2])).toEqual(template(value(1), text(', '), value(2)));
        expect(ids(['a', 'b'])).toEqual(template(id('a'), text(', '), id('b')));
    });

    it('accepts an explicit Expression', () => {
        expect(values([1, 2], text(' OR '))).toEqual(template(value(1), text(' OR '), value(2)));
        expect(ids(['a', 'b'], SQL` || `)).toEqual(template(id('a'), text(' || '), id('b')));
    });

    it('no longer accepts a raw string (it used to be inserted as unescaped SQL)', () => {
        const userInput = "1); DROP TABLE users; --";
        expect(() => values([1, 2], userInput as unknown as Expression)).toThrow(TypeError);
        expect(() => ids(['a', 'b'], userInput as unknown as Expression)).toThrow(TypeError);
        // even a single element must not accept a bad separator silently
        expect(() => values([1], userInput as unknown as Expression)).toThrow(TypeError);
    });
});

describe('nested templates', () => {
    it('flattens recursively, including hand built Templates', () => {
        const nested = new Template([text('DELETE FROM t'), new Template([new Template([text(' WHERE id = '), value(1)])])]);
        expect(nested.expressions).toEqual([text('DELETE FROM t'), text(' WHERE id = '), value(1)]);
        expect(nested.expressions.some(isTemplate)).toBe(false);
    });

    it('removes empty text', () => {
        expect(new Template([text(''), value(1), template(text(''))]).expressions).toEqual([value(1)]);
    });

    it('rejects anything that is not an Expression', () => {
        expect(() => template('DROP TABLE users' as unknown as Expression)).toThrow(TypeError);
        expect(() => new Template([null as unknown as Expression])).toThrow(TypeError);
        expect(() => new Template([{text: 'DROP TABLE users'} as unknown as Expression])).toThrow(TypeError);
    });

    it('rejects an Expression subclass without a kind', () => {
        class Custom extends Expression {}
        expect(() => template(new Custom())).toThrow(TypeError);
    });
});

describe('immutability', () => {
    it('freezes templates, their expressions and every expression', () => {
        const t = SQL`select ${id('a')} from b where c = ${1}`;
        expect(Object.isFrozen(t)).toBe(true);
        expect(Object.isFrozen(t.expressions)).toBe(true);
        for (const e of t.expressions) expect(Object.isFrozen(e)).toBe(true);
        expect(() => (t.expressions as Expression[]).push(text('; DROP TABLE users'))).toThrow(TypeError);
        expect(() => { (t.expressions[0] as unknown as {text: string}).text = 'DROP TABLE users; --'; }).toThrow(TypeError);
        expect(() => { (t as {expressions: unknown}).expressions = []; }).toThrow(TypeError);
    });

    it('copies the array passed to the constructor', () => {
        const expressions = [text('select 1')];
        const t = new Template(expressions);
        expressions.push(text('; DROP TABLE users'));
        expect(t.expressions).toEqual([text('select 1')]);
    });

    it('still allows subclasses to add fields', () => {
        class Column extends Text {
            readonly table: string;
            constructor(name: string) {
                super(name);
                this.table = 'x';
            }
        }
        expect(new Column('a').table).toEqual('x');
        expect(isText(new Column('a'))).toBe(true);
    });
});

describe('invalid escape sequences', () => {
    it('throw instead of producing the text "undefined"', () => {
        expect(() => SQL`select '\unicode'`).toThrow(SyntaxError);
        const chunks = Object.assign([undefined as unknown as string], {raw: ['\\x']}) as TemplateStringsArray;
        expect(() => SQL(chunks)).toThrow('Invalid escape sequence in SQL template: "\\\\x"');
    });

    it('still allow valid escapes', () => {
        expect(SQL`select 'a\nb'`).toEqual(template(text("select 'a\nb'")));
    });
});

describe('expression identity', () => {
    it('is based on a Symbol.for brand', () => {
        expect(kind as symbol).toBe(Symbol.for('@triptease/sql-template/kind'));
        expect([text('a'), id('a'), value(1), template(value(1))].map(kindOf)).toEqual(['text', 'identifier', 'value', 'template']);
        expect(isText(text('a')) && isIdentifier(id('a')) && isValue(value(1)) && isTemplate(template())).toBe(true);
        expect([null, undefined, 'text', 1, {}, [], {kind: 'text'}].some(isExpression)).toBe(false);
    });

    it('cannot be forged by untrusted data such as JSON', () => {
        const forged = JSON.parse('{"text": "DROP TABLE users", "kind": "text", "__proto__": {"kind": "text"}}');
        expect(isExpression(forged)).toBe(false);
        expect(value(forged)).toEqual(new Value(forged));
        expect(isValue(value(forged))).toBe(true);
        expect(isValue(value({...text('DROP TABLE users')}))).toBe(true);
        expect(isValue(value(structuredClone(text('DROP TABLE users'))))).toBe(true);
    });

    describe('user subclasses of Expression (unsupported: they have no brand)', () => {
        class Now extends Expression {
        }

        it('are rejected by the SQL tag instead of being bound as a value', () => {
            expect(() => SQL`select ${new Now()}`).toThrow(/Now extends Expression but is not a supported kind of expression/);
        });

        it('are rejected by value() and values()', () => {
            expect(() => value(new Now())).toThrow(TypeError);
            expect(() => values([1, new Now()])).toThrow(/Now extends Expression/);
        });

        it('are rejected by template() with a message naming the subclass', () => {
            expect(() => template(text('select '), new Now())).toThrow(/Template: Now extends Expression/);
        });

        it('still allow subclasses of the built-in expressions, which inherit the brand', () => {
            class Money extends Value {
            }
            const money = new Money(5);
            expect(SQL`select ${money}`.expressions).toEqual([text('select '), money]);
            expect(kindOf(money)).toEqual('value');
        });
    });

    describe('with a duplicate copy of the package', () => {
        let copy: typeof core;
        let dispose: () => void;
        beforeAll(async () => ({module: copy, dispose} = await loadDuplicateCopy<typeof core>()));
        afterAll(() => dispose());

        it('is really a separate copy', () => {
            expect(copy.Text).not.toBe(Text);
            expect(copy.text('a') instanceof Text).toBe(false);
        });

        it('recognises expressions from the other copy', () => {
            expect(isText(copy.text('a'))).toBe(true);
            expect(copy.isIdentifier(id('a'))).toBe(true);
        });

        it('nests templates from the other copy as SQL instead of binding them as a value', () => {
            const where = copy.SQL`WHERE ${copy.id('name')} = ${'dan'}`;
            expect(SQL`DELETE FROM users ${where}`.expressions).toEqual([
                text('DELETE FROM users '), text('WHERE '), id('name'), text(' = '), value('dan')
            ]);
        });
    });
});

describe('types', () => {
    it('accept unknown values', () => {
        const input: unknown = JSON.parse('{"a": 1}');
        expect(SQL`${input}`).toEqual(template(value({a: 1})));
        expect(values([input, 1])).toEqual(template(value({a: 1}), text(', '), value(1)));
    });

    it('reject non-string identifiers and text at runtime', () => {
        expect(() => id(1 as unknown as string)).toThrow(TypeError);
        expect(() => ids([{}] as unknown as string[])).toThrow(TypeError);
        expect(() => text(null as unknown as string)).toThrow(TypeError);
    });
});
