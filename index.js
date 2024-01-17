// Copyright (c) 2023 Alejandro Blanco <alejandro.b.e@gmail.com>
// MIT License

import { Telegraf } from 'telegraf';
import Settings from './src/settings.js';

import {
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
    sales,
    deleteArticleStart,
    deleteArticleEnd,
    undo,
    stats,
    globalStats,
} from './src/commands.js';

const bot = new Telegraf(Settings.token);

const helpHTML = [
    '/ayuda\n  Muestra este mensaje de ayuda',
    '/saldo\n  Muestra tu saldo actual',
    '/ingresar\n  Incrementa tu saldo actual (la cantidad se suma a lo que hubiera)',
    '/modificar\n  Cambia tu saldo actual (reemplaza el valor que hubiera)',
    '/nuevo\n  Añade un artículo nuevo',
    '/borrar\n  Elimina un artículo existente',
    '/precios\n  Muestra el listado de artículos y sus precios',
    '/comprar\n  Elige un artículo y decuéntalo de tu saldo',
    '/historial\n  Revisa tus últimas 10 compras',
    '/deshacer\n  Deshace la última compra realizada',
    '/estadisticas\n  Muestra tus productos más comprados',
    '/estadisticasGlobales\n  Muestra los productos más comprados por todos los usuarios',
].join('\n');

bot.command('start', (ctx) => {
    ctx.replyWithHTML(helpHTML);
});
bot.command('ayuda', (ctx) => {
    ctx.replyWithHTML(helpHTML);
});

bot.command('saldo', balance);
bot.command('ingresar', depositStart);
bot.command('modificar', changeBalanceStart);
bot.command('nuevo', newArticleStart);
bot.command('borrar', deleteArticleStart);
bot.command('precios', prices);
bot.command('comprar', buyStart);
bot.command('historial', sales);
bot.command('deshacer', undo);
bot.command('estadisticas', stats);
bot.command('estadisticasGlobales', globalStats);

bot.hears(/^[\d.]+$/, (ctx) => {
    console.log('Hears: depositEnd & changeBalanceEnd');
    const msg = ctx.update.message;

    if (msg.reply_to_message) {
        if (msg.reply_to_message.text.indexOf('incrementarlo') > 0) {
            depositEnd(ctx);
        } else if (msg.reply_to_message.text.indexOf('reemplazo') > 0) {
            changeBalanceEnd(ctx);
        }
    }
});
bot.hears(/^[a-zA-Z\s]+[\d.]+$/, (ctx) => {
    console.log('Hears: newArticleEnd');

    newArticleEnd(ctx);
});

bot.action(/d.+/, deleteArticleEnd);
bot.action(/b.+/, buyEnd);

bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
