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

const deleteArticleStart = async function (ctx) {
    console.log('Command: deleteArticleStart');

    const articles = await Utils.getSortedArticles();

    ctx.reply(
        'Elige un artículo para borrar:',
        Markup.inlineKeyboard(
            Utils.splitIntoChunks(
                articles.map((article) => {
                    return Markup.button.callback(
                        article.name,
                        `d${article.id}`
                    );
                }),
                2
            )
        )
    );
};

const deleteArticleEnd = async function (ctx) {
    console.log('Command: deleteArticleEnd');

    await SQL.deleteArticle(ctx.match[0].slice(1));

    ctx.replyWithHTML(['Artículo borrado con éxito'].join('\n'));
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
        'Elige un artículo para comprar:',
        Markup.inlineKeyboard(
            Utils.splitIntoChunks(
                articles.map((article) => {
                    return Markup.button.callback(
                        article.name,
                        `b${article.id}`
                    );
                }),
                2
            )
        )
    );
};

const buyEnd = async function (ctx) {
    console.log('Command: buyEnd');

    let user = await Utils.getOrCreateUser(ctx.update.callback_query.from);
    let article = await SQL.getArticle(ctx.match[0].slice(1));
    article = article[0];

    if (article == null) {
        ctx.replyWithHTML('Artículo no encontrado. Prueba a /comprar de nuevo.');
        return;
    }

    const balance = parseFloat(user.balance) - parseFloat(article.price);

    await SQL.updateBalance(ctx.from.id, balance);
    user = await Utils.getOrCreateUser(ctx.update.callback_query.from);

    await SQL.registerSale(user.id, article.name, article.price);

    ctx.replyWithHTML(
        [
            `Artículo <i>${article.name}(${article.price}€)</i> comprado con éxito.`,
            `Tu nuevo saldo es: ${user.balance}€.`,
        ].join('\n')
    );
};

const sales = async function (ctx) {
    console.log('Command: sales');

    const user = await Utils.getOrCreateUser(ctx.from);
    const history = await SQL.getSales(user.id);
    const response = ['Estas son tus últimas 10 compras:'];

    ctx.replyWithHTML(
        response
            .concat(
                history.map((sale) => {
                    return [
                        ' - ',
                        sale.article,
                        ' ',
                        sale.price,
                        '€     (',
                        sale.created.toLocaleDateString('es-ES'),
                        ' ',
                        sale.created.toLocaleTimeString('es-ES'),
                        ')',
                    ].join('');
                })
            )
            .join('\n')
    );
};

const undo = async function (ctx) {
    console.log('Command: undo');

    let response;
    let user = await Utils.getOrCreateUser(ctx.from);
    const lastSales = await SQL.getSales(user.id, 1);
    const lastSale = lastSales[0];

    if (lastSale == null) {
        response = 'No tienes ninguna compra registrada para deshacer.';
    } else {
        await SQL.deleteSale(lastSale.id);
        const newBalance =
            parseFloat(user.balance) + parseFloat(lastSale.price);
        await SQL.updateBalance(user.id, newBalance);
        user = await Utils.getOrCreateUser(ctx.from);

        response = `La compra de ${lastSale.article} por ${lastSale.price}€ ha sido deshecha.\nSu saldo vuelve a ser ${user.balance}€`;
    }

    ctx.replyWithHTML(response);
};

const stats = async function (ctx) {
    console.log('Command: stats');

    const user = await Utils.getOrCreateUser(ctx.from);
    const stats = await SQL.getSalesStats(user.id);

    ctx.replyWithHTML(
        stats
            .map((entry) => {
                return `- ${entry.article}: ${entry.count}`;
            })
            .join('\n')
    );
};

const globalStats = async function (ctx) {
    console.log('Command: global stats');

    const stats = await SQL.getSalesGlobalStats();

    ctx.replyWithHTML(
        stats
            .map((entry) => {
                return `- ${entry.article}: ${entry.count}`;
            })
            .join('\n')
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
    deleteArticleStart,
    deleteArticleEnd,
    prices,
    buyStart,
    buyEnd,
    sales,
    undo,
    stats,
    globalStats,
};
