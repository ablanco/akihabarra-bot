# Support MariaDB and PostgreSQL with an offline cutover

Each bot deployment uses one database engine selected at startup, with MariaDB as the default for existing installations. Database configuration supports environment overrides while preserving settings-file defaults.

Migration from MariaDB to PostgreSQL requires stopping the bot and using an empty destination. It preserves users, balances, articles, sales, IDs, and timestamps, copies records within a destination transaction, and resets generated IDs. The migration leaves MariaDB untouched so a failed copy can roll back without changing the source. This accepts downtime to avoid the complexity and consistency risks of synchronizing writes between engines or merging existing records.

PostgreSQL uses its native case- and accent-sensitive grouping for article sales statistics; MariaDB retains its existing collation. This accepts differences for differently spelled article names rather than introducing a collation emulation layer.
