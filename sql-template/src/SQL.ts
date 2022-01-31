import {compose} from "./CompositeTemplate";
import {isSqlTemplate, SqlTemplate, sqlTemplate} from "./api";

const placeholder = `?`;

function calculateAdditionalText(value: any): string {
    if (isSqlTemplate(value)) return value.text;
    return placeholder;
}

function calculateNewValues(value: any): ReadonlyArray<any> {
    if (value === undefined) return [null];
    if (isSqlTemplate(value)) return value.values;
    return [value];
}

export function SQL(text: TemplateStringsArray, ...values: any[]): SqlTemplate {
    return text.reduce((a, t, i) => {
        if (i === values.length) return sqlTemplate(a.text + t, a.values);
        const value = values[i];
        const newText = t + calculateAdditionalText(value);
        const newValues = calculateNewValues(value);
        return sqlTemplate(a.text + newText, [...a.values, ...newValues]);
    }, sqlTemplate());
}

export function spread(values: any[]): SqlTemplate {
    return compose(values.map(v => sqlTemplate(placeholder, calculateNewValues(v))));
}

export function raw(value: string): SqlTemplate {
    return sqlTemplate(value, []);
}