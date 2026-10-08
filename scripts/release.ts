#!/usr/bin/env bun
// Builds the publishable packages into <pkg>/dist and publishes them with npm.
//
//   bun scripts/release.ts             clean build, stamp, verify and publish
//   bun scripts/release.ts --dry-run   the same, but `npm publish --dry-run` (nothing is uploaded)
//
// Registries:
//   GitHub Packages (npm.pkg.github.com)  always; authenticates with GITHUB_TOKEN
//   npmjs (registry.npmjs.org)            only when NPM_PUBLISH=true (repo variable); authenticates with
//                                         Trusted Publishing (GitHub OIDC) or NPM_TOKEN if it is set
//
// Version: 0.<git rev-list --count HEAD>.<GITHUB_RUN_NUMBER or UTC timestamp>
// Tag:     latest when CI=true on master, otherwise dev
// Versions that already exist on a registry are skipped, so a partly failed run can be re-run.
import {$} from 'bun';
import {copyFile, mkdtemp, readdir, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, relative, resolve} from 'node:path';

type Json = Record<string, unknown>;
type Deps = Record<string, string>;
type Pkg = {name: string, src: string, dist: string, json: Json};

const GITHUB_PACKAGES = 'https://npm.pkg.github.com';
const NPMJS = 'https://registry.npmjs.org';

const root = resolve(import.meta.dir, '..');
const dryRun = process.argv.includes('--dry-run');
const ci = process.env.CI === 'true';

const count = (await $`git rev-list --count HEAD`.cwd(root).text()).trim();
const build = process.env.GITHUB_RUN_NUMBER || new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const version = `0.${count}.${build}`;
const branch = process.env.GITHUB_REF_NAME || (await $`git rev-parse --abbrev-ref HEAD`.cwd(root).text()).trim();
const tag = ci && branch === 'master' ? 'latest' : 'dev';
const registries = [GITHUB_PACKAGES, ...(process.env.NPM_PUBLISH === 'true' ? [NPMJS] : [])];

console.log(`version=${version} tag=${tag} branch=${branch} dry-run=${dryRun}`);
console.log(`registries: ${registries.join(' ')}${registries.includes(NPMJS) ? '' : ' (npmjs skipped: NPM_PUBLISH is not "true")'}`);

const packages = topological(await publishable());

// Clean build so dist only contains what tsc emits from src.
await $`bun run clean`.cwd(root);
await $`bun run build`.cwd(root);

for (const pkg of packages) await stage(pkg);

if (dryRun && !process.env.GITHUB_TOKEN) console.log('GITHUB_TOKEN is not set: already-published checks against GitHub Packages may fail (ignored in --dry-run)');

const npmrcDir = await mkdtemp(join(process.env.RUNNER_TEMP || tmpdir(), 'release-npmrc-'));
try {
    // npm expands ${VAR} in .npmrc itself, so the tokens are never written to disk.
    const npmrc = join(npmrcDir, '.npmrc');
    const lines: string[] = [];
    if (process.env.GITHUB_TOKEN) lines.push('//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}');
    if (process.env.NPM_TOKEN) lines.push('//registry.npmjs.org/:_authToken=${NPM_TOKEN}');
    await writeFile(npmrc, lines.join('\n') + '\n', {mode: 0o600});

    for (const registry of registries) {
        for (const pkg of packages) await publish(pkg, registry, npmrc);
    }
} finally {
    await rm(npmrcDir, {recursive: true, force: true});
}

async function publishable(): Promise<Pkg[]> {
    const workspaces = (await Bun.file(join(root, 'package.json')).json()).workspaces as string[];
    const result: Pkg[] = [];
    for (const workspace of workspaces) {
        const src = join(root, workspace);
        const json = await Bun.file(join(src, 'package.json')).json() as Json;
        if (json.private) continue;
        result.push({name: json.name as string, src, dist: resolve(src, '..', 'dist'), json});
    }
    return result;
}

