// Copyright (c) 2023 Alejandro Blanco <alejandro.b.e@gmail.com>
// MIT License

import SQL from './sql.js';

const Utils = {};

const compareArticles = (a, b) => {
    if (a.name < b.name) {
        return -1;
    }
    if (a.name > b.name) {
        return 1;
    }
    return 0;
};

Utils.getOrCreateUser = async function (from) {
    let user = await SQL.getUser(from.id);
    if (user.length === 0) {
        await SQL.createUser(
            from.id,
            from.first_name,
            from.last_name || '',
            from.username || ''
        );
        user = await SQL.getUser(from.id);
    }
    user = user[0];
    return user;
};

Utils.getSortedArticles = async function () {
    const articles = await SQL.getArticles();
    articles.sort(compareArticles);
    return articles;
};

Utils.splitIntoChunks = function (array, chunkSize) {
    const result = [];

    for (let i = 0; i < array.length; i += chunkSize) {
        result.push(array.slice(i, i + chunkSize));
    }

    return result;
};

export default Utils;
