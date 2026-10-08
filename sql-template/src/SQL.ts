import {template, Template} from "./Template.js";
import {text} from "./Text.js";
import {value} from "./Value.js";

export function SQL(chunks: TemplateStringsArray, ...values: any[]): Template {
    return template(...chunks.flatMap((chunk, index) => {
        if (index > (values.length - 1)) return [text(chunk)];
        return [text(chunk), value(values[index])];
    }));
}
