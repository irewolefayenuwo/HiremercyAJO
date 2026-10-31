import { supabase } from '../lib/supabase';

// ---------- types (mirror what the database functions return) ----------
export interface GameDef {
  key: string; name: string; tagline: string | null; tier: 'standard' | 'premium'; playable: boolean;
  entry_cost: number; listed_cost: number; difficulty: string; config: Record<string, any>;
}
export interface GameState {
  settings: { master: boolean; preview?: boolean; paid_play?: boolean; coin_purchases?: boolean; membership?: boolean; rewards?: boolean; purchase_instructions?: string | null };
  games: GameDef[];
  wallet: { balance: number; earned_today: number; total_earned: number; total_spent: number };
  membership: { active: boolean; plan_name?: string; expires_at?: string };
}
export interface LedgerRow { id: number; kind: string; amount: number; balance_after: number; note: string | null; created_at: string }
export interface CoinPackage { id: string; name: string; coins: number; bonus_coins: number; price_naira: number; badge: string | null }
export interface CoinOrder { id: string; coins: number; bonus_coins: number; price_naira: number; status: 'pending' | 'successful' | 'failed' | 'refunded' | 'cancelled'; created_at: string }
export interface Plan { id: string; name: string; price_naira: number; period: 'monthly' | 'quarterly' | 'yearly'; benefits: string[]; included_games: string[]; popular: boolean }
export interface BrainQuestion { category: string; category_name: string | null; text: string; options: string[]; as_of: string | null }
export interface BrainPayload {
  session_id?: string; status: string; finished: boolean; index?: number; total: number; score: number;
  timer_seconds?: number; seconds_left?: number; question?: BrainQuestion; reward?: number;
}
export interface BrainAnswer {
  finished: boolean; correct?: boolean; correct_index?: number; explanation?: string | null; timed_out?: boolean; won?: boolean;
  status?: string; score: number; total: number; reward?: number; bonus?: number; balance?: number; multiplier?: number;
  next?: BrainPayload; stale?: boolean; replay?: boolean;
}

export type Result<T> = { ok: true; data: T } | { ok: false; code: string; message: string };

// ---------- friendly errors (the database raises short codes) ----------
const FRIENDLY: [string, string][] = [
  ['INSUFFICIENT_COINS', 'You do not have enough game coins for this.'],
  ['GAMES_OFF', 'The Gaming Centre is closed right now. Please check back soon.'],
  ['GAME_OFF', 'This game is not available right now.'],
  ['NOT_ENOUGH_QUESTIONS', 'Not enough questions are available right now. Please try again later.'],
  ['PURCHASES_OFF', 'Coin purchases are not open yet.'],
  ['PACKAGE_NOT_FOUND', 'That coin package is no longer available.'],
  ['SESSION_NOT_FOUND', 'This round has already ended. Start a new round.'],
  ['NOT_AUTHENTICATED', 'Please log in again.'],
  ['FORBIDDEN', 'Only admins can do this.'],
  ['PAYMENT_REFERENCE_REQUIRED', 'Enter the payment reference (at least 4 characters).'],
  ['game_coin_orders_ref', 'This payment reference has already been used for another order.'],
  ['ORDER_NOT_PENDING', 'This order is no longer pending.'],
  ['ORDER_NOT_SUCCESSFUL', 'Only a successful order can be refunded.'],
  ['REASON_REQUIRED', 'Please enter a reason (at least 3 characters).'],
  ['CUSTOMER_NOT_FOUND', 'Customer not found.'],
  ['INVALID_AMOUNT', 'Enter a valid amount.']
];
export function friendly(raw?: string | null): { code: string; message: string } {
  const m = String(raw || '');
  for (const [k, v] of FRIENDLY) if (m.includes(k)) return { code: k, message: v };
  const detail = m.match(/(INVALID_[A-Z]+|INVALID_[A-Z_]+):\s*([^\n]{3,140})/);
  if (detail) return { code: detail[1], message: detail[2].trim() };
  if (m.toLowerCase().includes('violates check constraint')) return { code: 'CHECK', message: 'One of the values is outside the allowed range.' };
  return { code: 'FAILED', message: 'Something went wrong. Please try again.' };
}

