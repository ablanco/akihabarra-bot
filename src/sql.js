// Copyright (c) 2023 Alejandro Blanco <alejandro.b.e@gmail.com>
// MIT License

'use strict';

import MariaDB from 'mariadb';
import Settings from './settings.js';
import SqlString from 'sqlstring';

const pool = MariaDB.createPool({
    host: Settings.database.host,
    user: Settings.database.user,
    password: Settings.database.password,
    database: Settings.database.database,
    connectionLimit: Settings.database.connectionLimit,
});

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
        [id, first, last, username]
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
        [name, price]
    );
    return SQL.runQuery(query);
};

SQL.getSales = async function (userId) {
    const query = SqlString.format(
        'SELECT * FROM sales WHERE user=? ORDER BY created DESC LIMIT 10;',
        [userId]
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

export default SQL;
