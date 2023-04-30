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
} from './src/commands.js';

const bot = new Telegraf(Settings.token);

const helpHTML = [
    '/ayuda\n  Muestra este mensaje de ayuda',
    '/saldo\n  Muestra tu saldo actual',
    '/ingresar\n  Incrementa tu saldo actual (la cantidad se suma a lo que hubiera)',
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
bot.command('precios', prices);

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

bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
