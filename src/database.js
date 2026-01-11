import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const DEFAULT_DEALERSHIP_ID = '00000000-0000-0000-0000-000000000001';

export async function getOrCreateSalesperson(telegramId, username, name) {
  const { data: existing } = await supabase.from('salespeople').select('*').eq('telegram_id', telegramId).single();
  if (existing) return existing;
  const { data, error } = await supabase.from('salespeople').insert({ dealership_id: DEFAULT_DEALERSHIP_ID, telegram_id: telegramId, telegram_username: username, name }).select().single();
  if (error) throw error;
  return data;
}

export async function createLead(salespersonId, dealershipId, d) {
  const { data, error } = await supabase.from('leads').insert({ salesperson_id: salespersonId, dealership_id: dealershipId, name: d.name, phone: d.phone, vehicle_interest: d.vehicle_interest, trade_in: d.trade_in, intent_level: d.intent_level, next_action: d.next_action, next_action_date: d.next_action_date, birthday: d.birthday, notes: d.notes }).select().single();
  if (error) throw error;
  return data;
}

export async function createDeal(salespersonId, dealershipId, leadId, d) {
  const { data, error } = await supabase.from('deals').insert({ salesperson_id: salespersonId, dealership_id: dealershipId, lead_id: leadId, vehicle: d.vehicle, stage: d.stage, delivery_date: d.delivery_date, notes: d.notes }).select().single();
  if (error) throw error;
  return data;
}

export async function createTask(salespersonId, dealershipId, leadId, d) {
  const { data, error } = await supabase.from('tasks').insert({ salesperson_id: salespersonId, dealership_id: dealershipId, lead_id: leadId, action: d.action, description: d.description, due_date: d.due_date, urgency: d.urgency, status: 'pending' }).select().single();
  if (error) throw error;
  return data;
}

export async function createDeliveryMoment(salespersonId, dealershipId, leadId, d) {
  const { data, error } = await supabase.from('delivery_moments').insert({ salesperson_id: salespersonId, dealership_id: dealershipId, lead_id: leadId, vehicle: d.vehicle, delivery_date: d.delivery_date, notes: d.notes }).select().single();
  if (error) throw error;
  return data;
}

export async function createCaptureLog(salespersonId, dealershipId, d) {
  await supabase.from('capture_logs').insert({ salesperson_id: salespersonId, dealership_id: dealershipId, original_text: d.original_text, extracted_summary: d.extracted_summary, ai_response: d.ai_response, confidence_score: d.confidence_score, needs_clarification: d.needs_clarification, clarification_question: d.clarification_question });
}

export async function getTasksDueForSalesperson(salespersonId) {
  const { data } = await supabase.from('tasks').select('*, leads(name, phone, vehicle_interest)').eq('salesperson_id', salespersonId).eq('status', 'pending').lte('due_date', new Date().toISOString()).order('due_date');
  return data || [];
}

export async function getTodaysBirthdays(salespersonId) { return []; }
export async function getTodaysAnniversaries(salespersonId) { return []; }
export async function getAllActiveSalespeople() {
  const { data } = await supabase.from('salespeople').select('*').eq('is_active', true);
  return data || [];
}

export default supabase;
