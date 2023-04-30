// Copyright (c) 2023 Alejandro Blanco <alejandro.b.e@gmail.com>
// MIT License

import { Markup } from 'telegraf';
import SQL from './sql.js';
import Utils from './utils.js';

const balance = async function (ctx) {
    console.log('Command: balance');

    const user = await Utils.getOrCreateUser(ctx.from);
    ctx.replyWithHTML(`Tu saldo es: ${user.balance}€`);
};

const depositStart = async function (ctx) {
    console.log('Command: depositStart');

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
    console.log('Command: depositEnd');

    const msg = ctx.update.message;
    let user, balance;

    user = await Utils.getOrCreateUser(msg.from);
    balance = parseFloat(user.balance) + parseFloat(msg.text);
    if (isNaN(balance)) {
        ctx.replyWithHTML('Inténtalo de nuevo con un número válido');
    }

    await SQL.updateBalance(ctx.from.id, balance);
    user = await Utils.getOrCreateUser(msg.from);

    ctx.replyWithHTML(`Tu nuevo saldo es: ${user.balance}€`);
};

const changeBalanceStart = async function (ctx) {
    console.log('Command: balanceStart');

    const user = await Utils.getOrCreateUser(ctx.from);
    ctx.replyWithHTML(
        [
            `Tu saldo actual es: ${user.balance}€.`,
            'Indica el nuevo saldo (reemplazo).',
        ].join('\n'),
        Markup.forceReply().placeholder('Por ejemplo: 2.50')
    );
};

const changeBalanceEnd = async function (ctx) {
    console.log('Command: balanceEnd');

    const msg = ctx.update.message;
    let user, balance;

    balance = parseFloat(msg.text);
    if (isNaN(balance)) {
        ctx.replyWithHTML('Inténtalo de nuevo con un número válido');
    }

    await SQL.updateBalance(ctx.from.id, balance);
    user = await Utils.getOrCreateUser(msg.from);

    ctx.replyWithHTML(`Tu nuevo saldo es: ${user.balance}€`);
};

const newArticleStart = async function (ctx) {
    console.log('Command: newArticleStart');

    ctx.replyWithHTML(
        ['Indica el nombre y el precio del nuevo artículo'].join('\n'),
        Markup.forceReply().placeholder('Por ejemplo: Pasarratos 0.35')
    );
};

const newArticleEnd = async function (ctx) {
    console.log('Command: newArticleEnd');

    const msg = ctx.update.message;
    const matches = /([a-zA-Z\s]+)([\d.]+)/.exec(msg.text);
    const name = matches[1];
    const price = matches[2];

    await SQL.createArticle(name, price);

    ctx.replyWithHTML('El artículo se ha guardado con éxito');
};

const prices = async function (ctx) {
    console.log('Command: prices');

    const articles = await Utils.getSortedArticles();
    ctx.replyWithHTML(
        articles
            .map((article) => {
                return `- ${article.name} => ${article.price}€`;
            })
            .join('\n')
    );
};

const buyStart = async function (ctx) {
    console.log('Command: buyStart');

    const articles = await Utils.getSortedArticles();

    ctx.reply(
        'Elige un artículo:',
        Markup.inlineKeyboard(
            articles.map((article) => {
                return Markup.button.callback(article.name, article.id);
            })
        )
    );
};

const buyEnd = async function (ctx) {
    console.log('Command: buyEnd');

    let user = await Utils.getOrCreateUser(ctx.update.callback_query.from);
    let article = await SQL.getArticle(ctx.match[0]);
    article = article[0];
    const balance = parseFloat(user.balance) - parseFloat(article.price);

    await SQL.updateBalance(ctx.from.id, balance);
    user = await Utils.getOrCreateUser(ctx.update.callback_query.from);

    ctx.replyWithHTML(
        [
            'Artículo comprado con éxito.',
            `Tu nuevo saldo es: ${user.balance}€.`,
        ].join('\n')
    );
};

export {
    balance,
    depositStart,
    depositEnd,
    changeBalanceStart,
    changeBalanceEnd,
    newArticleStart,
    newArticleEnd,
    prices,
    buyStart,
    buyEnd,
};
