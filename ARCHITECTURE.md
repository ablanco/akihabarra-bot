# Architecture

## Overview

Akihabarra Bot is a Node.js ES module application that exposes snack-bar balance and purchasing operations through a Telegram bot. `index.js` creates the Telegraf bot, registers commands and message/action handlers, and starts polling. Command handlers call shared utilities and the SQL access module; persistent state lives in MariaDB.

```text
Telegram
   ↕ Telegraf handlers
index.js → src/commands.js → src/utils.js → src/sql.js → MariaDB
                            ↘              ↗
                         settings.js
```

## Components

- **`index.js`** — Creates the Telegraf instance from `src/settings.js`, defines help text, registers slash commands, text matchers, and callback actions, and handles process shutdown signals.
- **`src/commands.js`** — Implements user actions: view/deposit/change balance, create/list/delete articles, buy an article, view or undo sales, and show statistics. It formats Telegram replies in Spanish.
- **`src/utils.js`** — Provides shared behavior: get or create a Telegram user, sort articles by name, and split lists into keyboard-sized chunks.
- **`src/sql.js`** — Owns the MariaDB connection pool and database operations for users, articles, sales, and statistics. Values are escaped with `sqlstring` before statements are sent through the MariaDB connector.
- **`src/settings.js`** — Holds the Telegram token and database connection settings.
- **`src/tables.sql`** — Creates the MariaDB database, local database user, tables, defaults, and the sales-to-users foreign key.

## Data model

- **users** — Telegram user ID as the primary key; names, username, balance, and creation/modification timestamps.
- **articles** — Auto-incrementing ID, name, price, and timestamps.
- **sales** — Auto-incrementing ID, user ID, article name and charged price, and timestamps. `user` references `users.id`.

Sales retain the article name and price at purchase time, rather than referencing the current article record. The schema does not define an article foreign key.

## Runtime flow

1. `index.js` receives a Telegram update through Telegraf and dispatches it to a command, text matcher, or callback action.
2. A handler in `src/commands.js` obtains user/article/sales data through `src/utils.js` and `src/sql.js` as needed.
3. `src/sql.js` checks out a connection from the pool, executes a query, and returns the result. The command handler formats and sends the response through Telegraf.

## Database portability

The current persistence implementation targets MariaDB: it imports the `mariadb` driver, uses its pool API, and its setup script uses MariaDB/MySQL syntax such as `AUTO_INCREMENT`, `UNSIGNED`, `USE`, and `ON UPDATE CURRENT_TIMESTAMP`. Most query intent is conventional SQL, but the application and schema are not currently a database-neutral adapter. PostgreSQL support would require an alternate driver/configuration, compatible placeholder handling and schema, and a strategy for maintaining modification timestamps.
