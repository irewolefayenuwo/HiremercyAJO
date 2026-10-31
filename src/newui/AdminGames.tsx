import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { KIND_LABEL, friendly, newKey, parseQuestionLines } from './gameApi';

type Toast = (m: string, t?: 'success' | 'error') => void;
const naira = (n: any) => `₦${Number(n || 0).toLocaleString()}`;
const dt = (s?: string | null) => (s ? new Date(s).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-');
const box = 'bg-white rounded-2xl border border-slate-200 p-4';
const inp = 'w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold outline-none focus:border-emerald-500';
const btn = 'px-3 py-2 rounded-lg text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50';
const btn2 = 'px-3 py-2 rounded-lg text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50';
const lbl = 'block text-[11px] font-bold text-slate-600';

async function call<T = any>(name: string, args: Record<string, unknown> | undefined, toast: Toast, okMsg?: string): Promise<{ ok: boolean; data: T | null }> {
  const { data, error } = await supabase.rpc(name, args as any);
  if (error) { toast(friendly(error.message).message, 'error'); return { ok: false, data: null }; }
  if (okMsg) toast(okMsg, 'success');
  return { ok: true, data: data as T };
}

function Toggle({ on, onChange, label, hint, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0"><p className="text-sm font-black text-slate-900">{label}</p>{hint && <p className="text-[11px] text-slate-500 font-medium">{hint}</p>}</div>
      <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)}
        className={`shrink-0 w-14 h-8 rounded-full relative transition ${on ? 'bg-emerald-600' : 'bg-slate-300'} disabled:opacity-50`}>
        <span className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all ${on ? 'left-7' : 'left-1'}`} /></button>
    </div>
  );
}

const SECTIONS = [
  ['overview', 'Overview'], ['games', 'Individual Game Controls'], ['packages', 'Coin Packages and Pricing'], ['questions', 'Questions and Categories'],
  ['rewards', 'Game Rewards'], ['membership', 'Premium Membership'], ['transactions', 'Customer Game Transactions'],
  ['reports', 'Game Activity and Reports'], ['promotions', 'Promotions'], ['security', 'Security and Audit Logs']
] as const;
type Sec = typeof SECTIONS[number][0];

interface Cfg { settings: any; games: any[]; categories: any[] }

export function GameManagementPanel({ toast }: { toast: Toast }) {
  const [sec, setSec] = useState<Sec>('overview');
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    const r = await call<Cfg>('admin_game_get_config', undefined, toast);
    if (r.ok && r.data) { setCfg(r.data); setFailed(false); } else setFailed(true);
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4" id="admin-game-management">
      <div><h3 className="text-xl font-black text-slate-900">Game Management</h3>
        <p className="text-xs text-slate-500 font-medium">Control the Gaming Centre without editing code. Changes apply immediately.</p></div>
      <div className="lg:flex lg:gap-5 lg:items-start">
        <nav className="lg:w-60 shrink-0 flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 -mx-1 px-1" aria-label="Game Management sections">
          {SECTIONS.map(([k, l]) => (
            <button key={k} type="button" onClick={() => setSec(k)} aria-current={sec === k ? 'page' : undefined}
              className={`shrink-0 text-left px-3 py-2.5 rounded-xl text-xs font-bold ${sec === k ? 'bg-emerald-700 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-emerald-50'}`}>{l}</button>))}
        </nav>
        <div className="flex-1 min-w-0 space-y-4">
          {failed && <p className={`${box} text-xs text-red-600 font-semibold`}>Could not load Game Management. The gaming database update (GAMES_01 and GAMES_02) may not be installed yet, or you are not an admin.</p>}
          {!failed && !cfg && <p className="text-xs text-slate-500">Loading...</p>}
          {cfg && sec === 'overview' && <Overview cfg={cfg} reload={load} toast={toast} />}
          {cfg && sec === 'games' && <Games cfg={cfg} reload={load} toast={toast} />}
          {sec === 'packages' && cfg && <Packages toast={toast} />}
          {cfg && sec === 'questions' && <Questions cfg={cfg} reload={load} toast={toast} />}
          {cfg && sec === 'rewards' && <Rewards cfg={cfg} reload={load} toast={toast} />}
          {cfg && sec === 'membership' && <Membership cfg={cfg} toast={toast} />}
          {cfg && sec === 'transactions' && <Transactions toast={toast} />}
          {cfg && sec === 'reports' && <Reports toast={toast} />}
          {cfg && sec === 'promotions' && <Promotions cfg={cfg} toast={toast} />}
          {cfg && sec === 'security' && <Security toast={toast} />}
        </div>
      </div>
    </div>
  );
}

// ======================================================= 1. Overview
function Overview({ cfg, reload, toast }: { cfg: Cfg; reload: () => void; toast: Toast }) {
  const s = cfg.settings;
  const [ov, setOv] = useState<any>(null);
  const [cap, setCap] = useState<string>(s.daily_reward_cap == null ? '' : String(s.daily_reward_cap));
  const [ins, setIns] = useState<string>(s.purchase_instructions || '');
  useEffect(() => { (async () => { const r = await call('admin_game_overview', undefined, toast); if (r.ok) setOv(r.data); })(); }, [toast, cfg]);
  const save = async (p: Record<string, unknown>, msg: string) => { const r = await call('admin_game_save_settings', { p }, toast, msg); if (r.ok) reload(); };
  const sw = (key: string, v: boolean, label: string, warn?: string) => {
    if (v && warn && !window.confirm(warn)) return;
    save({ [key]: v }, `${label} ${v ? 'ON' : 'OFF'}`);
  };
  const stats: [string, any][] = ov ? [['Games switched on', ov.games_on], ['Active questions', ov.questions_active], ['Rounds today', ov.sessions_today], ['Players today', ov.players_today],
    ['Wins today', ov.wins_today], ['Entry coins today', Number(ov.entry_coins_today).toLocaleString()], ['Reward coins today', Number(ov.reward_coins_today).toLocaleString()],
    ['Coins in circulation', Number(ov.coins_in_circulation).toLocaleString()], ['Orders waiting', ov.pending_orders], ['Active members', ov.active_members]] : [];
  return (
    <>
      <div className={`${box} ${s.master_enabled ? 'border-emerald-400' : 'border-amber-300'}`}>
        <p className="text-sm font-black">{s.master_enabled ? 'The Gaming Centre is ON for customers' : 'The Gaming Centre is OFF for customers (only admins can preview it)'}</p>
        <p className="text-[11px] text-slate-500 font-medium">Everything starts OFF. Test as admin first, then switch on.</p>
        <div className="divide-y divide-slate-100 mt-1">
          <Toggle on={!!s.master_enabled} label="Master switch: all games" hint="Turn OFF to disable every game at once." onChange={v => sw('master_enabled', v, 'Gaming Centre', 'Switch ON the Gaming Centre for ALL customers?')} />
          <Toggle on={!!s.paid_play_enabled} label="Paid gameplay" hint="OFF = every game is free to enter. ON = customers spend game coins to enter." onChange={v => sw('paid_play_enabled', v, 'Paid gameplay', 'Customers will start spending game coins to enter games. Continue?')} />
          <Toggle on={!!s.coin_purchases_enabled} label="Coin purchases" hint="Lets customers place coin orders. Coins are credited only after YOU confirm the payment." onChange={v => sw('coin_purchases_enabled', v, 'Coin purchases', 'Only switch this on once you have a verified way to confirm payments and you have checked that your payment provider allows gaming use. Continue?')} />
          <Toggle on={!!s.rewards_enabled} label="Coin rewards" hint="OFF = games still work but pay no coins." onChange={v => sw('rewards_enabled', v, 'Rewards')} />
          <Toggle on={!!s.membership_enabled} label="Premium membership sales" hint="Subscription payments are not connected yet. Keep OFF; you can still grant access by hand." onChange={v => sw('membership_enabled', v, 'Membership sales')} />
        </div>
      </div>
      <div className={`${box} grid sm:grid-cols-2 gap-3`}>
        <label className={lbl}>Daily reward limit per customer (coins; blank = no limit)<input className={inp} type="number" min="0" value={cap} onChange={e => setCap(e.target.value)} /></label>
        <div className="flex items-end"><button className={btn} onClick={() => save({ daily_reward_cap: cap === '' ? null : Number(cap) }, 'Daily limit saved')}>Save limit</button></div>
        <label className={`${lbl} sm:col-span-2`}>Payment instructions shown to customers who order coins (max 600 characters)
          <textarea className={inp} rows={3} maxLength={600} value={ins} onChange={e => setIns(e.target.value)} placeholder="For example: pay to the account details below and quote your order reference." /></label>
        <div className="sm:col-span-2"><button className={btn2} onClick={() => save({ purchase_instructions: ins }, 'Instructions saved')}>Save instructions</button></div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">{stats.map(([l, v]) => <div key={l} className={box}><p className="text-[10px] font-bold text-slate-500">{l}</p><p className="text-lg font-black text-slate-900">{v}</p></div>)}</div>
    </>
  );
}

// ======================================================= 2. Individual game controls
function Games({ cfg, reload, toast }: { cfg: Cfg; reload: () => void; toast: Toast }) {
  return <>{cfg.games.map(g => <GameCard key={g.game_key + (g.updated_at || '')} g={g} cats={cfg.categories} reload={reload} toast={toast} />)}</>;
}
function GameCard({ g, cats, reload, toast }: { g: any; cats: any[]; reload: () => void; toast: Toast }) {
  const [f, setF] = useState<any>({ enabled: g.enabled, tier: g.tier, entry_cost: g.entry_cost, difficulty: g.difficulty, sort_order: g.sort_order, tagline: g.tagline || '', config: { ...g.config } });
  const c = f.config; const setC = (k: string, v: any) => setF({ ...f, config: { ...c, [k]: v } });
  const brain = g.game_key === 'brain';
  const save = async () => {
    const config = brain ? { ...c, questions_per_round: Number(c.questions_per_round), timer_seconds: Number(c.timer_seconds) } : undefined;
    const r = await call('admin_game_save_definition', { p: { game_key: g.game_key, enabled: f.enabled, tier: f.tier, entry_cost: Number(f.entry_cost), difficulty: f.difficulty, sort_order: Number(f.sort_order), tagline: f.tagline, config } }, toast, `${g.name} saved`);
    if (r.ok) reload();
  };
  return (
    <div className={box}>
      <div className="flex flex-wrap items-center gap-2"><b className="text-sm">{g.name}</b>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${g.playable ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>{g.playable ? 'GAMEPLAY LIVE' : 'INTERFACE ONLY (gameplay arrives in a later update)'}</span></div>
      <Toggle on={f.enabled} onChange={v => setF({ ...f, enabled: v })} label="Show this game to customers" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <label className={lbl}>Type<select className={inp} value={f.tier} onChange={e => setF({ ...f, tier: e.target.value })}><option value="standard">Standard</option><option value="premium">Premium</option></select></label>
        <label className={lbl}>Entry cost (coins)<input className={inp} type="number" min="0" value={f.entry_cost} onChange={e => setF({ ...f, entry_cost: e.target.value })} /></label>
        <label className={lbl}>Difficulty<select className={inp} value={f.difficulty} onChange={e => setF({ ...f, difficulty: e.target.value })}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label>
        <label className={lbl}>Order<input className={inp} type="number" value={f.sort_order} onChange={e => setF({ ...f, sort_order: e.target.value })} /></label>
        <label className={`${lbl} col-span-2 md:col-span-4`}>Short description<input className={inp} maxLength={140} value={f.tagline} onChange={e => setF({ ...f, tagline: e.target.value })} /></label>
      </div>
      {brain && (<div className="mt-3 rounded-xl border border-slate-200 p-3 space-y-2">
        <p className="text-xs font-black text-slate-800">Brain Challenge round settings</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <label className={lbl}>Questions per round (1-20)<input className={inp} type="number" min="1" max="20" value={c.questions_per_round ?? 6} onChange={e => setC('questions_per_round', e.target.value)} /></label>
          <label className={lbl}>Seconds per question (5-120)<input className={inp} type="number" min="5" max="120" value={c.timer_seconds ?? 15} onChange={e => setC('timer_seconds', e.target.value)} /></label>
          <label className={lbl}>Question difficulty<select className={inp} value={c.difficulty ?? 'mixed'} onChange={e => setC('difficulty', e.target.value)}><option value="mixed">Mixed</option><option value="easy">Easy only</option><option value="medium">Medium only</option><option value="hard">Hard only</option></select></label>
        </div>
        <p className={lbl}>Categories used in a round</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1">{cats.map(k => (
          <label key={k.key} className="flex items-center gap-1.5 text-xs font-semibold"><input type="checkbox" checked={(c.categories || []).includes(k.key)}
            onChange={e => setC('categories', e.target.checked ? [...(c.categories || []), k.key] : (c.categories || []).filter((x: string) => x !== k.key))} />{k.name}{!k.active && ' (off)'}</label>))}</div>
      </div>)}
      <button className={btn + ' mt-3'} onClick={save}>Save {g.name}</button>
    </div>
  );
}

// ======================================================= 3. Coin packages and pricing
function Packages({ toast }: { toast: Toast }) {
  const [rows, setRows] = useState<any[]>([]);
  const [edit, setEdit] = useState<any | null>(null);
  const load = useCallback(async () => { const r = await call<any[]>('admin_game_list_packages', undefined, toast); if (r.ok) setRows(r.data || []); }, [toast]);
  useEffect(() => { load(); }, [load]);
  const blank = { name: '', coins: 100, bonus_coins: 0, price_naira: 100, badge: '', active: true, sort_order: rows.length };
  const save = async () => {
    const r = await call('admin_game_save_package', { p: { ...edit, coins: Number(edit.coins), bonus_coins: Number(edit.bonus_coins), price_naira: Number(edit.price_naira), sort_order: Number(edit.sort_order) } }, toast, 'Package saved');
    if (r.ok) { setEdit(null); load(); }
  };
  return (
    <>
      <div className={box}><p className="text-sm font-black">Coin packages</p><p className="text-[11px] text-slate-500 font-medium">Customers see active packages when coin purchases are switched on. Prices are in naira. Packages are hidden (not deleted) when you turn them off.</p>
        <button className={btn + ' mt-2'} onClick={() => setEdit({ ...blank })}>+ New package</button></div>
      {edit && (<div className={`${box} grid grid-cols-2 md:grid-cols-3 gap-2`}>
        <label className={lbl}>Name<input className={inp} value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} /></label>
        <label className={lbl}>Coins<input className={inp} type="number" min="1" value={edit.coins} onChange={e => setEdit({ ...edit, coins: e.target.value })} /></label>
        <label className={lbl}>Bonus coins<input className={inp} type="number" min="0" value={edit.bonus_coins} onChange={e => setEdit({ ...edit, bonus_coins: e.target.value })} /></label>
        <label className={lbl}>Price ₦<input className={inp} type="number" min="1" value={edit.price_naira} onChange={e => setEdit({ ...edit, price_naira: e.target.value })} /></label>
        <label className={lbl}>Badge (e.g. Best value)<input className={inp} maxLength={20} value={edit.badge || ''} onChange={e => setEdit({ ...edit, badge: e.target.value })} /></label>
        <label className={lbl}>Order<input className={inp} type="number" value={edit.sort_order} onChange={e => setEdit({ ...edit, sort_order: e.target.value })} /></label>
        <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={!!edit.active} onChange={e => setEdit({ ...edit, active: e.target.checked })} />Shown to customers</label>
        <div className="col-span-2 flex gap-2"><button className={btn} onClick={save}>Save</button><button className={btn2} onClick={() => setEdit(null)}>Cancel</button></div></div>)}
      {rows.map(p => (<div key={p.id} className={`${box} flex flex-wrap items-center gap-3 ${p.active ? '' : 'opacity-60'}`}>
        <b className="text-sm">{p.name}</b><span className="text-xs font-semibold">{Number(p.coins).toLocaleString()} + {Number(p.bonus_coins).toLocaleString()} bonus coins</span>
        <span className="text-xs font-black text-emerald-800">{naira(p.price_naira)}</span>{p.badge && <span className="text-[10px] font-black bg-amber-100 text-amber-800 rounded-full px-2 py-0.5">{p.badge}</span>}
        {!p.active && <span className="text-[10px] font-black bg-slate-200 rounded-full px-2 py-0.5">HIDDEN</span>}
        <button className={btn2 + ' ml-auto'} onClick={() => setEdit({ ...p })}>Edit</button></div>))}
      {rows.length === 0 && <p className="text-xs text-slate-500">No packages yet.</p>}
    </>
  );
}

// ======================================================= 4. Questions and categories
function Questions({ cfg, reload, toast }: { cfg: Cfg; reload: () => void; toast: Toast }) {
  const [cat, setCat] = useState(''); const [status, setStatus] = useState(''); const [q, setQ] = useState('');
  const [res, setRes] = useState<{ total: number; rows: any[] }>({ total: 0, rows: [] });
  const [page, setPage] = useState(0);
  const [edit, setEdit] = useState<any | null>(null);
  const [imp, setImp] = useState(false);
  const PAGE = 20;
  const load = useCallback(async () => {
    const r = await call<any>('admin_game_list_questions', { p_category: cat || null, p_search: q || null, p_status: status || null, p_limit: PAGE, p_offset: page * PAGE }, toast);
    if (r.ok && r.data) setRes(r.data);
  }, [cat, q, status, page, toast]);
  useEffect(() => { load(); }, [load]);
  const newQ = { category: cfg.categories[0]?.key || 'math', difficulty: 1, question: '', options: ['', '', '', ''], correct_index: 0, explanation: '', as_of: '', valid_until: '', active: true };
  return (
    <>
      <Categories cfg={cfg} reload={reload} toast={toast} />
      <div className={`${box} space-y-2`}>
        <div className="flex flex-wrap gap-2 items-end">
          <label className={lbl}>Category<select className={inp} value={cat} onChange={e => { setCat(e.target.value); setPage(0); }}><option value="">All</option>{cfg.categories.map(c => <option key={c.key} value={c.key}>{c.name}</option>)}</select></label>
          <label className={lbl}>Status<select className={inp} value={status} onChange={e => { setStatus(e.target.value); setPage(0); }}><option value="">All</option><option value="active">Active</option><option value="inactive">Switched off</option><option value="expired">Expired</option></select></label>
          <label className={lbl + ' flex-1 min-w-[10rem]'}>Search<input className={inp} value={q} onChange={e => { setQ(e.target.value); setPage(0); }} placeholder="Part of the question" /></label>
          <button className={btn} onClick={() => setEdit({ ...newQ })}>+ Add question</button><button className={btn2} onClick={() => setImp(!imp)}>Bulk import</button></div>
        <p className="text-[11px] text-slate-500 font-medium">Correct answers are visible here to admins only. Customers never receive an answer until after they submit theirs.</p>
      </div>
      {imp && <Importer cats={cfg.categories} toast={toast} done={() => { setImp(false); load(); }} />}
      {edit && <QuestionEditor q={edit} cats={cfg.categories} toast={toast} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
      <p className="text-xs font-bold text-slate-600">{res.total} question{res.total === 1 ? '' : 's'}</p>
      {res.rows.map(r => (
        <div key={r.id} className={`${box} ${r.active && !r.expired ? '' : 'opacity-70'}`}>
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-black">
            <span className="bg-emerald-100 text-emerald-800 rounded-full px-2 py-0.5">{cfg.categories.find((c: any) => c.key === r.category)?.name || r.category}</span>
            <span className="bg-slate-100 rounded-full px-2 py-0.5">{['', 'Easy', 'Medium', 'Hard'][r.difficulty]}</span>
            {r.as_of && <span className="bg-sky-100 text-sky-800 rounded-full px-2 py-0.5">As at {r.as_of}</span>}
            {r.valid_until && <span className={`rounded-full px-2 py-0.5 ${r.expired ? 'bg-red-100 text-red-700' : 'bg-slate-100'}`}>{r.expired ? 'EXPIRED' : 'Until'} {r.valid_until}</span>}
            {!r.active && <span className="bg-slate-200 rounded-full px-2 py-0.5">SWITCHED OFF</span>}
          </div>
          <p className="text-sm font-bold mt-1">{r.question}</p>
          <ol className="text-xs mt-1 grid grid-cols-2 gap-x-3">{r.options.map((o: string, i: number) => <li key={i} className={i === r.correct_index ? 'font-black text-emerald-700' : 'text-slate-600'}>{'ABCD'[i]}. {o}{i === r.correct_index && ' ✓'}</li>)}</ol>
          <div className="mt-2 flex gap-2"><button className={btn2} onClick={() => setEdit({ ...r, explanation: r.explanation || '', as_of: r.as_of || '', valid_until: r.valid_until || '' })}>Edit</button>
            <button className={btn2} onClick={async () => { const x = await call('admin_game_set_question_active', { p_id: r.id, p_active: !r.active }, toast, r.active ? 'Switched off' : 'Switched on'); if (x.ok) load(); }}>{r.active ? 'Switch off' : 'Switch on'}</button></div>
        </div>))}
      <div className="flex gap-2 items-center"><button className={btn2} disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
        <span className="text-xs font-bold">Page {page + 1}</span><button className={btn2} disabled={(page + 1) * PAGE >= res.total} onClick={() => setPage(page + 1)}>Next</button></div>
    </>
  );
}

function Categories({ cfg, reload, toast }: { cfg: Cfg; reload: () => void; toast: Toast }) {
  const [n, setN] = useState({ key: '', name: '' });
  const save = async (c: any, patch: any = {}) => { const r = await call('admin_game_save_category', { p: { ...c, ...patch } }, toast, 'Category saved'); if (r.ok) reload(); };
  return (
    <div className={box}><p className="text-sm font-black mb-2">Categories</p>
      <div className="flex flex-wrap gap-2">{cfg.categories.map((c: any) => (
        <label key={c.key} className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${c.active ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
          <input type="checkbox" checked={c.active} onChange={e => save(c, { active: e.target.checked })} />{c.name}</label>))}</div>
      <div className="mt-3 flex flex-wrap gap-2 items-end">
        <label className={lbl}>New category code<input className={inp} placeholder="e.g. history" value={n.key} onChange={e => setN({ ...n, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })} /></label>
        <label className={lbl}>Name<input className={inp} value={n.name} onChange={e => setN({ ...n, name: e.target.value })} /></label>
        <button className={btn} disabled={n.key.length < 2 || n.name.trim().length < 2} onClick={async () => { const r = await call('admin_game_save_category', { p: { key: n.key, name: n.name, active: true, sort_order: cfg.categories.length + 1 } }, toast, 'Category added'); if (r.ok) { setN({ key: '', name: '' }); reload(); } }}>Add</button></div>
    </div>
  );
}

function QuestionEditor({ q, cats, toast, onClose, onSaved }: { q: any; cats: any[]; toast: Toast; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<any>(q);
  const setO = (i: number, v: string) => setF({ ...f, options: f.options.map((o: string, k: number) => (k === i ? v : o)) });
  const save = async () => {
    const r = await call('admin_game_save_question', { p: { ...f, difficulty: Number(f.difficulty), correct_index: Number(f.correct_index), as_of: f.as_of || null, valid_until: f.valid_until || null } }, toast, 'Question saved');
    if (r.ok) onSaved();
  };
  return (
    <div className={`${box} space-y-2 border-emerald-300`}>
      <p className="text-sm font-black">{f.id ? 'Edit question' : 'New question'}</p>
      <div className="grid grid-cols-2 gap-2">
        <label className={lbl}>Category<select className={inp} value={f.category} onChange={e => setF({ ...f, category: e.target.value })}>{cats.map(c => <option key={c.key} value={c.key}>{c.name}</option>)}</select></label>
        <label className={lbl}>Difficulty<select className={inp} value={f.difficulty} onChange={e => setF({ ...f, difficulty: e.target.value })}><option value={1}>Easy</option><option value={2}>Medium</option><option value={3}>Hard</option></select></label>
      </div>
      <label className={lbl}>Question<textarea className={inp} rows={2} maxLength={300} value={f.question} onChange={e => setF({ ...f, question: e.target.value })} /></label>
      <div className="grid sm:grid-cols-2 gap-2">{[0, 1, 2, 3].map(i => (
        <label key={i} className={lbl}><span className="flex items-center gap-2"><input type="radio" name="correct" checked={Number(f.correct_index) === i} onChange={() => setF({ ...f, correct_index: i })} />Option {'ABCD'[i]} {Number(f.correct_index) === i && <b className="text-emerald-700">(correct)</b>}</span>
          <input className={inp} maxLength={120} value={f.options[i]} onChange={e => setO(i, e.target.value)} /></label>))}</div>
      <label className={lbl}>Explanation shown after answering (optional)<input className={inp} maxLength={300} value={f.explanation} onChange={e => setF({ ...f, explanation: e.target.value })} /></label>
      <div className="grid grid-cols-2 gap-2">
        <label className={lbl}>As-of date (required for Current Affairs)<input className={inp} type="date" value={f.as_of} onChange={e => setF({ ...f, as_of: e.target.value })} /></label>
        <label className={lbl}>Stop showing after (optional)<input className={inp} type="date" value={f.valid_until} onChange={e => setF({ ...f, valid_until: e.target.value })} /></label></div>
      <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={!!f.active} onChange={e => setF({ ...f, active: e.target.checked })} />Switched on</label>
      <div className="flex gap-2"><button className={btn} onClick={save}>Save question</button><button className={btn2} onClick={onClose}>Cancel</button></div>
    </div>
  );
}

function Importer({ cats, toast, done }: { cats: any[]; toast: Toast; done: () => void }) {
  const [text, setText] = useState('');
  const [out, setOut] = useState<string>('');
  const parsed = parseQuestionLines(text, cats);
  const run = async () => {
    if (parsed.rows.length === 0) { setOut('Nothing valid to import yet.'); return; }
    const r = await call<{ added: number; errors: { row: number; error: string }[] }>('admin_game_import_questions', { p_rows: parsed.rows }, toast);
    if (r.ok && r.data) { setOut(`Added ${r.data.added}. ${r.data.errors.length ? 'Skipped: ' + r.data.errors.map(e => `#${e.row} ${e.error}`).join('; ') : ''}`); if (r.data.added > 0) done(); }
  };
  return (
    <div className={`${box} space-y-2`}>
      <p className="text-sm font-black">Bulk import (up to 200 questions)</p>
      <p className="text-[11px] text-slate-500 font-medium">One question per line, parts separated by |<br /><code className="text-[10px]">category | easy/medium/hard | question | A | B | C | D | correct letter | explanation | as-of date | stop-after date</code><br />Dates look like 2026-12-31 and are only needed for Current Affairs. Lines starting with # are ignored.</p>
      <textarea className={inp + ' font-mono text-xs'} rows={6} value={text} onChange={e => setText(e.target.value)} placeholder="science | easy | What is H2O commonly called? | Water | Salt | Sugar | Oil | A | Two hydrogen atoms and one oxygen atom." />
      <p className="text-xs font-bold">{parsed.rows.length} ready{parsed.errors.length > 0 && <span className="text-red-600"> · {parsed.errors.length} with problems: {parsed.errors.slice(0, 4).map(e => `line ${e.line}: ${e.error}`).join('; ')}</span>}</p>
      <button className={btn} disabled={parsed.rows.length === 0} onClick={run}>Import {parsed.rows.length} question{parsed.rows.length === 1 ? '' : 's'}</button>
      {out && <p className="text-xs font-semibold text-slate-700">{out}</p>}
    </div>
  );
}

// ======================================================= 5. Game rewards
function Rewards({ cfg, reload, toast }: { cfg: Cfg; reload: () => void; toast: Toast }) {
  const b = cfg.games.find(g => g.game_key === 'brain'); const s = cfg.settings;
  const [c, setC] = useState<any>({ per_correct: b?.config?.per_correct ?? 25, win_reward: b?.config?.win_reward ?? 300, win_bonus: b?.config?.win_bonus ?? 50 });
  const save = async () => {
    const r = await call('admin_game_save_definition', { p: { game_key: 'brain', config: { per_correct: Number(c.per_correct), win_reward: Number(c.win_reward), win_bonus: Number(c.win_bonus) } } }, toast, 'Brain Challenge rewards saved');
    if (r.ok) reload();
  };
  return (
    <>
      <div className={box}>
        <Toggle on={!!s.rewards_enabled} label="Coin rewards" hint="Master switch for all game rewards. Rewards are always game coins: never cash." onChange={async v => { const r = await call('admin_game_save_settings', { p: { rewards_enabled: v } }, toast, `Rewards ${v ? 'ON' : 'OFF'}`); if (r.ok) reload(); }} />
        <p className="text-[11px] text-slate-500 font-medium">Daily limit per customer: <b>{s.daily_reward_cap == null ? 'none' : `${s.daily_reward_cap} coins`}</b> (change it in Overview). Rewards are worked out on the server; customers cannot change them.</p>
      </div>
      <div className={box}>
        <p className="text-sm font-black">Brain Challenge rewards</p>
        <div className="grid grid-cols-3 gap-2 mt-2">
          <label className={lbl}>Per correct answer (round ends early)<input className={inp} type="number" min="0" value={c.per_correct} onChange={e => setC({ ...c, per_correct: e.target.value })} /></label>
          <label className={lbl}>Win reward (all answers correct)<input className={inp} type="number" min="0" value={c.win_reward} onChange={e => setC({ ...c, win_reward: e.target.value })} /></label>
          <label className={lbl}>Win bonus coins<input className={inp} type="number" min="0" value={c.win_bonus} onChange={e => setC({ ...c, win_bonus: e.target.value })} /></label></div>
        <p className="text-[11px] text-slate-500 font-medium mt-2">Win total = win reward + bonus. If a round ends early the reward is per-correct × correct answers. Active promotions can multiply these.</p>
        <button className={btn + ' mt-2'} onClick={save}>Save rewards</button>
      </div>
      <p className="text-xs text-slate-500 font-medium">Rewards for Spinning Wheel, Dice, Bottle Roll and Race Crasher are set when each game is delivered.</p>
    </>
  );
}

// ======================================================= 6. Premium membership
function Membership({ cfg, toast }: { cfg: Cfg; toast: Toast }) {
  const [plans, setPlans] = useState<any[]>([]); const [mem, setMem] = useState<any[]>([]); const [edit, setEdit] = useState<any | null>(null);
  const [gr, setGr] = useState<any>({ q: '', found: [], customer: null, plan: '', days: '', note: '' });
  const load = useCallback(async () => {
    const [a, b] = await Promise.all([call<any[]>('admin_game_list_plans', undefined, toast), call<any[]>('admin_game_list_memberships', { p_limit: 50 }, toast)]);
    if (a.ok) setPlans(a.data || []); if (b.ok) setMem(b.data || []);
  }, [toast]);
  useEffect(() => { load(); }, [load]);
  const blank = { name: '', price_naira: 1000, period: 'monthly', benefits: [], included_games: [], popular: false, active: true, sort_order: plans.length };
  const savePlan = async () => {
    const r = await call('admin_game_save_plan', { p: { ...edit, price_naira: Number(edit.price_naira), sort_order: Number(edit.sort_order) } }, toast, 'Plan saved');
    if (r.ok) { setEdit(null); load(); }
  };
  const find = async () => { const r = await call<any[]>('admin_game_find_customer', { p_q: gr.q }, toast); if (r.ok) setGr({ ...gr, found: r.data || [] }); };
  return (
    <>
      <div className={box}><p className="text-sm font-black">Membership plans</p>
        <p className="text-[11px] text-slate-500 font-medium">Plans appear in the Premium Gaming Club. Subscription payments are not connected, so access is granted by you below. Premium status is checked on the server.</p>
        <button className={btn + ' mt-2'} onClick={() => setEdit({ ...blank })}>+ New plan</button></div>
      {edit && (<div className={`${box} space-y-2`}>
        <div className="grid grid-cols-2 gap-2">
          <label className={lbl}>Plan name<input className={inp} value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} /></label>
          <label className={lbl}>Price ₦<input className={inp} type="number" min="0" value={edit.price_naira} onChange={e => setEdit({ ...edit, price_naira: e.target.value })} /></label>
          <label className={lbl}>Billing period<select className={inp} value={edit.period} onChange={e => setEdit({ ...edit, period: e.target.value })}><option value="monthly">Monthly (30 days)</option><option value="quarterly">Quarterly (90 days)</option><option value="yearly">Yearly (365 days)</option></select></label>
          <label className={lbl}>Order<input className={inp} type="number" value={edit.sort_order} onChange={e => setEdit({ ...edit, sort_order: e.target.value })} /></label></div>
        <label className={lbl}>Benefits (one per line)<textarea className={inp} rows={3} value={(edit.benefits || []).join('\n')} onChange={e => setEdit({ ...edit, benefits: e.target.value.split('\n').map((x: string) => x.trim()).filter(Boolean) })} /></label>
        <p className={lbl}>Included games</p><div className="flex flex-wrap gap-3">{cfg.games.map((g: any) => (
          <label key={g.game_key} className="flex items-center gap-1.5 text-xs font-semibold"><input type="checkbox" checked={(edit.included_games || []).includes(g.game_key)}
            onChange={e => setEdit({ ...edit, included_games: e.target.checked ? [...(edit.included_games || []), g.game_key] : edit.included_games.filter((x: string) => x !== g.game_key) })} />{g.name}</label>))}</div>
        <div className="flex gap-4"><label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={!!edit.popular} onChange={e => setEdit({ ...edit, popular: e.target.checked })} />Most popular</label>
          <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={!!edit.active} onChange={e => setEdit({ ...edit, active: e.target.checked })} />Shown to customers</label></div>
        <div className="flex gap-2"><button className={btn} onClick={savePlan}>Save plan</button><button className={btn2} onClick={() => setEdit(null)}>Cancel</button></div></div>)}
      {plans.map(p => (<div key={p.id} className={`${box} flex flex-wrap items-center gap-3 ${p.active ? '' : 'opacity-60'}`}><b className="text-sm">{p.name}</b>
        <span className="text-xs font-semibold">{naira(p.price_naira)} / {p.period}</span>{p.popular && <span className="text-[10px] font-black bg-amber-100 text-amber-800 rounded-full px-2 py-0.5">POPULAR</span>}
        <button className={btn2 + ' ml-auto'} onClick={() => setEdit({ ...p })}>Edit</button></div>))}
      <div className={`${box} space-y-2`}><p className="text-sm font-black">Give someone premium access</p>
        <div className="flex gap-2"><input className={inp} placeholder="Search customer name or phone" value={gr.q} onChange={e => setGr({ ...gr, q: e.target.value })} /><button className={btn2} onClick={find}>Search</button></div>
        {gr.found.map((c: any) => <button key={c.id} className={`block w-full text-left text-xs font-bold rounded-lg border px-3 py-2 ${gr.customer?.id === c.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'}`} onClick={() => setGr({ ...gr, customer: c })}>{c.name} · {c.phone}</button>)}
        {gr.customer && <p className="text-xs font-black text-emerald-800">Selected: {gr.customer.name}</p>}
        <div className="grid grid-cols-3 gap-2"><label className={lbl}>Plan<select className={inp} value={gr.plan} onChange={e => setGr({ ...gr, plan: e.target.value })}><option value="">Choose</option>{plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label className={lbl}>Days (blank = plan length)<input className={inp} type="number" min="1" value={gr.days} onChange={e => setGr({ ...gr, days: e.target.value })} /></label>
          <label className={lbl}>Note<input className={inp} value={gr.note} onChange={e => setGr({ ...gr, note: e.target.value })} /></label></div>
        <button className={btn} disabled={!gr.customer || !gr.plan} onClick={async () => { const r = await call('admin_game_grant_membership', { p_customer: gr.customer.id, p_plan: gr.plan, p_days: gr.days ? Number(gr.days) : null, p_note: gr.note }, toast, 'Premium access granted'); if (r.ok) { setGr({ q: '', found: [], customer: null, plan: '', days: '', note: '' }); load(); } }}>Grant access</button></div>
      {mem.map(m => (<div key={m.id} className={`${box} flex flex-wrap items-center gap-3 text-xs`}><b>{m.customer_name}</b><span>{m.customer_phone}</span><span>{m.plan_name}</span>
        <span className={`font-black ${m.is_live ? 'text-emerald-700' : 'text-slate-500'}`}>{m.is_live ? 'ACTIVE' : m.status.toUpperCase()}</span><span>until {dt(m.expires_at)}</span><span className="text-slate-400">({m.source})</span>
        {m.is_live && <button className={btn2 + ' ml-auto'} onClick={async () => { if (!window.confirm('Remove this access?')) return; const r = await call('admin_game_revoke_membership', { p_id: m.id }, toast, 'Access removed'); if (r.ok) load(); }}>Remove</button>}</div>))}
    </>
  );
}

// ======================================================= 7. Customer game transactions
function Transactions({ toast }: { toast: Toast }) {
  const [rows, setRows] = useState<any[]>([]); const [kind, setKind] = useState(''); const [cust, setCust] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]); const [ostatus, setOstatus] = useState('pending');
  const [q, setQ] = useState(''); const [found, setFound] = useState<any[]>([]);
  const [g, setG] = useState<any>({ customer: null, amount: '', note: '', key: newKey() });
  const [refs, setRefs] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    const [a, b] = await Promise.all([call<any[]>('admin_game_ledger', { p_customer: cust?.id ?? null, p_kind: kind || null, p_limit: 60, p_offset: 0 }, toast), call<any[]>('admin_game_orders', { p_status: ostatus || null, p_limit: 50 }, toast)]);
    if (a.ok) setRows(a.data || []); if (b.ok) setOrders(b.data || []);
  }, [cust, kind, ostatus, toast]);
  useEffect(() => { load(); }, [load]);
  const find = async (forGrant: boolean) => { const r = await call<any[]>('admin_game_find_customer', { p_q: q }, toast); if (r.ok) { setFound(r.data || []); if (!forGrant) setCust(null); } };
  return (
    <>
      <div className={`${box} space-y-2`}><p className="text-sm font-black">Coin orders</p>
        <p className="text-[11px] text-slate-500 font-medium">When a customer pays, enter the payment reference and press Confirm. Coins are then credited once; a reference can never be used twice. Never confirm without seeing the money.</p>
        <label className={lbl}>Show<select className={inp} value={ostatus} onChange={e => setOstatus(e.target.value)}><option value="pending">Waiting</option><option value="">All</option><option value="successful">Successful</option><option value="failed">Failed</option><option value="refunded">Refunded</option><option value="cancelled">Cancelled</option></select></label>
        {orders.length === 0 && <p className="text-xs text-slate-500">No orders.</p>}
        {orders.map(o => (<div key={o.id} className="rounded-xl border border-slate-200 p-3 text-xs space-y-2">
          <div className="flex flex-wrap gap-x-3 gap-y-1 items-center"><b>{o.customer_name}</b><span>{o.customer_phone}</span><span>{(o.coins + o.bonus_coins).toLocaleString()} coins</span><b>{naira(o.price_naira)}</b>
            <span className="font-black uppercase">{o.status}</span><span className="text-slate-400">{dt(o.created_at)} · #{String(o.id).slice(0, 8).toUpperCase()}</span>{o.provider_ref && <span>ref {o.provider_ref}</span>}</div>
          {o.status === 'pending' && <div className="flex flex-wrap gap-2"><input className={inp + ' flex-1 min-w-[10rem]'} placeholder="Payment reference" value={refs[o.id] || ''} onChange={e => setRefs({ ...refs, [o.id]: e.target.value })} />
            <button className={btn} onClick={async () => { const r = await call('admin_game_confirm_order', { p_order: o.id, p_provider_ref: refs[o.id] || '', p_note: null }, toast, 'Payment confirmed, coins added'); if (r.ok) load(); }}>Confirm payment</button>
            <button className={btn2} onClick={async () => { if (!window.confirm('Mark this order as failed?')) return; const r = await call('admin_game_close_order', { p_order: o.id, p_status: 'failed', p_note: null }, toast, 'Order closed'); if (r.ok) load(); }}>Reject</button></div>}
          {o.status === 'successful' && <button className={btn2} onClick={async () => { if (!window.confirm('Refund this order? The coins are taken back (only works if the customer still has them).')) return; const r = await call('admin_game_close_order', { p_order: o.id, p_status: 'refunded', p_note: null }, toast, 'Refunded'); if (r.ok) load(); }}>Refund</button>}
        </div>))}
      </div>
      <div className={`${box} space-y-2`}><p className="text-sm font-black">Add or remove coins for a customer</p>
        <div className="flex gap-2"><input className={inp} placeholder="Search customer name or phone" value={q} onChange={e => setQ(e.target.value)} /><button className={btn2} onClick={() => find(true)}>Search</button></div>
        {found.map(c => <button key={c.id} className={`block w-full text-left text-xs font-bold rounded-lg border px-3 py-2 ${g.customer?.id === c.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'}`} onClick={() => setG({ ...g, customer: c })}>{c.name} · {c.phone}</button>)}
        <div className="grid grid-cols-2 gap-2"><label className={lbl}>Coins (use a minus to remove)<input className={inp} type="number" value={g.amount} onChange={e => setG({ ...g, amount: e.target.value })} /></label>
          <label className={lbl}>Reason (required)<input className={inp} value={g.note} onChange={e => setG({ ...g, note: e.target.value })} /></label></div>
        <button className={btn} disabled={!g.customer || !g.amount || g.note.trim().length < 3} onClick={async () => {
          if (!window.confirm(`${Number(g.amount) > 0 ? 'Add' : 'Remove'} ${Math.abs(Number(g.amount))} coins ${Number(g.amount) > 0 ? 'to' : 'from'} ${g.customer.name}?`)) return;
          const r = await call('admin_game_grant_coins', { p_customer: g.customer.id, p_amount: Number(g.amount), p_note: g.note, p_idem: g.key }, toast, 'Done and recorded in the audit log');
          if (r.ok) { setG({ customer: null, amount: '', note: '', key: newKey() }); load(); }
        }}>Apply</button></div>
      <div className={`${box} space-y-2`}><p className="text-sm font-black">Coin ledger</p>
        <div className="flex flex-wrap gap-2 items-end"><label className={lbl}>Type<select className={inp} value={kind} onChange={e => setKind(e.target.value)}><option value="">All</option>{Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
          <input className={inp + ' flex-1 min-w-[10rem]'} placeholder="Filter by customer: search name or phone" value={q} onChange={e => setQ(e.target.value)} />
          <button className={btn2} onClick={() => find(false)}>Search</button>{cust && <button className={btn2} onClick={() => setCust(null)}>Clear: {cust.name}</button>}</div>
        {!cust && found.length > 0 && <div className="flex flex-wrap gap-2">{found.map(c => <button key={c.id} className={btn2} onClick={() => setCust(c)}>{c.name}</button>)}</div>}
        <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-left text-slate-500"><th className="py-1 pr-3">When</th><th className="pr-3">Customer</th><th className="pr-3">Type</th><th className="pr-3 text-right">Coins</th><th className="pr-3 text-right">Balance</th><th>Note</th></tr></thead>
          <tbody>{rows.map(r => <tr key={r.id} className="border-t border-slate-100"><td className="py-1 pr-3 whitespace-nowrap">{dt(r.created_at)}</td><td className="pr-3">{r.customer_name}</td><td className="pr-3">{KIND_LABEL[r.kind] || r.kind}</td>
            <td className={`pr-3 text-right font-black ${r.amount > 0 ? 'text-emerald-700' : 'text-red-600'}`}>{r.amount > 0 ? '+' : ''}{r.amount}</td><td className="pr-3 text-right">{r.balance_after}</td><td className="text-slate-500">{r.note}</td></tr>)}</tbody></table></div>
        {rows.length === 0 && <p className="text-xs text-slate-500">No coin activity yet.</p>}</div>
    </>
  );
}

