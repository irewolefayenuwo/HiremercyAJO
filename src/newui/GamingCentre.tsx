import React, { useCallback, useEffect, useState } from 'react';
import { Check, ChevronRight, Clock, Crown, Eye, EyeOff, Loader2, ShieldCheck, Wallet } from 'lucide-react';
import { Card, NotLive, PrimaryButton, ScreenHeader, SecondaryButton, SectionTitle, naira } from './ui';
import { BrainChallenge } from './BrainChallenge';
import { BuyCoinsView, MembershipView, WithdrawView } from './GameEconomy';
import {
  type GameDef, type GameState, KIND_LABEL, type LedgerRow, gameRpc, loadGameState
} from './gameApi';
import { type ArtKind, CoinIcon, GameArt, GameStyles, IconMusic, IconSound } from './GameArt';
import { getSoundPrefs, setSoundPref } from './gameSound';

type View =
  | { v: 'home' } | { v: 'games'; tab?: 'all' | 'standard' | 'premium' } | { v: 'premium' }
  | { v: 'rewards'; tab?: 'coins' | 'rewards' | 'history' } | { v: 'buy' } | { v: 'plans' } | { v: 'withdraw' }
  | { v: 'entry'; key: string } | { v: 'play'; key: string; round: number } | { v: 'upcoming'; key: string };

const when = (s: string) => new Date(s).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const GREEN = 'bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-600';
const art = (k: string): ArtKind => (['brain', 'wheel', 'dice', 'bottle', 'race'].includes(k) ? (k as ArtKind) : 'trophy');

const RULES: Record<string, string> = {
  wheel: 'Spin the wheel to discover your coin reward. Every spin is decided by the server, so results cannot be changed.',
  dice: 'Roll the dice and beat your opponent. Each roll is decided by the server and recorded in your game history.',
  bottle: 'Flip the bottle and land it upright to win. Your score is checked by the server, and every round is recorded.',
  race: 'A practice game with an animated multiplier. It uses practice credits only: no purchases, no real money and no prizes.'
};

function Tag({ g, gs }: { g: GameDef; gs: GameState }) {
  const cost = g.access?.cost ?? g.entry_cost; const code = g.access?.code;
  const [txt, cls] = !g.playable ? ['Coming soon', 'bg-slate-700 text-white'] : code === 'MAINTENANCE' ? ['Maintenance', 'bg-red-600 text-white'] : code === 'MEMBERSHIP_REQUIRED' ? ['Members only', 'bg-amber-400 text-emerald-950'] : g.tier === 'premium' ? ['Premium', 'bg-amber-400 text-emerald-950'] : cost === 0 || !gs.settings.paid_play ? ['Free', 'bg-emerald-500 text-white'] : [`${cost} coins`, 'bg-emerald-500 text-white'];
  return <span className={`absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 text-[10px] font-black shadow ${cls}`}>{txt}</span>;
}

function SoundButtons() {
  const [p, setP] = useState(getSoundPrefs());
  const t = (k: 'sfx' | 'music') => { const n = !p[k]; setSoundPref(k, n); setP({ ...p, [k]: n }); };
  const b = (on: boolean) => `w-9 h-9 rounded-full flex items-center justify-center border ${on ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-slate-500 border-slate-300'}`;
  return (
    <div className="flex gap-1.5">
      <button type="button" onClick={() => t('sfx')} aria-pressed={p.sfx} aria-label={p.sfx ? 'Mute sound effects' : 'Turn on sound effects'} className={b(p.sfx)}><IconSound on={p.sfx} className="w-4 h-4" /></button>
      <button type="button" onClick={() => t('music')} aria-pressed={p.music} aria-label={p.music ? 'Turn music off' : 'Turn music on'} className={b(p.music)}><IconMusic on={p.music} className="w-4 h-4" /></button>
    </div>
  );
}

function MiniTile({ g, gs, onOpen }: { g: GameDef; gs: GameState; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="relative text-center active:scale-[0.97] transition">
      <div className="relative rounded-2xl overflow-hidden shadow-md border border-emerald-900/10"><GameArt kind={art(g.key)} className="w-full h-auto block" animate={false} /><Tag g={g} gs={gs} /></div>
      <p className="mt-1.5 text-[12px] font-extrabold text-emerald-950 leading-tight">{g.name}</p>
    </button>
  );
}

