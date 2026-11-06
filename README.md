# akihabarra-bot

A Telegram bot for managing balances and purchases in a snack bar. Users can check their balance, add or set funds, buy listed articles, review or undo purchases, and view sales statistics.

The application is built with Node.js, [Telegraf](https://telegraf.js.org/), and either MariaDB or PostgreSQL. Each deployment uses one engine, selected at startup; MariaDB remains the default.

## Requirements

- Node.js 20 or later
- A Telegram bot token
- MariaDB or PostgreSQL

## Setup

1. Install dependencies:

   ```sh
   npm install
   ```

2. Set up your chosen database:

   **MariaDB:** run the existing setup script with an account that can create databases and users. It creates `akihabarra` and a local `akihabarabot` user with development password `dev`. Change that password for your deployment.

   ```sh
   mariadb < src/tables.sql
   ```

   **PostgreSQL:** create a login and database using an administrator account, then apply the PostgreSQL schema as the database owner. The schema does not create accounts or databases.

   ```sh
   createuser --pwprompt akihabarabot
   createdb --owner=akihabarabot akihabarra
   psql -h localhost -U akihabarabot -d akihabarra -v ON_ERROR_STOP=1 -f src/tables.postgresql.sql
   ```

3. Configure every connection option in `src/settings.js` under `database`. Set `engine` to `mariadb` or `postgresql`; set `port` to a number or `null` to use the engine's default. Set the bot token in the same file. Environment variables are optional overrides:

   | Variable | Default |
   | --- | --- |
   | `DB_ENGINE` | `mariadb`; alternatively `postgresql` |
   | `DB_HOST` | Existing settings-file host |
   | `DB_PORT` | `3306` for MariaDB, `5432` for PostgreSQL |
   | `DB_USER` | Existing settings-file user |
   | `DB_PASSWORD` | Existing settings-file password; an empty override is allowed |
   | `DB_NAME` | Existing settings-file database name |
   | `DB_CONNECTION_LIMIT` | Existing settings-file limit |
   | `TELEGRAM_TOKEN` | Existing settings-file token |

   For PostgreSQL, set `database.engine` to `postgresql` and configure its host, port, user, password, and database name in the file. The corresponding `DB_*` variables, when set, override those file values. Keep real credentials out of version control. Configuration changes require a restart.

4. Start the bot:

   ```sh
   node index.js
   ```

The bot must be running to receive Telegram updates. Stop it with `Ctrl+C`; it handles `SIGINT` and `SIGTERM` for graceful shutdown.

## Bot commands

The bot's commands and replies are in Spanish:

| Command | Purpose |
| --- | --- |
| `/ayuda` | Show help |
| `/comprar` | Choose and buy an article |
| `/precios` | List articles and prices |
| `/saldo` | Show your balance |
| `/ingresar` | Add funds to your balance |
| `/modificar` | Set your balance to a new amount |
| `/nuevo` | Add an article (reply with its name and price, for example `Pasarratos 0.35`) |
| `/borrar` | Choose an article to delete |
| `/historial` | Show your latest purchases |
| `/deshacer` | Undo your latest purchase |
| `/estadisticas` | Show your purchase counts by article |
| `/global` | Show purchase counts by article for all users |

Balances are created on a user's first interaction with the bot. Article purchases and balance changes are stored in the configured database.

## Migrate MariaDB data to PostgreSQL

This is an offline copy. Stop the bot and all other writers, back up MariaDB, and create an empty PostgreSQL database with `src/tables.postgresql.sql` as described above. The migration refuses destinations containing any users, articles, or sales; it does not merge records or create the schema.

Configure every source and destination connection field under `migration.source` and `migration.target` in `src/settings.js`, then run `npm run migrate:postgresql`. Environment variables are optional overrides; for example (replace the placeholders):

```sh
export SOURCE_DB_HOST=localhost
export SOURCE_DB_PORT=3306
export SOURCE_DB_USER=akihabarabot
export SOURCE_DB_PASSWORD='<source-password>'
export SOURCE_DB_NAME=akihabarra
export TARGET_DB_HOST=localhost
export TARGET_DB_PORT=5432
export TARGET_DB_USER=akihabarabot
export TARGET_DB_PASSWORD='<destination-password>'
export TARGET_DB_NAME=akihabarra
npm run migrate:postgresql
```

The source engine is MariaDB and the destination engine is PostgreSQL. The `SOURCE_DB_*` and `TARGET_DB_*` variables override their respective file settings. Both prefixes also accept `ENGINE` and `CONNECTION_LIMIT`; the engines must match the required source and destination.

The script reads MariaDB in a read-only snapshot and copies users, balances, articles, sales, IDs, and timestamps in batches. All destination inserts and identity-counter resets run in one transaction. It checks row counts before committing and leaves MariaDB untouched. A failed copy rolls back destination changes; fix the cause before retrying. After a connection loss during commit, inspect the destination before retrying: a nonempty destination is refused. Failure output deliberately excludes driver errors that might contain credentials or row data.

After success, verify balances and history, set the bot's `database` settings for PostgreSQL, and restart it. To return to MariaDB before accepting new writes, restore the original connection settings. Writes accepted by PostgreSQL after cutover are not copied back automatically.

Money remains exact two-decimal database values. Timestamps are transferred as UTC instants and returned to the bot as JavaScript dates; history is displayed in the bot process's local timezone. PostgreSQL sales statistics distinguish case and accents (`Cafe`, `cafe`, `Café`); MariaDB keeps its existing collation behavior. Article deletion continues to retain purchase history.

## Development

```sh
npm test
npx eslint .
```

`npm test` runs configuration tests and skips database integration tests unless explicitly enabled. The integration suite needs two **disposable, empty** databases named `akihabarra`; it creates tables and truncates data. Supply MariaDB's root login and PostgreSQL's postgres login via the test variables:

```sh
TEST_DATABASES=1 \
TEST_MARIADB_PORT=3306 TEST_MARIADB_PASSWORD='<test-password>' \
TEST_POSTGRESQL_PORT=5432 TEST_POSTGRESQL_PASSWORD='<test-password>' \
npm run test:integration
```

Both test hosts are `127.0.0.1`. The suite covers SQL operations on each engine, value binding, exact decimals and large IDs, timestamps, grouping, constraints, migration across batch boundaries, refusing an occupied destination, rollback on failure, source preservation, and generated IDs after migration. It does not connect to Telegram.

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the code structure and database model.
