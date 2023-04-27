// Copyright (c) 2023 Alejandro Blanco <alejandro.b.e@gmail.com>
// MIT License

// import SQL from './sql.js';
import { Markup } from 'telegraf';
import SQL from './sql.js';
import Utils from './utils.js';

const balance = async function (ctx) {
    const user = await Utils.getOrCreateUser(ctx.from);
    ctx.replyWithHTML(`Tu saldo es: ${user.balance}€`);
};

const depositStart = async function (ctx) {
    const user = await Utils.getOrCreateUser(ctx.from);
    ctx.replyWithHTML(
        [
            `Tu saldo actual es: ${user.balance}€.`,
            'Indica en cuánto quieres incrementarlo.',
        ].join('\n'),
        Markup.forceReply().placeholder('Por ejemplo: 2.50')
    );
};

const depositEnd = async function (ctx) {
    const msg = ctx.update.message;
    let user, balance;

    if (
        !msg.reply_to_message ||
        msg.reply_to_message.text.indexOf('incrementarlo') < 0
    ) {
        return;
    }

    user = await Utils.getOrCreateUser(msg.from);
    balance = parseFloat(user.balance) + parseFloat(msg.text);

    if (isNaN(balance)) {
        ctx.replyWithHTML('Inténtalo de nuevo con un número válido');
    }

    await SQL.updateBalance(ctx.from.id, balance);
    user = await Utils.getOrCreateUser(msg.from);

    ctx.replyWithHTML(`Tu nuevo saldo es: ${user.balance}€`);
};

export { balance, depositStart, depositEnd };