function topological(pkgs: Pkg[]): Pkg[] {
    const byName = new Map(pkgs.map(p => [p.name, p]));
    const sorted: Pkg[] = [];
    const visiting = new Set<string>();
    const visit = (pkg: Pkg) => {
        if (sorted.includes(pkg)) return;
        if (visiting.has(pkg.name)) throw new Error(`dependency cycle through ${pkg.name}`);
        visiting.add(pkg.name);
        for (const dep of Object.keys(deps(pkg.json))) {
            const internal = byName.get(dep);
            if (internal) visit(internal);
        }
        sorted.push(pkg);
    };
    pkgs.forEach(visit);
    return sorted;
}

function deps(json: Json): Deps {
    return {...json.dependencies as Deps, ...json.peerDependencies as Deps, ...json.optionalDependencies as Deps};
}

async function stage(pkg: Pkg): Promise<void> {
    if (!await Bun.file(join(pkg.dist, 'index.js')).exists()) throw new Error(`${pkg.name}: ${pkg.dist}/index.js missing, build first`);
    const {devDependencies, scripts, exports, main, types, files, ...rest} = pkg.json;
    const json: Json = {
        ...rest,
        version,
        main: './index.js',
        types: './index.d.ts',
        exports: {
            '.': {types: './index.d.ts', default: './index.js'},
            './package.json': './package.json',
        },
        files: ['**/*.js', '**/*.js.map', '**/*.d.ts', 'README.md'],
    };
    for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
        const ranges = json[field] as Deps | undefined;
        if (!ranges) continue;
        json[field] = Object.fromEntries(Object.entries(ranges).map(([dep, range]) =>
            [dep, range.startsWith('workspace:') ? version : range]));
    }
    await writeFile(join(pkg.dist, 'package.json'), JSON.stringify(json, null, 2) + '\n');
    await copyFile(join(root, 'README.md'), join(pkg.dist, 'README.md'));
    if (await Bun.file(join(root, 'LICENSE')).exists()) await copyFile(join(root, 'LICENSE'), join(pkg.dist, 'LICENSE'));
    await verify(pkg);
    console.log(`staged ${pkg.name}@${version} in ${relative(root, pkg.dist)}`);
}

async function verify(pkg: Pkg): Promise<void> {
    const text = await Bun.file(join(pkg.dist, 'package.json')).text();
    if (text.includes('workspace:')) throw new Error(`${pkg.name}: dist/package.json still contains a workspace: range`);
    const json = JSON.parse(text) as Json;
    if (json.version !== version) throw new Error(`${pkg.name}: dist version ${json.version} != ${version}`);
    for (const [dep, range] of Object.entries(deps(json))) {
        if (packages.some(p => p.name === dep) && range !== version) throw new Error(`${pkg.name}: ${dep} is ${range}, expected ${version}`);
    }
    const entries = await readdir(pkg.dist, {recursive: true});
    const stray = entries.filter(f => /\.(ts|tsx)$/.test(f) && !f.endsWith('.d.ts'));
    if (stray.length) throw new Error(`${pkg.name}: unexpected source files in dist: ${stray.join(', ')}`);
}

async function publish(pkg: Pkg, registry: string, npmrc: string): Promise<void> {
    const id = `${pkg.name}@${version}`;
    const existing = await $`npm view ${id} version --registry ${registry} --userconfig ${npmrc}`.cwd(pkg.dist).quiet().nothrow();
    if (existing.exitCode === 0 && existing.text().trim() === version) {
        console.log(`skip ${id}: already on ${registry}`);
        return;
    }
    const npmjs = registry === NPMJS;
    // Provenance is only supported by npmjs; GitHub Packages publishes without it.
    const flags = [
        '--tag', tag,
        '--registry', registry,
        '--userconfig', npmrc,
        ...(npmjs ? ['--access', 'public', `--provenance=${ci}`] : ['--provenance=false']),
        ...(dryRun ? ['--dry-run'] : []),
    ];
    console.log(`publish ${id} to ${registry} (${tag})${dryRun ? ' [dry-run]' : ''}`);
    await $`npm publish ${pkg.dist} ${flags}`.cwd(pkg.dist);
}