// ======================================================= 8. Reports
function Reports({ toast }: { toast: Toast }) {
  const [days, setDays] = useState(14); const [r, setR] = useState<any>(null);
  useEffect(() => { (async () => { const x = await call('admin_game_report', { p_days: days }, toast); if (x.ok) setR(x.data); })(); }, [days, toast]);
  return (
    <>
      <div className={`${box} flex items-end gap-3`}><label className={lbl}>Period<select className={inp} value={days} onChange={e => setDays(Number(e.target.value))}>{[7, 14, 30, 60, 90].map(d => <option key={d} value={d}>Last {d} days</option>)}</select></label></div>
      {!r ? <p className="text-xs text-slate-500">Loading...</p> : (<>
        <div className="grid grid-cols-3 gap-2">{[['Coins in circulation', r.coins.in_circulation], ['Customers holding coins', r.coins.holders], ['Coins bought in period', r.coins.purchased]].map(([l, v]) => <div key={String(l)} className={box}><p className="text-[10px] font-bold text-slate-500">{l}</p><p className="text-lg font-black">{Number(v).toLocaleString()}</p></div>)}</div>
        <div className={`${box} overflow-x-auto`}><p className="text-sm font-black mb-1">By game</p><table className="w-full text-xs"><thead><tr className="text-left text-slate-500"><th>Game</th><th className="text-right">Rounds</th><th className="text-right">Wins</th><th className="text-right">Avg score</th><th className="text-right">Entry coins</th><th className="text-right">Reward coins</th></tr></thead>
          <tbody>{r.by_game.map((x: any) => <tr key={x.game_key} className="border-t border-slate-100"><td className="py-1 font-bold">{x.game_key}</td><td className="text-right">{x.sessions}</td><td className="text-right">{x.wins}</td><td className="text-right">{x.avg_score}</td><td className="text-right">{x.entry_coins}</td><td className="text-right">{x.reward_coins}</td></tr>)}</tbody></table>
          {r.by_game.length === 0 && <p className="text-xs text-slate-500 mt-1">No rounds in this period.</p>}</div>
        <div className={`${box} overflow-x-auto`}><p className="text-sm font-black mb-1">By day</p><table className="w-full text-xs"><thead><tr className="text-left text-slate-500"><th>Date</th><th className="text-right">Rounds</th><th className="text-right">Players</th><th className="text-right">Wins</th><th className="text-right">Fails</th><th className="text-right">Entry</th><th className="text-right">Rewards</th></tr></thead>
          <tbody>{r.by_day.map((x: any) => <tr key={x.day} className="border-t border-slate-100"><td className="py-1 font-bold">{x.day}</td><td className="text-right">{x.sessions}</td><td className="text-right">{x.players}</td><td className="text-right">{x.wins}</td><td className="text-right">{x.fails}</td><td className="text-right">{x.entry_coins}</td><td className="text-right">{x.reward_coins}</td></tr>)}</tbody></table></div>
      </>)}
    </>
  );
}

