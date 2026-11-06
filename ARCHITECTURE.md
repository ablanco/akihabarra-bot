# Architecture

## Overview

Akihabarra Bot is a Node.js ES module application that exposes snack-bar balance and purchasing operations through a Telegram bot. `index.js` creates the Telegraf bot, registers commands and message/action handlers, and starts polling. Command handlers call shared utilities and the SQL access module; persistent state lives in one configured MariaDB or PostgreSQL database.

```text
Telegram
   ↕ Telegraf handlers
index.js → src/commands.js → src/utils.js → src/sql.js → MariaDB / PostgreSQL
                            ↘              ↗
                         settings.js
```

## Components

- **`index.js`** — Creates the Telegraf instance from `src/settings.js`, defines help text, registers slash commands, text matchers, and callback actions, and handles process shutdown signals.
- **`src/commands.js`** — Implements user actions: view/deposit/change balance, create/list/delete articles, buy an article, view or undo sales, and show statistics. It formats Telegram replies in Spanish.
- **`src/utils.js`** — Provides shared behavior: get or create a Telegram user, sort articles by name, and split lists into keyboard-sized chunks.
- **`src/sql.js`** — Owns a lazily created connection pool and database operations for users, articles, sales, and statistics. `createSQL(config)` selects the driver, binds values separately from query text, and returns row arrays for reads. Internal query templates use `?` placeholders; the PostgreSQL path numbers these as `$1`, `$2`, etc. Templates must not contain literal question marks. `close()` releases the pool at shutdown.
- **`src/settings.js`** — Holds fallback Telegram and database settings, applies environment overrides, and validates engine, port, and pool size.
- **`src/tables.sql`** — MariaDB provisioning and table schema.
- **`src/tables.postgresql.sql`** — PostgreSQL table schema, identity columns, constraints, and modification-time triggers, applied to an existing empty database.
- **`scripts/migrate-to-postgresql.js`** — Offline, read-only MariaDB snapshot copied into an empty PostgreSQL destination within one destination transaction.

## Data model

- **users** — Telegram user ID as the primary key; names, username, balance, and creation/modification timestamps.
- **articles** — Auto-incrementing ID, name, price, and timestamps.
- **sales** — Auto-incrementing ID, user ID, article name and charged price, and timestamps. `user` references `users.id`.

Sales retain the article name and price at purchase time, rather than referencing the current article record. The schema does not define an article foreign key.

## Runtime flow

1. `index.js` receives a Telegram update through Telegraf and dispatches it to a command, text matcher, or callback action.
2. A handler in `src/commands.js` obtains user/article/sales data through `src/utils.js` and `src/sql.js` as needed.
3. `src/sql.js` executes a query through the selected pool and returns the result rows for reads. The command handler formats and sends the response through Telegraf.

## Database portability

The deployment selects `mariadb` (default) or `postgresql` through settings/environment variables at startup. Engine-specific behavior is confined to the SQL module and separate schemas; command handlers retain Spanish replies and the same row-array contract. Both drivers return decimal amounts as strings and timestamps as JavaScript `Date` objects. MariaDB connections use UTC; PostgreSQL stores timezone-aware timestamps. PostgreSQL's user IDs use constrained `NUMERIC(20,0)` to preserve the complete MariaDB unsigned BIGINT range without JavaScript number conversion. Article and sale IDs remain generated 32-bit integers. PostgreSQL quotes the existing sales `user` column and implements MariaDB's modification timestamp behavior with update triggers.

Sales statistics retain each engine's native collation: PostgreSQL distinguishes case and accents, while the existing MariaDB schema does not. Equal-timestamp history entries use descending ID as a deterministic tie-breaker. Broader changes to purchase/balance concurrency are outside this change; those command operations still consist of separate database statements.

Migration preserves records and IDs, checks destination counts, and restarts identity counters above imported IDs. Identity restarts use transactional DDL so failed migrations do not leave sequence changes behind. The source is never modified. See [ADR 0001](docs/adr/0001-database-support-and-migration.md) and the README for cutover requirements.
