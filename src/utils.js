// Copyright (c) 2023 Alejandro Blanco <alejandro.b.e@gmail.com>
// MIT License

import SQL from './sql.js';

const Utils = {};

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

export default Utils;
