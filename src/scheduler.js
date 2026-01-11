import cron from 'node-cron';
import { getAllActiveSalespeople, getTasksDueForSalesperson, getTodaysBirthdays, getTodaysAnniversaries } from './database.js';
import { generateDigest } from './ai.js';

let botInstance = null;

export function setBotInstance(bot) { botInstance = bot; }

export function startScheduler() {
  const hour = process.env.DIGEST_HOUR || '7';
  const minute = process.env.DIGEST_MINUTE || '0';
  console.log(`Scheduling daily digest for ${hour}:${minute.padStart(2, '0')} (Mon-Sat)`);
  cron.schedule(`${minute} ${hour} * * 1-6`, async () => {
    console.log('Running daily digest...');
    const salespeople = await getAllActiveSalespeople();
    for (const sp of salespeople) {
      try {
        const [tasks, bdays, annis] = await Promise.all([getTasksDueForSalesperson(sp.id), getTodaysBirthdays(sp.id), getTodaysAnniversaries(sp.id)]);
        const digest = tasks.length || bdays.length || annis.length ? await generateDigest(tasks, bdays, annis, sp.name) : '✨ No tasks today!';
        await botInstance.telegram.sendMessage(sp.telegram_id, `☀️ Good morning ${sp.name}!\n\n${digest}`);
      } catch (e) { console.error(`Digest failed for ${sp.name}:`, e); }
    }
  }, { timezone: process.env.TIMEZONE || 'Africa/Johannesburg' });
}

export async function sendDigestToUser(chatId, odId, name) {
  const [tasks, bdays, annis] = await Promise.all([getTasksDueForSalesperson(spId), getTodaysBirthdays(spId), getTodaysAnniversaries(spId)]);
  const digest = tasks.length || bdays.length || annis.length ? await generateDigest(tasks, bdays, annis, name) : '✨ No tasks today!';
  await botInstance.telegram.sendMessage(chatId, digest);
}