export async function gameRpc<T = any>(name: string, args?: Record<string, unknown>): Promise<Result<T>> {
  try {
    const { data, error } = await supabase.rpc(name, args as any);
    if (error) return { ok: false, ...friendly(error.message) };
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, code: 'NETWORK', message: 'Could not reach the server. Check your connection and try again.' };
  }
}

// One cached read feeds the whole Gaming Centre (keeps database requests low).
let cache: { at: number; v: GameState } | null = null;
export function invalidateGameState() { cache = null; }
export async function loadGameState(force = false): Promise<Result<GameState>> {
  if (!force && cache && Date.now() - cache.at < 20_000) return { ok: true, data: cache.v };
  const r = await gameRpc<GameState>('game_center_state');
  if (r.ok) cache = { at: Date.now(), v: r.data };
  return r;
}

export function newKey(): string {
  try { const c: any = (globalThis as any).crypto; if (c?.randomUUID) return c.randomUUID(); } catch { /* fall through */ }
  return `k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export const KIND_LABEL: Record<string, string> = {
  purchase: 'Coin purchase', entry: 'Game entry', reward: 'Game reward', bonus: 'Bonus reward', refund: 'Refund',
  admin_grant: 'Coins added by admin', admin_adjust: 'Adjustment by admin', membership: 'Membership'
};

// ---------- bulk question import (Admin) ----------
// One question per line:  category | difficulty | question | A | B | C | D | correct (A-D) | explanation | as-of date | valid-until date
export interface ImportRow { category: string; difficulty: number; question: string; options: string[]; correct_index: number; explanation: string | null; as_of: string | null; valid_until: string | null }
export function parseQuestionLines(text: string, categories: { key: string; name: string }[]): { rows: ImportRow[]; errors: { line: number; error: string }[] } {
  const rows: ImportRow[] = []; const errors: { line: number; error: string }[] = [];
  const diffMap: Record<string, number> = { '1': 1, '2': 2, '3': 3, easy: 1, medium: 2, hard: 3 };
  const date = /^\d{4}-\d{2}-\d{2}$/;
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim(); if (!line || line.startsWith('#')) return;
    const p = line.split('|').map(s => s.trim());
    const fail = (e: string) => errors.push({ line: i + 1, error: e });
    if (p.length < 8) return fail('Needs at least 8 parts separated by |');
    const cat = categories.find(c => c.key.toLowerCase() === p[0].toLowerCase() || c.name.toLowerCase() === p[0].toLowerCase());
    if (!cat) return fail(`Unknown category "${p[0]}"`);
    const diff = diffMap[p[1].toLowerCase()]; if (!diff) return fail('Difficulty must be 1, 2, 3, easy, medium or hard');
    if (p[2].length < 5 || p[2].length > 300) return fail('Question must be 5 to 300 characters');
    const options = p.slice(3, 7);
    if (options.some(o => !o || o.length > 120)) return fail('All four options need 1 to 120 characters');
    if (new Set(options.map(o => o.toLowerCase())).size !== 4) return fail('The four options must be different');
    const ci = 'ABCD'.indexOf((p[7] || '').toUpperCase());
    if (ci < 0 || (p[7] || '').length !== 1) return fail('Correct answer must be A, B, C or D');
    const asOf = p[9] || null; const validUntil = p[10] || null;
    if ((asOf && !date.test(asOf)) || (validUntil && !date.test(validUntil))) return fail('Dates must look like 2026-12-31');
    if (cat.key === 'current_affairs' && !asOf) return fail('Current Affairs questions need an as-of date');
    rows.push({ category: cat.key, difficulty: diff, question: p[2], options, correct_index: ci, explanation: p[8] || null, as_of: asOf, valid_until: validUntil });
  });
  return { rows, errors };
}
