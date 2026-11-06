# Agent instructions

## Project

This is a Node.js ES module Telegram bot for managing a snack bar balance. It uses Telegraf and MariaDB.

## Working conventions

- Preserve the existing JavaScript ES module style and formatting (four-space indentation, semicolons, single quotes).
- Keep Telegram command handlers in `src/commands.js`, shared helpers in `src/utils.js`, database access in `src/sql.js`, and bot setup/registration in `index.js`.
- Treat `src/tables.sql` as the MariaDB schema and setup reference. SQL driver/configuration is currently MariaDB-specific; do not assume another database is interchangeable without adapting both the driver and schema.
- Database credentials and the Telegram token are currently configured in `src/settings.js`. Avoid copying real secrets into documentation or logs; prefer environment configuration if changing secret handling.
- Preserve the existing Spanish user-facing command text unless a task requests localization changes.
- There is no established automated test suite. `npm test` is currently a placeholder that exits with an error. Do not claim tests passed unless meaningful tests are added and run.

## Useful commands

- `npm install` installs dependencies.
- `node index.js` starts the bot (requires valid Telegram and MariaDB settings).
- `npx eslint .` runs the configured linter.

## Change guidance

- Keep database statements parameterized/escaped through the existing SQL access layer.
- When changing database structure, update `src/tables.sql` and any corresponding application queries together.
- Do not add dependencies or change database engines without a task requiring it.
