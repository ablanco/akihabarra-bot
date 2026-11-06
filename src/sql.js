// Copyright (c) 2023 Alejandro Blanco <alejandro.b.e@gmail.com>
// MIT License

'use strict';

import MariaDB from 'mariadb';
import Settings from './settings.js';
import pg from 'pg';
import emojiRegex from 'emoji-regex';

const removeEmojis = function (input) {
    return input.replace(emojiRegex(), '');
};

// Query templates here contain placeholders only, never literal question marks.
export function createSQL(config) {
    const engine = config.engine || 'mariadb';
    if (!['mariadb', 'postgresql'].includes(engine)) {
        throw new Error('DB_ENGINE must be mariadb or postgresql');
    }
    const options = {
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
    };
    let pool;
    const getPool = () =>
        (pool ??=
            engine === 'postgresql'
                ? new pg.Pool({ ...options, max: config.connectionLimit })
                : MariaDB.createPool({
                      ...options,
                      connectionLimit: config.connectionLimit,
                      timezone: '+00:00',
                      dateStrings: true,
                  }));
    const userColumn = engine === 'postgresql' ? '"user"' : '`user`';
    const SQL = {};

    SQL.runQuery = async function (query, values = []) {
        if (engine === 'postgresql') {
            let index = 0;
            const text = query.replace(/\?/g, () => `$${++index}`);
            return (await getPool().query(text, values)).rows;
        }
        const result = await getPool().query(query, values);
        // Older MariaDB connectors parse UTC session timestamps as local dates.
        // Read strings and attach UTC explicitly to preserve the stored instant.
        if (Array.isArray(result)) {
            for (const row of result) {
                for (const column of ['created', 'modified']) {
                    if (typeof row[column] === 'string') {
                        row[column] = new Date(
                            row[column].replace(' ', 'T') + 'Z'
                        );
                    }
                }
            }
        }
        return result;
    };

    SQL.close = async () => {
        if (pool) {
            await pool.end();
        }
    };

    SQL.getUser = async function (id) {
        return SQL.runQuery('SELECT * FROM users WHERE id=?;', [id]);
    };

    SQL.createUser = async function (id, first, last, username) {
        return SQL.runQuery(
            'INSERT INTO users (id, first_name, last_name, username) VALUES (?, ?, ?, ?);',
            [id, removeEmojis(first), removeEmojis(last), username]
        );
    };

    SQL.updateBalance = async function (id, newBalance) {
        return SQL.runQuery('UPDATE users SET balance=? WHERE id=?;', [
            newBalance,
            id,
        ]);
    };

    SQL.getArticles = async function () {
        return SQL.runQuery('SELECT * FROM articles;');
    };

    SQL.getArticle = async function (id) {
        return SQL.runQuery('SELECT * FROM articles WHERE id=?;', [id]);
    };

    SQL.createArticle = async function (name, price) {
        return SQL.runQuery(
            'INSERT INTO articles (name, price) VALUES (?, ?);',
            [removeEmojis(name), price]
        );
    };

    SQL.deleteArticle = async function (id) {
        return SQL.runQuery('DELETE FROM articles WHERE id=?;', [id]);
    };

    SQL.getSales = async function (userId, salesNumber = 10) {
        return SQL.runQuery(
            `SELECT * FROM sales WHERE ${userColumn}=? ORDER BY created DESC, id DESC LIMIT ?;`,
            [userId, salesNumber]
        );
    };

    SQL.registerSale = async function (userId, article, price) {
        return SQL.runQuery(
            `INSERT INTO sales (${userColumn}, article, price) VALUES (?, ?, ?);`,
            [userId, article, price]
        );
    };

    SQL.deleteSale = async function (id) {
        return SQL.runQuery('DELETE FROM sales WHERE id=?;', [id]);
    };

    SQL.getSalesStats = async function (userId) {
        return SQL.runQuery(
            `SELECT article, COUNT(*) as "count" FROM sales WHERE ${userColumn}=? GROUP BY article;`,
            [userId]
        );
    };

    SQL.getSalesGlobalStats = async function () {
        return SQL.runQuery(
            'SELECT article, COUNT(*) as "count" FROM sales GROUP BY article;'
        );
    };

    return SQL;
}

export default createSQL(Settings.database);
