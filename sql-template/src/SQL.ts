import {template, Template} from "./Template";
import {text} from "./Text";
import {value} from "./Value";

export function SQL(chunks: TemplateStringsArray, ...values: any[]): Template {
    return template(...chunks.flatMap((chunk, index) => {
        if (index > (values.length - 1)) return [text(chunk)];
        return [text(chunk), value(values[index])];
    }));
}
