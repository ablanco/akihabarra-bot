# akihabarra-bot

A Telegram bot for managing balances and purchases in a snack bar. Users can check their balance, add or set funds, buy listed articles, review or undo purchases, and view sales statistics.

The application is built with Node.js, [Telegraf](https://telegraf.js.org/), and MariaDB. The SQL schema and setup script are in [`src/tables.sql`](src/tables.sql). PostgreSQL is not currently supported without adapting the database driver and schema.

## Requirements

- Node.js with ES module support
- A Telegram bot token
- MariaDB

## Setup

1. Install dependencies:

   ```sh
   npm install
   ```

2. Create the database and tables by running `src/tables.sql` with a MariaDB account that can create databases and users. The script creates the `akihabarra` database and an `akihabarabot` user with the development password `dev`. Change that password for your deployment and update `src/settings.js` to match your database host, credentials, and database name.

   ```sh
   mariadb < src/tables.sql
   ```

3. Set your Telegram bot token in `src/settings.js` (`token`). The current settings file contains both the database configuration and bot token; keep real credentials out of version control.

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

Balances are created on a user's first interaction with the bot. Article purchases and balance changes are stored in MariaDB.

## Development

`npm test` is currently a placeholder and does not run a test suite. ESLint is configured and can be run with:

```sh
npx eslint .
```

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the code structure and database model.
