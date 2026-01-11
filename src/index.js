import 'dotenv/config';

import bot from './bot.js';

import { startScheduler, setBotInstance } from './scheduler.js';

console.log('🚗 Dealer Second Brain starting...');

const required = ['TELEGRAM_BOT_TOKEN', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'SUPABASE_URL', 'SUPABASE_KEY'];

const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {

  console.error('❌ Missing:', missing.join(', '));

  process.exit(1);

}

console.log('✅ Environment validated');

setBotInstance(bot);

startScheduler();

console.log('✅ Scheduler started');

bot.launch().then(() => {

                    console.log('✅ Telegram bot running');

                    console.log('🎯 Ready to capture sales!');

});

process.once('SIGINT', () => bot.stop('SIGINT'));

process.once('SIGTERM', () => bot.stop('SIGTERM'));