// ======================================================= 9. Promotions
function Promotions({ cfg, toast }: { cfg: Cfg; toast: Toast }) {
  const [rows, setRows] = useState<any[]>([]); const [edit, setEdit] = useState<any | null>(null);
  const load = useCallback(async () => { const r = await call<any[]>('admin_game_list_promotions', undefined, toast); if (r.ok) setRows(r.data || []); }, [toast]);
  useEffect(() => { load(); }, [load]);
  const local = (iso?: string) => (iso ? new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');
  const save = async () => {
    const r = await call('admin_game_save_promotion', { p: { ...edit, value: Number(edit.value), starts_at: new Date(edit.starts_at).toISOString(), ends_at: new Date(edit.ends_at).toISOString() } }, toast, 'Promotion saved');
    if (r.ok) { setEdit(null); load(); }
  };
  const now = new Date(); const later = new Date(now.getTime() + 7 * 86400000);
  return (
    <>
      <div className={box}><p className="text-sm font-black">Promotions</p><p className="text-[11px] text-slate-500 font-medium">A reward booster multiplies game coin rewards during the dates you choose (for example 2 = double rewards). The daily reward limit still applies.</p>
        <button className={btn + ' mt-2'} onClick={() => setEdit({ name: '', value: 2, game_key: '', starts_at: local(now.toISOString()), ends_at: local(later.toISOString()), active: true })}>+ New promotion</button></div>
      {edit && (<div className={`${box} grid grid-cols-2 gap-2`}>
        <label className={lbl}>Name<input className={inp} value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} /></label>
        <label className={lbl}>Multiplier (1 to 10)<input className={inp} type="number" step="0.5" min="1" max="10" value={edit.value} onChange={e => setEdit({ ...edit, value: e.target.value })} /></label>
        <label className={lbl}>Applies to<select className={inp} value={edit.game_key || ''} onChange={e => setEdit({ ...edit, game_key: e.target.value })}><option value="">All games</option>{cfg.games.map((g: any) => <option key={g.game_key} value={g.game_key}>{g.name}</option>)}</select></label>
        <label className="flex items-center gap-2 text-xs font-bold mt-5"><input type="checkbox" checked={!!edit.active} onChange={e => setEdit({ ...edit, active: e.target.checked })} />Active</label>
        <label className={lbl}>Starts<input className={inp} type="datetime-local" value={local(edit.starts_at) || edit.starts_at} onChange={e => setEdit({ ...edit, starts_at: e.target.value })} /></label>
        <label className={lbl}>Ends<input className={inp} type="datetime-local" value={local(edit.ends_at) || edit.ends_at} onChange={e => setEdit({ ...edit, ends_at: e.target.value })} /></label>
        <div className="col-span-2 flex gap-2"><button className={btn} onClick={save}>Save</button><button className={btn2} onClick={() => setEdit(null)}>Cancel</button></div></div>)}
      {rows.map(p => { const live = p.active && new Date(p.starts_at) <= new Date() && new Date(p.ends_at) >= new Date(); return (
        <div key={p.id} className={`${box} flex flex-wrap items-center gap-3 text-xs`}><b>{p.name}</b><span>x{p.value} rewards</span><span>{p.game_key || 'all games'}</span><span>{dt(p.starts_at)} to {dt(p.ends_at)}</span>
          <span className={`font-black ${live ? 'text-emerald-700' : 'text-slate-500'}`}>{live ? 'RUNNING' : p.active ? 'SCHEDULED/ENDED' : 'OFF'}</span>
          <button className={btn2 + ' ml-auto'} onClick={() => setEdit({ ...p, starts_at: local(p.starts_at), ends_at: local(p.ends_at) })}>Edit</button></div>); })}
      {rows.length === 0 && <p className="text-xs text-slate-500">No promotions yet.</p>}
    </>
  );
}

