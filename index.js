// Copyright (c) 2023 Alejandro Blanco <alejandro.b.e@gmail.com>
// MIT License

import { Telegraf } from 'telegraf';
import Settings from './src/settings.js';

import { balance, depositStart, depositEnd } from './src/commands.js';

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
bot.hears(/[\d.]+/, depositEnd);

bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
