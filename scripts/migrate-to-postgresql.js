import { pathToFileURL } from 'node:url';
import MariaDB from 'mariadb';
import pg from 'pg';
import Settings, { getDatabaseSettings } from '../src/settings.js';

const tables = {
    users: [
        'id',
        'created',
        'modified',
        'first_name',
        'last_name',
        'username',
        'balance',
    ],
    articles: ['id', 'created', 'modified', 'name', 'price'],
    sales: ['id', 'created', 'modified', 'user', 'article', 'price'],
};

// The caller must stop all writers before copying. No source writes are issued.
export async function migrate(sourceConfig, targetConfig) {
    if (
        sourceConfig.engine !== 'mariadb' ||
        targetConfig.engine !== 'postgresql'
    ) {
        throw new Error(
            'Migration requires a MariaDB source and PostgreSQL destination'
        );
    }
    let source;
    const target = new pg.Client({
        host: targetConfig.host,
        port: targetConfig.port,
        user: targetConfig.user,
        password: targetConfig.password,
        database: targetConfig.database,
    });
    let transaction = false;
    try {
        source = await MariaDB.createConnection({
            host: sourceConfig.host,
            port: sourceConfig.port,
            user: sourceConfig.user,
            password: sourceConfig.password,
            database: sourceConfig.database,
            timezone: '+00:00',
            dateStrings: true,
        });
        await target.connect();
        await source.query(
            'START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY'
        );
        await target.query('BEGIN');
        transaction = true;
        await target.query(
            'LOCK TABLE users, articles, sales IN ACCESS EXCLUSIVE MODE'
        );
        for (const table of Object.keys(tables)) {
            const result = await target.query(`SELECT 1 FROM ${table} LIMIT 1`);
            if (result.rows.length) {
                throw new Error('Destination tables must be empty');
            }
        }

        const counts = {};
        for (const [table, columns] of Object.entries(tables)) {
            let lastId = null;
            counts[table] = 0;
            for (;;) {
                const rows = await source.query(
                    `SELECT ${columns
                        .map((column) => `\`${column}\``)
                        .join(', ')} FROM ${table} ${
                        lastId === null ? '' : 'WHERE id > ?'
                    } ORDER BY id LIMIT 500`,
                    lastId === null ? [] : [lastId]
                );
                if (!rows.length) {
                    break;
                }
                for (const row of rows) {
                    const values = columns.map((column) => {
                        const value = row[column];
                        if (typeof value === 'bigint') {
                            return value.toString();
                        }
                        // Source TIMESTAMP values are read as UTC strings, avoiding
                        // local-time conversion and preserving stored timestamps.
                        if (
                            value !== null &&
                            ['created', 'modified'].includes(column)
                        ) {
                            return `${value}+00:00`;
                        }
                        return value;
                    });
                    await target.query(
                        `INSERT INTO ${table} (${columns
                            .map((column) => `"${column}"`)
                            .join(', ')}) VALUES (${columns
                            .map((_, i) => `$${i + 1}`)
                            .join(', ')})`,
                        values
                    );
                }
                lastId = rows[rows.length - 1].id.toString();
                counts[table] += rows.length;
            }
            const result = await target.query(
                `SELECT COUNT(*) AS count FROM ${table}`
            );
            if (BigInt(result.rows[0].count) !== BigInt(counts[table])) {
                throw new Error(`Row count mismatch for ${table}`);
            }
        }
        for (const table of ['articles', 'sales']) {
            const result = await target.query(
                `SELECT MAX(id) AS maximum FROM ${table}`
            );
            const next = Math.max(1, Number(result.rows[0].maximum ?? 0) + 1);
            if (!Number.isSafeInteger(next) || next > 2147483647) {
                throw new Error(`No generated IDs remaining in ${table}`);
            }
            // Unlike setval(), RESTART participates in transaction rollback.
            await target.query(
                `ALTER TABLE ${table} ALTER COLUMN id RESTART WITH ${next}`
            );
        }
        await target.query('COMMIT');
        transaction = false;
        return counts;
    } catch (error) {
        if (transaction) {
            await target.query('ROLLBACK');
        }
        throw error;
    } finally {
        await Promise.allSettled([source?.end(), target.end()]);
    }
}

if (
    process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href
) {
    try {
        const source = getDatabaseSettings(
            'SOURCE_DB_',
            Settings.migration.source
        );
        const target = getDatabaseSettings(
            'TARGET_DB_',
            Settings.migration.target
        );
        const counts = await migrate(source, target);
        console.log(
            `Migrated ${counts.users} users, ${counts.articles} articles, ${counts.sales} sales.`
        );
    } catch {
        // Driver errors can contain row values, SQL or connection credentials.
        console.error(
            'Migration failed. Destination transaction rolled back if active. Check connectivity, schema, empty destination, data constraints and database logs.'
        );
        process.exitCode = 1;
    }
}
