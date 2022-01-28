export type SimpleObject = { [key: string]: any };

export interface SqlClient {
    query(template: SqlTemplate): Promise<SimpleObject[]>;
}

export interface SqlTemplate {
    readonly text: string;
    readonly values: ReadonlyArray<any>;
}

export function isSqlTemplate(value: any): value is SqlTemplate {
    return value && typeof value['text'] === 'string' && Array.isArray(value['values']);
}

export function sqlTemplate(text: string, values: ReadonlyArray<any>): SqlTemplate {
    return {text, values}
}

