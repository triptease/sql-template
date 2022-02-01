# Sql Template

This is yet another SQL tagged template for Typescript/Javascript

## Why another library?

* Typescript first
* Functional/Immutable
* Super simple implementation (the main SQL function is [3 lines of code](https://github.com/triptease/sql-template/blob/master/sql-template/src/SQL.ts#L5))
* Full escaping of identifiers and values
* Plugable to any DB (currently only Postgres @triptease\sql-template-postgres )
* Automatic support for prepareStatement naming (Postgres)

## Installation

```shell
npm install @triptease/sql-template @triptease/sql-template-postgres
```

## Usage

```javascript
import {SQL, id} from "@triptease/sql-template";
import {statement} from "@triptease/sql-template-postgres";

client.query(statement(SQL`select * from ${id(table)} where name = ${name}`));
```

## Cheatsheet

### Core (@triptease/sql-template) 

| function                                       | Description                                                          |
|------------------------------------------------|----------------------------------------------------------------------|
| `SQL`                                          | The main function to create tagged templates for SQL (*DB agnostic*) |
| `text` (alias `raw`)                           | Input raw SQL without any escaping (*use with care*)                 |
 | `id` / `ids`                                   | Input dynamic identifiers into SQL (*escaped as needed*)             |
 | `value` (optional) / `values` (alias `spread`) | Input one or more values into SQL (*escaped as needed*)              |


### Postgres (@triptease/sql-template-postgres)

| function                                       | Description                                                         |
|------------------------------------------------|---------------------------------------------------------------------|
| `statement`                                    | Converts DB agnostic `SQL` template into postgres statement         |
| `prepareStatement`                             | Converts DB agnostic `SQL` template into postgres prepare statement |
| `debugQuery`                                   | Used to debug a query (*use with care*)                             |

*use with care -> Used incorrectly you can open yourself up to SQL injection*


### Extending

It is incredibly simple to extend to other DBs, have a look at the [postgres implementation](https://github.com/triptease/sql-template/blob/master/sql-template-postgres/src/index.ts#L17). 


