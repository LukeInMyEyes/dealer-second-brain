import OpenAI from 'openai';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import os from 'os';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function downloadTelegramFile(bot, fileId) {
  const fileLink = await bot.telegram.getFileLink(fileId);
  const response = await axios.get(fileLink.href, { responseType: 'arraybuffer' });
  return Buffer.from(response.data);
}

export async function transcribeWithRetry(audioBuffer, retries = 2) {
  const tempPath = path.join(os.tmpdir(), `voice_${Date.now()}.ogg`);
  for (let i = 0; i <= retries; i++) {
    try {
      fs.writeFileSync(tempPath, audioBuffer);
      const transcription = await openai.audio.transcriptions.create({ file: fs.createReadStream(tempPath), model: 'whisper-1', language: 'en' });
      fs.unlinkSync(tempPath);
      return transcription.text;
    } catch (e) {
      if (i === retries) throw e;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}
