# Sql Template

This is yet another SQL tagged template for Typescript/Javascript

## Why another library?

* Typescript first
* Functional/Immutable
* Super simple implementaion (the main SQL function is 3 lines of code - https://github.com/triptease/sql-template/blob/master/sql-template/src/SQL.ts#L5)
* Plugable to any DB (currently has a Postgres function in @triptease\sql-template-postgres)
* Automatic support for prepareStatement naming (Postgres)

## Installation

```
npm install @triptease\sql-template @triptease\sql-template-postgres
```

## Usage

```
import {SQL} from "@triptease/sql-template";
import {statement} from "@triptease/sql-template-postgres";

pg.query(statement(SQL`select * from user where name = ${name}`));

```

WIP more to come
