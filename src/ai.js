import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are Dealer Second Brain, an AI sales memory assistant for car dealership salespeople. Extract customer details from voice notes and return JSON only.

OUTPUT FORMAT (JSON only, no other text):
{
  "lead": { "name": "string", "phone": "string or null", "vehicle_interest": "string or null", "trade_in": "string or null", "intent_level": "low|medium|high", "next_action": "string or null", "next_action_date": "ISO datetime or null", "birthday": "ISO date or null", "notes": "string" } or null,
  "deal": { "vehicle": "string", "stage": "appointment_set|test_drive|negotiation|sold|lost", "delivery_date": "ISO date or null", "notes": "string" } or null,
  "tasks": [{ "action": "call|whatsapp|remind|email|meet|other", "description": "string", "due_date": "ISO datetime", "urgency": "normal|high" }],
  "delivery_moment": { "vehicle": "string", "delivery_date": "ISO date", "notes": "string" } or null,
  "log": { "extracted_summary": "string", "confidence_score": 0.0-1.0, "needs_clarification": boolean, "clarification_question": "string or null" },
  "telegram_reply": "Short confirmation message with emojis"
}

RULES:
- Never invent phone numbers or dates not mentioned
- Convert relative dates (Saturday, tomorrow) using current_datetime
- HIGH intent: "super keen", "ready to buy", "coming in"
- MEDIUM intent: "interested", "thinking about"
- LOW intent: "just looking", "maybe later"`;

export async function processCapture(input) {
  const userMessage = JSON.stringify({ message_type: input.messageType, content: input.content, salesperson_name: input.salespersonName, current_datetime: input.currentDatetime, timezone: input.timezone });
  try {
    const response = await anthropic.messages.create({ model: 'claude-sonnet-4-20250514', max_tokens: 2048, system: SYSTEM_PROMPT, messages: [{ role: 'user', content: userMessage }] });
    const parsed = JSON.parse(response.content[0].text);
    return { success: true, data: parsed };
  } catch (error) { console.error('AI error:', error); return { success: false, error: error.message }; }
}

export async function generateDigest(tasks, birthdays, anniversaries, name) {
  try {
    const response = await anthropic.messages.create({ model: 'claude-sonnet-4-20250514', max_tokens: 500, messages: [{ role: 'user', content: `Generate brief daily digest for ${name}. Tasks: ${JSON.stringify(tasks)}. Birthdays: ${JSON.stringify(birthdays)}. Anniversaries: ${JSON.stringify(anniversaries)}. Use emojis, keep short.` }] });
    return response.content[0].text;
  } catch (e) { return '📋 Could not generate digest.'; }
}
