// Copyright (c) 2023 Alejandro Blanco <alejandro.b.e@gmail.com>
// MIT License

import { Telegraf } from 'telegraf';
import Settings from './src/settings.js';

const bot = new Telegraf(Settings.token);

const helpHTML = ['/ayuda\n  Muestra este mensaje de ayuda'].join('\n');

bot.command('start', function (ctx) {
    ctx.replyWithHTML(helpHTML);
});
bot.command('ayuda', function (ctx) {
    ctx.replyWithHTML(helpHTML);
});

bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