function GameCard({ g, gs, onOpen }: { g: GameDef; gs: GameState; onOpen: () => void }) {
  const free = !gs.settings.paid_play || g.entry_cost === 0;
  return (
    <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm overflow-hidden flex flex-col">
      <button type="button" onClick={onOpen} className="relative block text-left" aria-label={`Open ${g.name}`}>
        <GameArt kind={art(g.key)} className="w-full h-auto block" /><Tag g={g} gs={gs} />
      </button>
      <div className="p-3 flex flex-col gap-1 flex-1">
        <p className="text-sm font-extrabold text-emerald-950 leading-tight">{g.name}</p>
        <p className="text-[11px] text-slate-500 font-medium leading-snug line-clamp-2">{g.tagline}</p>
        <p className="text-[10px] font-bold text-slate-400 capitalize">Difficulty: {g.difficulty}</p>
        <div className="mt-auto pt-2 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-[12px] font-black text-amber-700"><CoinIcon size={15} />{free ? 'Free' : g.entry_cost}</span>
          <button type="button" onClick={onOpen} className={`rounded-full px-4 py-1.5 text-xs font-black ${g.playable ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-600'}`}>{g.playable ? 'Play' : 'Preview'}</button>
        </div>
      </div>
    </div>
  );
}

export function GamingCentre({ onSection }: { onSection?: (s: any) => void }) {
  const [stack, setStack] = useState<View[]>([{ v: 'home' }]);
  const view = stack[stack.length - 1];
  const push = (v: View) => setStack(s => [...s, v]);
  const pop = () => setStack(s => (s.length > 1 ? s.slice(0, -1) : s));
  const replace = (v: View) => setStack(s => [...s.slice(0, -1), v]);
  const toGames = () => setStack([{ v: 'home' }, { v: 'games' }]);

  const [gs, setGs] = useState<GameState | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [hide, setHide] = useState(false);

  const reload = useCallback(async (force = false) => {
    const r = await loadGameState(force);
    if (r.ok) { setGs(r.data); setErr(''); } else setErr(r.message);
    setLoading(false);
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const game = (k: string) => gs?.games.find(g => g.key === k);
  const open = (g: GameDef) => push(g.playable ? { v: 'entry', key: g.key } : { v: 'upcoming', key: g.key });
  const bal = gs?.wallet.balance ?? 0;
  const money = (n: number) => (hide ? '••••' : n.toLocaleString());

  if (loading) return <Card className="max-w-3xl mx-auto text-center py-16"><Loader2 className="w-8 h-8 mx-auto text-emerald-700 motion-safe:animate-spin" /><p className="text-xs font-bold text-slate-500 mt-2">Loading the Gaming Centre...</p></Card>;
  if (err || !gs) return (
    <div className="max-w-3xl mx-auto space-y-3"><ScreenHeader title="Play & Earn" subtitle="Gaming Centre" onBack={() => onSection?.('home')} />
      <NotLive title="Could not load the Gaming Centre">{err || 'Please try again.'}</NotLive><PrimaryButton onClick={() => { setLoading(true); reload(true); }}>Try again</PrimaryButton></div>);
  if (!gs.settings.master) return (
    <div className="max-w-3xl mx-auto space-y-3"><ScreenHeader title="Play & Earn" subtitle="Gaming Centre" onBack={() => onSection?.('home')} />
      <Card className="text-center py-10"><GameArt kind="trophy" className="w-24 h-24 mx-auto" /><p className="mt-3 text-base font-extrabold text-emerald-950">The Gaming Centre opens soon</p>
        <p className="text-xs text-slate-500 font-medium mt-1">Brain games, spinning wheels and more are on the way. We will tell you when it is ready.</p></Card></div>);

  const preview = gs.settings.preview ? (
    <div className="rounded-2xl bg-amber-50 border border-amber-300 px-3 py-2 text-[11px] font-bold text-amber-900" role="status">Admin preview: customers cannot see the Gaming Centre yet. Switch it on in Game Management.</div>) : null;
  const premiumGames = gs.games.filter(g => g.tier === 'premium');
  const standardGames = gs.games.filter(g => g.tier === 'standard');
  const brain = game('brain');
  const wd = !!gs.settings.withdrawals?.available;

  // ---------------- entry confirmation ----------------
  if (view.v === 'entry') {
    const g = game(view.key);
    if (!g) { pop(); return null; }
    const acc = g.access; const blocked = !!acc && !acc.allowed; const cost = acc?.allowed ? (acc.cost ?? g.entry_cost) : g.entry_cost;
    const short = !blocked && cost > 0 && bal < cost; const cfg = g.config || {};
    return (
      <div className="max-w-xl mx-auto space-y-4 fade-in"><GameStyles />
        <ScreenHeader title={g.name} subtitle="Confirm and start" onBack={pop} />
        <Card className="space-y-3">
          <div className="flex items-center gap-3"><GameArt kind={art(g.key)} className="w-20 h-20 rounded-2xl" /><div><p className="text-base font-extrabold text-emerald-950">{g.name}</p><p className="text-xs text-slate-500 font-medium">{g.tagline}</p></div></div>
          {g.key === 'brain' && <ul className="text-xs font-semibold text-slate-600 space-y-1 list-disc pl-5">
            <li>{cfg.questions_per_round ?? 6} questions, {cfg.timer_seconds ?? 15} seconds each</li><li>A wrong answer or running out of time ends the round</li>
            {gs.settings.rewards && <li>Finish all questions to win {cfg.win_reward ?? 0} coins{cfg.win_bonus ? ` plus ${cfg.win_bonus} bonus coins` : ''}</li>}
            {gs.settings.rewards && (cfg.per_correct ?? 0) > 0 && <li>Each correct answer earns {cfg.per_correct} coins if you do not finish</li>}</ul>}
          <dl className="divide-y divide-slate-100 text-sm">
            <div className="flex justify-between py-2"><dt className="text-slate-500 font-semibold">Entry</dt><dd className="font-black text-slate-900">{cost > 0 ? <span className="inline-flex items-center gap-1"><CoinIcon size={16} />{cost} coins</span> : 'Free play'}{!!acc?.discount_pct && acc.discount_pct > 0 && <span className="ml-2 text-[10px] font-bold text-emerald-700">{acc.discount_pct}% member discount{acc.base_cost ? ` (was ${acc.base_cost})` : ''}</span>}</dd></div>
            <div className="flex justify-between py-2"><dt className="text-slate-500 font-semibold">Your coins</dt><dd className="font-black text-slate-900 inline-flex items-center gap-1"><CoinIcon size={16} />{bal.toLocaleString()}</dd></div>
          </dl>
        </Card>
        {blocked && <NotLive title="You cannot play this right now">{acc?.message}{acc?.code === 'MEMBERSHIP_REQUIRED' && acc.upgrade?.length ? ` Available with: ${acc.upgrade.map(u => u.name).join(', ')}.` : ''}</NotLive>}
        {blocked && acc?.code === 'MEMBERSHIP_REQUIRED' && <PrimaryButton onClick={() => push({ v: 'plans' })} className="w-full">See memberships</PrimaryButton>}
        {short && <NotLive title="Not enough coins">You need {cost} coins to play. {gs.settings.coin_purchases ? 'Buy coins to continue.' : 'Coin purchases are not open yet.'}</NotLive>}
        <div className="grid grid-cols-2 gap-3">
          <SecondaryButton onClick={pop}>Cancel</SecondaryButton>
          {short && gs.settings.coin_purchases ? <PrimaryButton onClick={() => push({ v: 'buy' })}>Buy coins</PrimaryButton>
            : <PrimaryButton disabled={short || blocked} onClick={() => replace({ v: 'play', key: g.key, round: Date.now() })}>{cost > 0 ? `Pay ${cost} & play` : 'Start'}</PrimaryButton>}
        </div>
        <p className="text-[11px] text-slate-500 font-medium">Coins you buy are for playing only. Only eligible earned coins can be converted to wallet money, and only when withdrawals are open.</p>
      </div>);
  }

  // ---------------- gameplay ----------------
  if (view.v === 'play') {
    const g = game(view.key);
    return (
      <div className="space-y-3 fade-in" key={view.round}>
        <BrainChallenge balance={bal} entryCost={g?.entry_cost ?? 0} canBuy={!!gs.settings.coin_purchases}
          onExit={() => { reload(true); setStack([{ v: 'home' }, { v: 'games' }]); }}
          onPlayAgain={() => { reload(true); replace({ v: 'entry', key: view.key }); }}
          onBuyCoins={() => push({ v: 'buy' })} onFinished={() => { reload(true); }} />
      </div>);
  }

  // ---------------- preview of games that arrive in later updates ----------------
  if (view.v === 'upcoming') {
    const g = game(view.key); if (!g) { pop(); return null; }
    return (
      <div className="max-w-xl mx-auto space-y-4 fade-in"><GameStyles />
        <ScreenHeader title={g.name} subtitle={g.tier === 'premium' ? 'Premium game' : 'Standard game'} onBack={pop} />
        <div className={`${GREEN} rounded-3xl p-5 text-white text-center shadow-md`}>
          <GameArt kind={art(g.key)} className="w-40 h-40 mx-auto rounded-3xl shadow-xl" />
          <p className="mt-3 text-xl font-black">{g.name}</p><p className="text-sm text-emerald-100 font-medium">{g.tagline}</p>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-black/30 border border-white/20 px-3 py-1 text-xs font-black"><Clock className="w-3.5 h-3.5" />Coming in the next update</span></div>
        <Card className="space-y-2"><p className="text-sm font-extrabold text-emerald-950">How it will work</p><p className="text-xs font-medium text-slate-600">{RULES[g.key] || g.tagline}</p>
          <p className="text-xs font-bold text-slate-700">Entry: {g.key === 'race' ? 'practice credits only' : g.listed_cost > 0 ? `${g.listed_cost} coins` : 'Free'}</p>
          {g.key === 'race' && <p className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">Practice only: no purchased stakes, no real-money wagering and no withdrawable prizes.</p>}</Card>
        <SecondaryButton onClick={pop} className="w-full">Back to games</SecondaryButton>
      </div>);
  }

  // ---------------- game selection ----------------
  if (view.v === 'games') {
    const tab = view.tab ?? 'all';
    const list = gs.games.filter(g => tab === 'all' || g.tier === tab);
    return (
      <div className="max-w-3xl mx-auto space-y-4 fade-in"><GameStyles />
        <ScreenHeader title="Play & Earn" subtitle="Choose your game and start earning coins!" onBack={pop} />
        {preview}
        <div className="flex gap-2" role="tablist">{(['all', 'standard', 'premium'] as const).map(t => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => replace({ v: 'games', tab: t })}
            className={`flex-1 rounded-full py-2 text-xs font-black capitalize ${tab === t ? 'bg-emerald-700 text-white' : 'bg-white border border-emerald-200 text-emerald-800'}`}>{t === 'all' ? 'All Games' : t}</button>))}</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{list.map(g => <GameCard key={g.key} g={g} gs={gs} onOpen={() => open(g)} />)}</div>
        {list.length === 0 && <Card className="text-center text-xs text-slate-500 font-semibold">No games here yet.</Card>}
      </div>);
  }

  // ---------------- premium gaming club ----------------
  if (view.v === 'premium') {
    return (
      <div className="max-w-3xl mx-auto space-y-4 fade-in"><GameStyles />
        <ScreenHeader title="Premium Gaming Club" subtitle="Unlock exclusive games, bigger rewards and more!" onBack={pop} />
        <div className={`${GREEN} rounded-3xl p-4 text-white flex items-center gap-3 shadow-md border-2 border-amber-300/60`}>
          <GameArt kind="crown" className="w-16 h-16 shrink-0 rounded-2xl" />
          <div className="flex-1 min-w-0"><p className="text-lg font-black">Premium Membership</p>
            <p className="text-xs text-emerald-100 font-medium">{gs.membership.active ? `Active: ${gs.membership.plan_name} until ${when(gs.membership.expires_at!)}` : 'Access all premium games and enjoy exclusive benefits.'}</p></div>
          <button type="button" onClick={() => push({ v: 'plans' })} className="rounded-full bg-amber-400 text-emerald-950 px-4 py-2 text-xs font-black shrink-0">View Plans</button></div>
        <SectionTitle>Premium games</SectionTitle>
        <div className="space-y-3">{premiumGames.map(g => (
          <div key={g.key} className="bg-white rounded-3xl border border-emerald-100 shadow-sm p-3 flex items-center gap-3">
            <div className="relative w-20 shrink-0"><GameArt kind={art(g.key)} className="w-20 h-20 rounded-2xl" animate={false} /></div>
            <div className="flex-1 min-w-0"><p className="text-sm font-extrabold text-emerald-950">{g.name}</p><p className="text-[11px] text-slate-500 font-medium line-clamp-2">{g.tagline}</p>
              <p className="text-[11px] font-black text-amber-700 mt-0.5 inline-flex items-center gap-1"><CoinIcon size={14} />Entry: {g.listed_cost > 0 ? g.listed_cost : 'Free'}</p></div>
            <button type="button" onClick={() => open(g)} className="rounded-full bg-emerald-700 text-white px-4 py-2 text-xs font-black">{g.playable ? 'Play' : 'Preview'}</button></div>))}
          {premiumGames.length === 0 && <Card className="text-center text-xs text-slate-500 font-semibold">No premium games yet.</Card>}</div>
      </div>);
  }

  if (view.v === 'rewards') return <RewardsView gs={gs} tab={view.tab ?? 'coins'} setTab={t => replace({ v: 'rewards', tab: t })} onBack={pop} onBuy={() => push({ v: 'buy' })} onWithdraw={() => push({ v: 'withdraw' })} hide={hide} setHide={setHide} />;
  if (view.v === 'buy') return <BuyCoinsView gs={gs} onBack={pop} onChanged={() => reload(true)} onPlans={() => push({ v: 'plans' })} onAddMoney={() => onSection?.('wallet')} />;
  if (view.v === 'plans') return <MembershipView gs={gs} onBack={pop} onChanged={() => reload(true)} onAddMoney={() => onSection?.('wallet')} />;
  if (view.v === 'withdraw') return <WithdrawView gs={gs} onBack={pop} onChanged={() => reload(true)} />;

  // ---------------- play & earn home ----------------
  return (
    <div className="max-w-3xl mx-auto space-y-4 fade-in"><GameStyles />
      <div className="flex items-center justify-between gap-2">
        <div><h2 className="text-xl font-black text-emerald-950">Play &amp; Earn</h2><p className="text-xs text-slate-500 font-medium">Play, earn and enjoy</p></div>
        <SoundButtons />
      </div>
      {preview}
      <div className={`${GREEN} rounded-3xl p-4 text-white shadow-md`}>
        <div className="flex items-center gap-3">
          <CoinIcon size={44} />
          <div className="flex-1 min-w-0"><p className="text-xs font-bold text-emerald-100">Game Coins</p>
            <p className="text-3xl font-black leading-none">{money(bal)}</p></div>
          <button type="button" onClick={() => setHide(!hide)} aria-label={hide ? 'Show balance' : 'Hide balance'} className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">{hide ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
        </div>
        <div className={`mt-3 grid gap-2 ${wd ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <button type="button" onClick={() => push({ v: 'rewards' })} className="rounded-xl bg-white/15 border border-white/20 py-2 text-xs font-black">Coins &amp; History</button>
          {wd && <button type="button" onClick={() => push({ v: 'withdraw' })} className="rounded-xl bg-white/10 border-2 border-amber-300 py-2 text-xs font-black inline-flex items-center justify-center gap-1.5"><Wallet className="w-4 h-4" />Withdraw Coins</button>}
          <button type="button" disabled={!gs.settings.coin_purchases} onClick={() => push({ v: 'buy' })} className="rounded-xl bg-amber-400 text-emerald-950 py-2 text-xs font-black disabled:opacity-50">{gs.settings.coin_purchases ? 'Buy Coins' : 'Buying opens soon'}</button>
        </div>
      </div>
      <button type="button" onClick={() => (brain?.playable ? push({ v: 'entry', key: 'brain' }) : toGames())}
        className="w-full rounded-2xl bg-gradient-to-b from-emerald-600 to-emerald-800 text-white py-4 text-lg font-black shadow-lg border border-emerald-400/40 active:scale-[0.98] transition">▶  Play Now</button>

      {premiumGames.length > 0 && (<div>
        <div className="flex items-center justify-between"><SectionTitle>Premium Games</SectionTitle><button type="button" onClick={() => push({ v: 'premium' })} className="text-xs font-black text-emerald-700 mb-2">View All</button></div>
        <div className="grid grid-cols-3 gap-2.5">{premiumGames.slice(0, 3).map(g => <MiniTile key={g.key} g={g} gs={gs} onOpen={() => open(g)} />)}</div></div>)}
      {standardGames.length > 0 && (<div>
        <div className="flex items-center justify-between"><SectionTitle>Standard Games</SectionTitle><button type="button" onClick={() => push({ v: 'games', tab: 'standard' })} className="text-xs font-black text-emerald-700 mb-2">View All</button></div>
        <div className="grid grid-cols-3 gap-2.5">{standardGames.slice(0, 3).map(g => <MiniTile key={g.key} g={g} gs={gs} onOpen={() => open(g)} />)}</div></div>)}

      <button type="button" onClick={() => push({ v: 'plans' })} className={`${GREEN} w-full rounded-3xl p-4 text-white flex items-center gap-3 text-left shadow-md`}>
        <GameArt kind="crown" className="w-14 h-14 shrink-0 rounded-2xl" animate={false} />
        <div className="flex-1"><p className="text-base font-black">Premium Membership</p><p className="text-xs text-emerald-100 font-medium">{gs.membership.active ? `Active until ${when(gs.membership.expires_at!)}` : 'Unlock more games and bigger rewards.'}</p></div>
        <ChevronRight className="w-5 h-5" /></button>
      <p className="text-[11px] text-slate-500 font-medium text-center flex items-center justify-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" />Purchased coins are for playing only. Only eligible earned coins can be converted, when withdrawals are open. Play responsibly.</p>
    </div>
  );
}

// =====================================================================================================
function RewardsView({ gs, tab, setTab, onBack, onBuy, onWithdraw, hide, setHide }: { gs: GameState; tab: 'coins' | 'rewards' | 'history'; setTab: (t: 'coins' | 'rewards' | 'history') => void; onBack: () => void; onBuy: () => void; onWithdraw: () => void; hide: boolean; setHide: (b: boolean) => void }) {
  const [rows, setRows] = useState<LedgerRow[] | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { let on = true; (async () => { const r = await gameRpc<LedgerRow[]>('game_my_ledger', { p_limit: 40 }); if (!on) return; if (r.ok) setRows(r.data); else setErr(r.message); })(); return () => { on = false; }; }, []);
  const w = gs.wallet; const money = (n: number) => (hide ? '••••' : n.toLocaleString());
  const brain = gs.games.find(g => g.key === 'brain'); const c = brain?.config || {};
  const list = (n?: number) => (rows ? rows.slice(0, n) : []).map(r => (
    <li key={r.id} className="flex items-center gap-3 py-2.5">
      <span className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${r.amount > 0 ? 'bg-emerald-100' : 'bg-red-50'}`}><CoinIcon size={20} /></span>
      <div className="flex-1 min-w-0"><p className="text-sm font-bold text-slate-900 truncate">{r.note || KIND_LABEL[r.kind] || r.kind}</p><p className="text-[10px] text-slate-400 font-semibold">{when(r.created_at)}{r.source_name ? ` · ${r.source_name}` : ''}{r.amount > 0 && r.eligible ? ' · withdrawable' : ''}</p></div>
      <span className={`text-sm font-black ${r.amount > 0 ? 'text-emerald-700' : 'text-red-600'}`}>{r.amount > 0 ? '+' : ''}{r.amount.toLocaleString()} coins</span></li>));
  return (
    <div className="max-w-3xl mx-auto space-y-4 fade-in"><GameStyles />
      <ScreenHeader title="My Game Rewards" subtitle="Your coins, rewards and history" onBack={onBack} />
      <div className="flex gap-2" role="tablist">{([['coins', 'Game Coins'], ['rewards', 'Rewards'], ['history', 'History']] as const).map(([k, l]) => (
        <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`flex-1 rounded-full py-2 text-xs font-black ${tab === k ? 'bg-emerald-700 text-white' : 'bg-white border border-emerald-200 text-emerald-800'}`}>{l}</button>))}</div>
      {tab === 'coins' && (<>
        <Card className="space-y-3">
          <p className="text-xs font-bold text-slate-500">Game Coin Balance</p>
          <div className="flex items-center gap-3"><CoinIcon size={40} /><p className="text-3xl font-black text-emerald-950 flex-1">{money(w.balance)}</p>
            <button type="button" disabled={!gs.settings.coin_purchases} onClick={onBuy} className="rounded-full bg-emerald-700 text-white px-4 py-2 text-xs font-black disabled:opacity-50">{gs.settings.coin_purchases ? 'Buy Coins' : 'Buying soon'}</button></div>
          <button type="button" onClick={() => setHide(!hide)} className="text-[11px] font-bold text-emerald-700 inline-flex items-center gap-1">{hide ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}{hide ? 'Show balance' : 'Hide balance'}</button>
        </Card>
        <div className="grid grid-cols-3 gap-2">{[['Purchased', w.purchased], ['Earned', w.earned], ['Eligible to withdraw', w.eligible], ['Earned Today', w.earned_today], ['Total Earned', w.total_earned], ['Total Spent', w.total_spent]].map(([l, v]) => (
          <div key={String(l)} className="bg-white rounded-2xl border border-emerald-100 p-3 text-center"><p className="text-[10px] font-bold text-slate-500">{l}</p><p className="text-lg font-black text-emerald-900 inline-flex items-center gap-1 justify-center"><CoinIcon size={14} />{money(Number(v))}</p></div>))}</div>
        {gs.settings.withdrawals?.available && <PrimaryButton onClick={onWithdraw} className="w-full">Withdraw Coins</PrimaryButton>}
        <div><div className="flex items-center justify-between"><SectionTitle>Recent Activity</SectionTitle><button type="button" onClick={() => setTab('history')} className="text-xs font-black text-emerald-700 mb-2">View All</button></div>
          <Card>{err ? <p className="text-xs text-red-600 font-semibold">{err}</p> : rows === null ? <p className="text-xs text-slate-500 font-semibold">Loading...</p> : rows.length === 0 ? <p className="text-xs text-slate-500 font-semibold py-2">No coin activity yet. Play a game to get started!</p> : <ul className="divide-y divide-slate-100">{list(5)}</ul>}</Card></div>
        <Card className="flex items-start gap-3 bg-emerald-50 border-emerald-100"><ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" /><p className="text-xs font-semibold text-emerald-900">Game coins are kept separate from your wallet and AJO savings. Coins you buy are for playing only. Only eligible earned coins can be converted to wallet money, and only when withdrawals are open.</p></Card>
      </>)}
      {tab === 'rewards' && (
        <Card className="space-y-3">
          <p className="text-sm font-extrabold text-emerald-950">How you earn coins</p>
          {!gs.settings.rewards && <NotLive title="Rewards are paused">Rewards are switched off for now. You can still play for fun.</NotLive>}
          <ul className="text-xs font-semibold text-slate-700 space-y-2">
            <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" />Brain Challenge: finish all {c.questions_per_round ?? 6} questions to win {c.win_reward ?? 0} coins{c.win_bonus ? ` + ${c.win_bonus} bonus coins` : ''}.</li>
            {(c.per_correct ?? 0) > 0 && <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" />If a round ends early, you still earn {c.per_correct} coins for every correct answer.</li>}
          </ul>
          <p className="text-[11px] text-slate-500 font-medium">There may be a daily limit on coins you can earn from play. You have earned {w.earned_today.toLocaleString()} coins today.</p>
        </Card>)}
      {tab === 'history' && (
        <Card>{err ? <p className="text-xs text-red-600 font-semibold">{err}</p> : rows === null ? <p className="text-xs text-slate-500 font-semibold">Loading...</p> : rows.length === 0 ? <p className="text-xs text-slate-500 font-semibold py-2">Nothing here yet.</p> : <ul className="divide-y divide-slate-100">{list()}</ul>}</Card>)}
    </div>
  );
}
