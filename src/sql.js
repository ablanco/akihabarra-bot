// Copyright (c) 2023 Alejandro Blanco <alejandro.b.e@gmail.com>
// MIT License

'use strict';

import MariaDB from 'mariadb';
import Settings from './settings.js';
import SqlString from 'sqlstring';
import emojiRegex from 'emoji-regex';

const pool = MariaDB.createPool({
    host: Settings.database.host,
    user: Settings.database.user,
    password: Settings.database.password,
    database: Settings.database.database,
    connectionLimit: Settings.database.connectionLimit,
});

const removeEmojis = function (input) {
    return input.replace(emojiRegex(), '');
};

const SQL = {};
// dateFormat = 'yyyy-LL-dd HH:mm';

SQL.runQuery = async function (query) {
    let conn;

    try {
        conn = await pool.getConnection();
        return conn.query(query);
    } finally {
        if (conn) {
            conn.end();
        }
    }
};

SQL.getUser = async function (id) {
    const query = SqlString.format('SELECT * FROM users WHERE id=?;', [id]);
    return SQL.runQuery(query);
};

SQL.createUser = async function (id, first, last, username) {
    const query = SqlString.format(
        'INSERT INTO users (id, first_name, last_name, username) VALUES (?, ?, ?, ?);',
        [id, removeEmojis(first), removeEmojis(last), username]
    );
    return SQL.runQuery(query);
};

SQL.updateBalance = async function (id, newBalance) {
    const query = SqlString.format('UPDATE users SET balance=? WHERE id=?;', [
        newBalance,
        id,
    ]);
    return SQL.runQuery(query);
};

SQL.getArticles = async function () {
    return SQL.runQuery('SELECT * FROM articles;');
};

SQL.getArticle = async function (id) {
    const query = SqlString.format('SELECT * FROM articles WHERE id=?;', [id]);
    return SQL.runQuery(query);
};

SQL.createArticle = async function (name, price) {
    const query = SqlString.format(
        'INSERT INTO articles (name, price) VALUES (?, ?);',
        [removeEmojis(name), price]
    );
    return SQL.runQuery(query);
};

SQL.deleteArticle = async function (id) {
    const query = SqlString.format('DELETE FROM articles WHERE id=?;', [id]);
    return SQL.runQuery(query);
};

SQL.getSales = async function (userId, salesNumber = 10) {
    const query = SqlString.format(
        'SELECT * FROM sales WHERE user=? ORDER BY created DESC LIMIT ?;',
        [userId, salesNumber]
    );
    return SQL.runQuery(query);
};

SQL.registerSale = async function (userId, article, price) {
    const query = SqlString.format(
        'INSERT INTO sales (user, article, price) VALUES (?, ?, ?);',
        [userId, article, price]
    );
    return SQL.runQuery(query);
};

SQL.deleteSale = async function (id) {
    const query = SqlString.format('DELETE FROM sales WHERE id=?;', [id]);
    return SQL.runQuery(query);
};

SQL.getSalesStats = async function (userId) {
    const query = SqlString.format(
        'SELECT article, COUNT(*) as "count" FROM sales WHERE user=? GROUP BY article;',
        [userId]
    );
    return SQL.runQuery(query);
};

SQL.getSalesGlobalStats = async function () {
    const query =
        'SELECT article, COUNT(*) as "count" FROM sales GROUP BY article;';
    return SQL.runQuery(query);
};

export default SQL;
