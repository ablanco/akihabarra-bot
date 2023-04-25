// Copyright (c) 2023 Alejandro Blanco <alejandro.b.e@gmail.com>
// MIT License

'use strict';

const mariadb = require('mariadb'),
    settings = require('./settings.js'),
    sqlstring = require('sqlstring');

const pool = mariadb.createPool({
    host: settings.database.host,
    user: settings.database.user,
    password: settings.database.password,
    database: settings.database.database,
    connectionLimit: settings.database.connectionLimit,
});

const sql = {};
// dateFormat = 'yyyy-LL-dd HH:mm';

sql.runQuery = async function (query) {
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

sql.getUser = async function (id) {
    const query = sqlstring.format('SELECT * FROM users WHERE id=?;', [id]);
    return sql.runQuery(query);
};

module.exports = sql;
