// Copyright (c) 2023 Alejandro Blanco <alejandro.b.e@gmail.com>
// MIT License

// import SQL from './sql.js';
import SQL from './sql.js';
import Utils from './utils.js';

const balance = async function (ctx) {
    const user = await Utils.getOrCreateUser(ctx.from);
    ctx.replyWithHTML(`Tu saldo es: ${user.balance}€`);
};

const deposit = async function (ctx) {
    const user = await Utils.getOrCreateUser(ctx.from);
    let balance = parseFloat(user.balance);

    balance += 23.456;
    await SQL.updateBalance(ctx.from.id, balance);

    ctx.replyWithHTML(`Tu nuevo saldo es: ${balance}€`);
};

export { balance, deposit };
