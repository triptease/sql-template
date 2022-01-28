import {SqlTemplate} from "./api";

export class CompositeTemplate implements SqlTemplate {
    constructor(private fragments: SqlTemplate[], private joiner: string) {
    }

    get text(): string {
        return this.fragments.map(f => f.text).join(this.joiner);
    }

    get values(): ReadonlyArray<any> {
        return this.fragments.flatMap(f => f.values);
    }
}

export function compose(fragments: SqlTemplate[], joiner: string = ', '): SqlTemplate {
    return new CompositeTemplate(fragments, joiner);
}