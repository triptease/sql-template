# Sql Template

This is yet another SQL tagged template for Typescript/Javascript

## Why another library?

* Typescript first
* Functional/Immutable
* Super simple implementation (see [SQL.ts](https://github.com/triptease/sql-template/blob/master/sql-template/src/SQL.ts))
* Full escaping of identifiers and values
* Plugable to any DB (currently Postgres via `@triptease/sql-template-postgres`, with `pg` or `Bun.sql`)
* Automatic support for prepareStatement naming (Postgres)

## Installation

```shell
npm install @triptease/sql-template @triptease/sql-template-postgres
# or
bun add @triptease/sql-template @triptease/sql-template-postgres
```

Both packages are plain ESM JavaScript with type declarations, so they work in Node and Bun.
`@triptease/sql-template` has no dependencies and `@triptease/sql-template-postgres` depends only on it
(it does not depend on `pg`; bring your own driver). In Node they can also be loaded with `require()`
(Node 20.19+/22.12+, which can `require()` ES modules).

## Usage

### Node with [pg](https://node-postgres.com/)

```typescript
import pg from "pg";
import {SQL, id, values} from "@triptease/sql-template";
import {statement, prepareStatement} from "@triptease/sql-template-postgres";

const pool = new pg.Pool();
const {rows} = await pool.query(statement(SQL`select * from ${id(table)} where name = ${name}`));
// SQL: select * from "users" where name = $1   values: ['Dan']

// named prepared statement (name defaults to a hash of the SQL)
await pool.query(prepareStatement(SQL`select * from users where id in (${values(userIds)})`));
```

### Bun with [Bun.sql](https://bun.com/docs/api/sql)

```typescript
import {sql} from "bun";
import {SQL, id} from "@triptease/sql-template";
import {unsafe} from "@triptease/sql-template-postgres";

const rows = await unsafe<User[]>(sql, SQL`select * from ${id(table)} where name = ${name}`);

// works with anything that has Bun.sql's unsafe(text, values) method
await sql.begin(tx => unsafe(tx, SQL`insert into users (name) values (${name})`));
```

Despite its name (taken from Bun's `sql.unsafe`, which runs SQL text it did not build itself), `unsafe` sends
every value as a bound parameter and escapes every identifier. To match `pg`, JS arrays are sent as postgres
array literals (so `= any(${userIds}::int[])` and `text[]` columns work) and Dates as ISO strings. The trade-off
is that an array bound directly to a `json`/`jsonb` parameter is not supported: wrap it in an object, or use
`${JSON.stringify(list)}::text::jsonb`. Pass objects (not JSON strings) for `json`/`jsonb` parameters. Statement names
are not used with Bun as it prepares and caches statements per connection automatically.

### Composing

```typescript
import {SQL, id, ids, text, values} from "@triptease/sql-template";

const where = SQL`where ${id('name')} = ${name}`;
const query = SQL`select ${ids(['id', 'name'])} from users ${where}`; // templates nest
const either = SQL`select * from users where ${values([a, b], text(' or '))}`; // explicit raw separator
```

Templates are immutable (frozen) and flat. Expressions are identified by a `Symbol.for` brand rather than
`instanceof`, so templates built by a different copy of `@triptease/sql-template` (e.g. two installed
versions) still work, while plain data (such as parsed JSON) can never be mistaken for SQL.

## Cheatsheet

### Core (@triptease/sql-template)

| function                                       | Description                                                                                 |
|------------------------------------------------|---------------------------------------------------------------------------------------------|
| `SQL`                                          | The main function to create tagged templates for SQL (*DB agnostic*)                        |
| `text` (alias `raw`)                           | Input raw SQL without any escaping (*use with care*)                                        |
| `id` / `ids(names, separator?)`                | Input dynamic identifiers into SQL (*escaped as needed*)                                    |
| `value` (optional) / `values(list, separator?)` (alias `spread`) | Input one or more values into SQL (*bound as parameters*)                 |
| `template`                                     | Combine expressions into a (flattened, frozen) template                                     |
| `isExpression` / `isText` / `isIdentifier` / `isValue` / `isTemplate` / `kindOf` | Type guards based on the expression brand (for adapters) |

`separator` is an Expression and defaults to `text(', ')`.

### Postgres (@triptease/sql-template-postgres)

| function                                       | Description                                                          |
|------------------------------------------------|----------------------------------------------------------------------|
| `statement`                                    | Converts DB agnostic `SQL` template into a postgres statement (`pg`) |
| `prepareStatement`                             | Converts DB agnostic `SQL` template into a named prepared statement (`pg`) |
| `unsafe(sql, template)`                        | Runs a template with `Bun.sql` (or a transaction / reserved connection) |
| `escapeIdentifier` / `escapeLiteral`           | Postgres identifier and string literal escaping (ported from `pg`)   |
| `debugQuery`                                   | Renders a template with values inlined, for debugging (*see below*) |

*use with care -> Used incorrectly you can open yourself up to SQL injection*

`debugQuery` escapes every value (strings, numbers, booleans, null, Dates, Buffers, arrays and objects), but
it is meant for logging: execute queries with `statement`/`prepareStatement`/`unsafe` so values are bound as
parameters. Inlined literals are not always typed the way parameters are (e.g. arrays become array literal
strings and objects JSON strings, which need a cast in some contexts).

## Breaking changes (since the pg-only releases)

* The `separator` of `values`/`spread`/`ids` is now an Expression: replace `values(xs, ' or ')` with
  `values(xs, text(' or '))`. Passing a string throws a `TypeError` (it used to be inserted as raw SQL).
* `@triptease/sql-template-postgres` no longer depends on `pg`; its `QueryConfig` is a local type
  that is structurally compatible with pg's.
* Adapters throw on expressions they do not understand instead of silently dropping them, and SQL with an
  invalid escape sequence (e.g. ``SQL`\u` ``) throws instead of producing the text `undefined`.
* Public types use `unknown` instead of `any`; `ids` takes `string[]`.

## Extending

It is simple to extend to other DBs: switch on `kindOf(expression)` (`'text'`, `'identifier'`, `'value'`,
`'template'`) and throw on anything else. Have a look at the
[postgres implementation](https://github.com/triptease/sql-template/blob/master/sql-template-postgres/src/statement.ts).

## Development

Tool versions (node, bun) are pinned in `mise.toml`. Install [mise](https://mise.jdx.dev/getting-started.html), then:

```shell
mise install   # installs the pinned node and bun
./run          # install deps, clean, build (tsc --build), typecheck and test (bun test)
```

The repo is a bun workspace: each package has a published `src/package.json` (runtime dependencies only)
and a private `test/package.json` (test dependencies). Tests import the packages by name.

The postgres integration tests (`sql-template-postgres/test/integration.test.ts`) run real queries through
both `pg` and `Bun.sql`. They need a database:

```shell
DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres ./run
```

Without `DATABASE_URL` they are skipped locally (with a warning) but fail when `CI=true`; the GitHub Actions
test job provides a `postgres:18` service.

## Releasing

Every push to `triptease/sql-template` that passes the `test` job runs the `publish` job in
[`.github/workflows/build.yml`](.github/workflows/build.yml), which runs `scripts/release.ts`:

* Version: `0.<git rev-list --count HEAD>.<GITHUB_RUN_NUMBER>`; dist-tag `latest` on `master`, `dev` on other branches.
* It does a clean `tsc --build`, then writes `<pkg>/dist/package.json` from `<pkg>/src/package.json` (version
  stamped, `workspace:*` replaced by that version, `main`/`types`/`exports` pointing at the `.js`/`.d.ts`
  files, explicit `files`) and copies this README next to it. The `dist` directory is what gets published, so
  import paths never contain `src/` or `dist/`. It fails if any `workspace:` range is left.
* It publishes core first, then postgres, with `npm publish <pkg>/dist`:
  * to **GitHub Packages** (`npm.pkg.github.com`) on every run, using the workflow's `GITHUB_TOKEN`;
  * to **npmjs** only when the repo variable `NPM_PUBLISH` is `true`, with `--access public --provenance`,
    authenticated by npm Trusted Publishing (OIDC), or by an `NPM_TOKEN` secret if one exists.
* Versions that are already on a registry are skipped, so a failed run can simply be re-run.

Check what would be published without uploading anything (`npm publish --dry-run`; add `NPM_PUBLISH=true`
to include npmjs):

```shell
./run release --dry-run
```

`./run ci` runs the full build and tests, then the release script.

### One-off setup (needs an npm org admin and a GitHub repo admin)

1. On npmjs.com, for **each** of `@triptease/sql-template` and `@triptease/sql-template-postgres`:
   Settings → Trusted Publisher → GitHub Actions, organization `triptease`, repository `sql-template`,
   workflow filename `build.yml`, environment empty. The workflow filename is part of the trust
   relationship, so do not rename `build.yml`. Once it works, npm recommends disallowing token publishing
   for the packages (Settings → Publishing access).
2. In the GitHub repo, set the Actions variable `NPM_PUBLISH` to `true` (Settings → Secrets and variables →
   Actions → Variables). Until then npmjs publishing is skipped and only GitHub Packages is published.
   (Alternative to step 1: add an `NPM_TOKEN` repo secret with publish rights; the publish step uses it if set.)
3. GitHub Packages: after the first publish, check both packages under the org's Packages page, make sure
   they are linked to this repository and set their visibility to public if they should be visible
   outside the org.

### Installing from GitHub Packages

npmjs is the main channel. Installing from GitHub Packages needs authentication even for public packages:
a token with `read:packages` and an `.npmrc` like

```ini
@triptease:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```
