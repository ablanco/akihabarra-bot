import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import MariaDB from 'mariadb';
import pg from 'pg';
import { createSQL } from '../src/sql.js';
import { migrate } from '../scripts/migrate-to-postgresql.js';

// These databases must be disposable and empty: this suite creates and truncates tables.
test(
    'real database compatibility and offline migration',
    {
        skip: process.env.TEST_DATABASES !== '1',
    },
    async (t) => {
        assert.ok(
            process.env.TEST_MARIADB_PORT && process.env.TEST_POSTGRESQL_PORT
        );
        const sourceConfig = {
            engine: 'mariadb',
            host: '127.0.0.1',
            port: Number(process.env.TEST_MARIADB_PORT),
            user: 'root',
            password: process.env.TEST_MARIADB_PASSWORD ?? 'integration-only',
            database: 'akihabarra',
            connectionLimit: 2,
        };
        const targetConfig = {
            ...sourceConfig,
            engine: 'postgresql',
            user: 'postgres',
            port: Number(process.env.TEST_POSTGRESQL_PORT),
            password:
                process.env.TEST_POSTGRESQL_PASSWORD ?? 'integration-only',
        };
        const maria = await MariaDB.createConnection({
            ...sourceConfig,
            timezone: '+00:00',
            dateStrings: true,
        });
        const postgres = new pg.Client(targetConfig);
        const databases = [createSQL(sourceConfig), createSQL(targetConfig)];
        t.after(async () => {
            await Promise.allSettled([
                ...databases.map((db) => db.close()),
                maria.end(),
                postgres.end(),
            ]);
        });
        await postgres.connect();
        // Provisioning accounts is separate from the application table schema.
        const schema = await readFile(
            new URL('../src/tables.sql', import.meta.url),
            'utf8'
        );
        for (const statement of schema
            .slice(schema.indexOf('CREATE TABLE users'))
            .split(';')) {
            if (statement.trim()) {
                await maria.query(statement);
            }
        }
        await postgres.query(
            await readFile(
                new URL('../src/tables.postgresql.sql', import.meta.url),
                'utf8'
            )
        );

        for (const [index, db] of databases.entries()) {
            await t.test(
                `${index === 0 ? 'MariaDB' : 'PostgreSQL'} operations`,
                async () => {
                    const id = '18446744073709551615';
                    const text = "O'Brien \\ ? $1; DROP TABLE users; --";
                    await db.createUser(id, text + '😀', '', text);
                    let [user] = await db.getUser(id);
                    assert.equal(String(user.id), id);
                    assert.equal(user.first_name, text);
                    assert.equal(user.username, text);
                    assert.equal(user.balance, '0.00');
                    assert.ok(user.created instanceof Date);
                    assert.ok(
                        Math.abs(user.created.getTime() - Date.now()) < 5000
                    );
                    await db.updateBalance(id, '-12.34');
                    [user] = await db.getUser(id);
                    assert.equal(user.balance, '-12.34');
                    await db.createArticle(text, '0.35');
                    const [article] = await db.getArticles();
                    assert.equal(
                        (await db.getArticle(article.id))[0].price,
                        '0.35'
                    );
                    await assert.rejects(db.createArticle('Invalid', '-1.00'));
                    await assert.rejects(db.registerSale('1', text, '0.35'));
                    for (const name of ['Cafe', 'cafe', 'Café']) {
                        await db.registerSale(id, name, '0.35');
                    }
                    const history = await db.getSales(id, 2);
                    assert.equal(history.length, 2);
                    assert.ok(history[0].created instanceof Date);
                    const stats = await db.getSalesStats(id);
                    assert.equal(stats.length, index === 0 ? 1 : 3);
                    assert.equal(
                        (await db.getSalesGlobalStats()).length,
                        stats.length
                    );
                    await db.deleteArticle(article.id);
                    assert.equal((await db.getArticle(article.id)).length, 0);
                    assert.equal((await db.getSales(id)).length, 3);
                    await db.deleteSale(history[0].id);
                    assert.equal((await db.getSales(id)).length, 2);
                    const modified = new Date('2000-01-01T00:00:00Z');
                    await db.runQuery(
                        'UPDATE users SET modified=? WHERE id=?',
                        [modified, id]
                    );
                    await db.updateBalance(id, '1.23');
                    assert.ok((await db.getUser(id))[0].modified > modified);
                }
            );
        }

        await t.test('migration refuses existing data', async () => {
            await assert.rejects(
                migrate(sourceConfig, targetConfig),
                /must be empty/
            );
            assert.equal(
                (await databases[1].getSales('18446744073709551615')).length,
                2
            );
        });
        await postgres.query(
            'TRUNCATE sales, articles, users RESTART IDENTITY'
        );
        await maria.query('DELETE FROM sales');
        await maria.query('DELETE FROM articles');
        await maria.query('DELETE FROM users');
        // More than one batch, precise IDs/decimals, fixed UTC timestamps and NULLs.
        await maria.query(`INSERT INTO users (id, first_name, last_name, username, balance, created, modified)
        VALUES (18446744073709551615, 'Exact', '', '', -12.34, '2020-10-25 01:30:00', NULL)`);
        for (let id = 1; id <= 501; id++) {
            await databases[0].createUser(id, 'Batch', '', '');
        }
        await maria.query(
            "INSERT INTO articles (id, name, price) VALUES (42, 'Snack', 0.35)"
        );
        await maria.query(
            "INSERT INTO sales (id, user, article, price) VALUES (81, 18446744073709551615, 'Deleted article', 0.35)"
        );
        const snapshot = async () => {
            const result = {};
            for (const table of ['users', 'articles', 'sales']) {
                const rows = await maria.query(
                    `SELECT * FROM ${table} ORDER BY id`
                );
                result[table] = Array.from(rows, (row) => ({ ...row }));
            }
            return result;
        };
        const original = await snapshot();

        await t.test(
            'failed copy rolls back all destination rows',
            async () => {
                await postgres.query(
                    'ALTER TABLE articles ADD CONSTRAINT reject_copy CHECK (id < 40)'
                );
                await assert.rejects(
                    migrate(sourceConfig, targetConfig),
                    /reject_copy/
                );
                for (const table of ['users', 'articles', 'sales']) {
                    assert.equal(
                        (await postgres.query(`SELECT COUNT(*) FROM ${table}`))
                            .rows[0].count,
                        '0'
                    );
                }
                assert.deepEqual(await snapshot(), original);
                await postgres.query(
                    'ALTER TABLE articles DROP CONSTRAINT reject_copy'
                );
            }
        );

        await t.test(
            'successful copy preserves data and resets identity counters',
            async () => {
                assert.deepEqual(await migrate(sourceConfig, targetConfig), {
                    users: 502,
                    articles: 1,
                    sales: 1,
                });
                assert.deepEqual(await snapshot(), original);
                for (const table of ['users', 'articles', 'sales']) {
                    const rows = (
                        await postgres.query(
                            `SELECT * FROM ${table} ORDER BY id`
                        )
                    ).rows;
                    const normalize = (items) =>
                        items.map((row) =>
                            Object.fromEntries(
                                Object.entries(row).map(([key, value]) => [
                                    key,
                                    typeof value === 'bigint'
                                        ? value.toString()
                                        : value !== null &&
                                          ['created', 'modified'].includes(key)
                                        ? new Date(
                                              typeof value === 'string'
                                                  ? value.replace(' ', 'T') +
                                                    'Z'
                                                  : value
                                          ).toISOString()
                                        : value,
                                ])
                            )
                        );
                    assert.deepEqual(
                        normalize(rows),
                        normalize(original[table])
                    );
                }
                await databases[1].createArticle('Next', '1.00');
                assert.equal(
                    (await databases[1].getArticle(43))[0].name,
                    'Next'
                );
                await databases[1].registerSale('1', 'Next', '1.00');
                assert.equal((await databases[1].getSales('1'))[0].id, 82);
                assert.equal(
                    (await databases[1].getUser('18446744073709551615'))[0]
                        .modified,
                    null
                );
            }
        );
    }
);
