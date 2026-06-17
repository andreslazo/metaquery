# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Does

Metaquery is a Node.js CLI tool that executes a SQL statement across multiple MySQL databases/schemas and outputs aggregated results to a CSV file. It connects to a MySQL server, discovers or filters databases, runs the configured query on each one, and writes combined results to `results.csv`.

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
- **`app.js`** — Core logic. Determines which databases to query (either from `DATABASE_LIST` env var or by running `SHOW databases` filtered by `DBNAME_FILTER_REGEX`), iterates each database executing `SQL_STATEMENT`, collects results, converts to CSV (semicolon-delimited), and writes `results.csv`.
- **`connector.js`** — MySQL connection wrapper. `useConn(fn)` manages connection lifecycle; `exec(conn, statement)` wraps `connection.query` in a Promise.
- **`config/database.js`** — Exports DB connection config from env vars (`DATABASE_HOST`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`, `DATABASE_PORT`).

## Key Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_LIST` | Comma-separated list of databases (skips auto-discovery if set) |
| `DBNAME_FILTER_REGEX` | Regex to filter `SHOW databases` results (used when `DATABASE_LIST` is empty) |
| `SQL_STATEMENT` | The SQL query executed on each database |

## Dependencies

- `mysql` — MySQL client (callback-based, wrapped with Promises in `connector.js`)
- `dotenv` — Loads `.env` into `process.env`
- `debug` — Conditional debug logging (dev dependency)

## Node Version

Requires Node.js >20. Pinned to 20.20.0 in `.tool-versions` (asdf/mise).
