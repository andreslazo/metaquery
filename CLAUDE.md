# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Does

Metaquery is a Node.js CLI tool that executes a SQL statement across multiple MySQL databases/schemas and outputs aggregated results to a CSV file. It connects to a MySQL server, discovers or filters databases, runs the configured query on each one (concurrently, throttled by a connection pool), and writes combined results to `results.csv`.

## Commands

- `npm install` — install dependencies
- `npm run start` — run the application (`node index.js`)
- No test suite exists (`npm test` is a placeholder)
- Debug output is controlled via the `DEBUG` env var (uses the `debug` package): `DEBUG=* npm run start`

## Setup

Copy `.env.example` to `.env` and fill in database credentials and query configuration. See `.env.example` for all available variables.

## Architecture

The app has three source files with a simple pipeline:

- **`index.js`** — Entry point. Loads env, prints greeting, calls `startApp()`.
- **`app.js`** — Core logic. Determines which databases to query (either from `DATABASE_LIST` env var or by running `SHOW databases` filtered by `DBNAME_FILTER_REGEX`), runs `SQL_STATEMENT` against every database concurrently via `Promise.allSettled` (the pool's `connectionLimit` throttles parallelism), collects results, converts to CSV (semicolon-delimited header and rows), and writes `results.csv` with `fs.writeFileSync`. Progress is logged in completion order. Closes the pool in a `finally`.
- **`connector.js`** — MySQL connection pool (`mysql2/promise`). Exports `pool` (created with `connectionLimit = CONCURRENCY`, `multipleStatements: true`) and `queryDatabase(database, statement)`, which grabs a pooled connection, runs `USE \`db\`; <statement>` in one round trip, returns the rows of the last result set, and releases the connection.
- **`config/database.js`** — Exports DB connection config from env vars (`DATABASE_HOST`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`, `DATABASE_PORT`).

## Key Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_LIST` | Comma-separated list of databases (skips auto-discovery if set) |
| `DBNAME_FILTER_REGEX` | Regex to filter `SHOW databases` results (used when `DATABASE_LIST` is empty) |
| `SQL_STATEMENT` | The SQL query executed on each database |
| `CONCURRENCY` | Max tenant queries running in parallel (pool `connectionLimit`). Default 5 |

## Dependencies

- `mysql2` — MySQL client (promise API, `mysql2/promise`; supports connection pooling and `multipleStatements`)
- `dotenv` — Loads `.env` into `process.env`
- `debug` — Conditional debug logging (dev dependency)

## Node Version

Requires Node.js >24. Pinned to 24.16.0 in `.tool-versions` (asdf/mise).
