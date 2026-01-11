import { Telegraf } from 'telegraf';
import { downloadTelegramFile, transcribeWithRetry } from './transcription.js';
import { processCapture } from './ai.js';
import { getOrCreateSalesperson, createLead, createDeal, createTask, createDeliveryMoment, createCaptureLog } from './database.js';
import { sendDigestToUser } from './scheduler.js';

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

async function saveToDatabase(salesperson, aiData) {
  const results = { lead: null, deal: null, tasks: [], deliveryMoment: null };
  try {
    if (aiData.lead) results.lead = await createLead(salesperson.id, salesperson.dealership_id, aiData.lead);
    if (aiData.deal && results.lead) results.deal = await createDeal(salesperson.id, salesperson.dealership_id, results.lead.id, aiData.deal);
    if (aiData.tasks && aiData.tasks.length > 0) {
      for (const taskData of aiData.tasks) {
        const task = await createTask(salesperson.id, salesperson.dealership_id, results.lead?.id || null, taskData);
        results.tasks.push(task);
      }
    }
    if (aiData.delivery_moment && results.lead) results.deliveryMoment = await createDeliveryMoment(salesperson.id, salesperson.dealership_id, results.lead.id, aiData.delivery_moment);
    await createCaptureLog(salesperson.id, salesperson.dealership_id, { original_text: aiData.log?.original_text || '', extracted_summary: aiData.log?.extracted_summary || '', ai_response: aiData, confidence_score: aiData.log?.confidence_score || 0, needs_clarification: aiData.log?.needs_clarification || false, clarification_question: aiData.log?.clarification_question || null });
  } catch (error) { console.error('Database save error:', error); throw error; }
  return results;
}

async function handleCapture(ctx, content, messageType) {
  try {
    const salesperson = await getOrCreateSalesperson(ctx.from.id, ctx.from.username, ctx.from.first_name + (ctx.from.last_name ? ` ${ctx.from.last_name}` : ''));
    const aiResult = await processCapture({ messageType, content, salespersonName: salesperson.name, currentDatetime: new Date().toISOString(), timezone: process.env.TIMEZONE || 'Africa/Johannesburg' });
    if (!aiResult.success) return { success: false, reply: '❌ Sorry, I had trouble understanding that. Please try again.' };
    await saveToDatabase(salesperson, aiResult.data);
    return { success: true, reply: aiResult.data.telegram_reply || '✅ Captured!' };
  } catch (error) { console.error('Capture handling error:', error); return { success: false, reply: '❌ Something went wrong. Please try again.' }; }
}

bot.command('start', async (ctx) => {
  try { await getOrCreateSalesperson(ctx.from.id, ctx.from.username, ctx.from.first_name); } catch (e) {}
  await ctx.reply(`🚗 Welcome to Dealer Second Brain!\n\nSend me a voice note or text about a customer.\n\nCommands:\n/today - Get today's tasks\n/help - Show help`);
});

bot.command('help', async (ctx) => { await ctx.reply(`Send a voice note like:\n"Spoke to John about the Honda Jazz, super keen, coming Saturday at 10"\n\nTo fix something, start with FIX:\n"FIX: It's Sunday not Saturday"`); });

bot.command('today', async (ctx) => {
  const msg = await ctx.reply('⏳ Getting your tasks...');
  try {
    const sp = await getOrCreateSalesperson(ctx.from.id, ctx.from.username, ctx.from.first_name);
    await sendDigestToUser(ctx.chat.id, sp.id, sp.name);
    await ctx.telegram.deleteMessage(ctx.chat.id, msg.message_id);
  } catch (e) { await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null, '❌ Error getting tasks.'); }
});

bot.on('voice', async (ctx) => {
  const msg = await ctx.reply('🎤 Transcribing...');
  try {
    const audio = await downloadTelegramFile(bot, ctx.message.voice.file_id);
    await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null, '🧠 Processing...');
    const text = await transcribeWithRetry(audio);
    const result = await handleCapture(ctx, text, 'voice_transcription');
    await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null, result.reply);
  } catch (e) { await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null, '❌ Error processing voice note.'); }
});

bot.on('text', async (ctx) => {
  if (ctx.message.text.startsWith('/')) return;
  const msg = await ctx.reply('🧠 Processing...');
  try {
    const result = await handleCapture(ctx, ctx.message.text, ctx.message.text.toUpperCase().startsWith('FIX:') ? 'correction' : 'text_message');
    await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null, result.reply);
  } catch (e) { await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null, '❌ Error processing message.'); }
});

bot.catch((err) => console.error('Bot error:', err));
export default bot;
