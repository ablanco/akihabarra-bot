// Copyright (c) 2023 Alejandro Blanco <alejandro.b.e@gmail.com>
// MIT License

import { Telegraf } from 'telegraf';
import Settings from './src/settings.js';

const bot = new Telegraf(Settings.token);

bot.command('help', function (ctx) {
    ctx.replyWithHTML(['/ayuda\n  Muestra este mensaje de ayuda'].join('\n'));
});

bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