// ======================================================= 10. Security and audit
function Security({ toast }: { toast: Toast }) {
  const [sus, setSus] = useState<any>(null); const [log, setLog] = useState<any[]>([]);
  useEffect(() => { (async () => { const [a, b] = await Promise.all([call('admin_game_suspicious', undefined, toast), call<any[]>('admin_game_audit', { p_limit: 100 }, toast)]); if (a.ok) setSus(a.data); if (b.ok) setLog(b.data || []); })(); }, [toast]);
  const Block = ({ title, hint, rows, cols }: { title: string; hint: string; rows: any[]; cols: [string, string][] }) => (
    <div className={box}><p className="text-sm font-black">{title} <span className="text-slate-400">({rows.length})</span></p><p className="text-[11px] text-slate-500 font-medium">{hint}</p>
      {rows.length === 0 ? <p className="text-xs text-emerald-700 font-bold mt-1">Nothing to review.</p> : <div className="overflow-x-auto mt-1"><table className="w-full text-xs"><thead><tr className="text-left text-slate-500">{cols.map(([k, l]) => <th key={k} className="pr-3">{l}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i} className="border-t border-slate-100">{cols.map(([k]) => <td key={k} className="py-1 pr-3">{k === 'started_at' ? dt(r[k]) : String(r[k] ?? '')}</td>)}</tr>)}</tbody></table></div>}</div>);
  return (
    <>
      {!sus ? <p className="text-xs text-slate-500">Loading...</p> : (<>
        <Block title="Answers that were very fast" hint="Rounds where 4 or more answers averaged under 1.2 seconds in the last 7 days. May be a bot or a script." rows={sus.too_fast} cols={[['customer_name', 'Customer'], ['customer_phone', 'Phone'], ['answers', 'Answers'], ['avg_ms', 'Avg ms'], ['started_at', 'When']]} />
        <Block title="Unusually heavy play today" hint="More than 20 rounds today." rows={sus.heavy_play} cols={[['customer_name', 'Customer'], ['customer_phone', 'Phone'], ['sessions_today', 'Rounds']]} />
        <Block title="Reached the daily reward limit" hint="Customers who earned the maximum coins today." rows={sus.at_daily_cap} cols={[['customer_name', 'Customer'], ['customer_phone', 'Phone'], ['earned_today', 'Coins earned']]} />
      </>)}
      <div className={`${box} overflow-x-auto`}><p className="text-sm font-black mb-1">Administrative changes (audit log)</p>
        <table className="w-full text-xs"><thead><tr className="text-left text-slate-500"><th className="pr-3">When</th><th className="pr-3">Who</th><th className="pr-3">Action</th><th>Detail</th></tr></thead>
          <tbody>{log.map(a => <tr key={a.id} className="border-t border-slate-100 align-top"><td className="py-1 pr-3 whitespace-nowrap">{dt(a.created_at)}</td><td className="pr-3">{a.actor_name}</td><td className="pr-3 font-bold">{a.action}</td><td className="text-slate-500 break-all">{a.detail ? JSON.stringify(a.detail).slice(0, 180) : ''}</td></tr>)}</tbody></table>
        {log.length === 0 && <p className="text-xs text-slate-500">No changes recorded yet.</p>}</div>
    </>
  );
}
