import {cpSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

/**
 * Loads a second, independent copy of the core package (as happens when it is installed twice,
 * e.g. different versions or registries), so that its classes are not `instanceof` ours.
 */
export async function loadDuplicateCopy<T>(): Promise<{module: T, dispose: () => void}> {
    const dir = mkdtempSync(join(tmpdir(), 'sql-template-copy-'));
    cpSync(join(import.meta.dir, '../../sql-template/src'), dir, {recursive: true, filter: s => !s.endsWith('.tsbuildinfo')});
    const module: T = await import(join(dir, 'index.ts'));
    return {module, dispose: () => rmSync(dir, {recursive: true, force: true})};
}
