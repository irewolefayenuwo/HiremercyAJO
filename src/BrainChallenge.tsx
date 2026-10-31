import React, { useEffect, useReducer, useRef, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { brainReducer, climberMode, initialBrain } from './brainLogic';
import { type BrainAnswer, type BrainPayload, gameRpc, invalidateGameState, newKey } from './gameApi';
import { getSoundPrefs, setSoundPref, silenceAll, sfx } from './gameSound';
import { CauldronScene, CoinIcon, Confetti, GameStyles, IconMusic, IconSound } from './GameArt';

interface Props {
  balance: number;          // coin balance before this round started
  entryCost: number;        // what this round costs (0 = free play)
  canBuy: boolean;          // coin purchases are open
  onExit: () => void;       // back to the games list
  onPlayAgain: () => void;  // start another round (goes through the entry confirmation again)
  onBuyCoins: () => void;
  onFinished?: (r: BrainAnswer | null) => void;
}

const LETTERS = ['A', 'B', 'C', 'D'];
const asOf = (d?: string | null) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

function Ring({ left, total }: { left: number; total: number }) {
  const C = 2 * Math.PI * 18; const low = left <= 5;
  return (
    <div className={`relative w-12 h-12 ${low && left > 0 ? 'gc-a-shake' : ''}`} role="timer" aria-label={`${left} seconds left`}>
      <svg viewBox="0 0 44 44" className="w-12 h-12 -rotate-90">
        <circle cx="22" cy="22" r="18" fill="rgba(0,0,0,.35)" stroke="rgba(255,255,255,.2)" strokeWidth="4" />
        <circle cx="22" cy="22" r="18" fill="none" stroke={low ? '#F87171' : '#34D399'} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - Math.max(0, left) / Math.max(1, total))} style={{ transition: 'stroke-dashoffset 1s linear' }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-black">{left}s</span>
    </div>
  );
}

export function BrainChallenge({ balance, entryCost, canBuy, onExit, onPlayAgain, onBuyCoins, onFinished }: Props) {
  const [s, dispatch] = useReducer(brainReducer, initialBrain);
  const [prefs, setPrefs] = useState(getSoundPrefs());
  const key = useRef(newKey());
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      const r = await gameRpc<BrainPayload>('game_brain_start', { p_idem: key.current });
      if (r.ok) dispatch({ type: 'started', payload: r.data }); else dispatch({ type: 'error', message: r.message });
    })();
    return () => silenceAll();
  }, []);

  // the countdown is only for show: the server keeps the real clock and judges every answer
  useEffect(() => {
    if (s.phase !== 'asking') return;
    const t = setInterval(() => dispatch({ type: 'tick' }), 1000);
    return () => clearInterval(t);
  }, [s.phase, s.index]);

  const submit = async (choice: number | null) => {
    if (!(s.phase === 'asking' || (s.phase === 'error' && s.sessionId))) return;
    dispatch({ type: 'submit', choice });
    sfx('tap');
    const r = await gameRpc<BrainAnswer>('game_brain_answer', { p_session: s.sessionId, p_idx: s.index, p_choice: choice ?? -1 });
    if (!r.ok) { dispatch({ type: 'submitFailed', message: r.message }); return; }
    dispatch({ type: 'answered', answer: r.data, choice });
  };

  useEffect(() => { if (s.phase === 'asking' && s.secondsLeft === 0) submit(null); /* eslint-disable-next-line */ }, [s.phase, s.secondsLeft]);
  useEffect(() => { if (s.phase === 'asking' && s.secondsLeft > 0 && s.secondsLeft <= 5) sfx('tick'); }, [s.secondsLeft, s.phase]);
  useEffect(() => {
    if (s.phase === 'correct') sfx('correct'); else if (s.phase === 'wrong') sfx('wrong');
    else if (s.phase === 'won') sfx('win'); else if (s.phase === 'failed') sfx('lose');
  }, [s.phase]);
  useEffect(() => { if (s.phase === 'wrong') { const t = setTimeout(() => dispatch({ type: 'advance' }), 2200); return () => clearTimeout(t); } }, [s.phase]);
  useEffect(() => { if (s.phase === 'won' || s.phase === 'failed') { invalidateGameState(); onFinished?.(s.result); } /* eslint-disable-next-line */ }, [s.phase]);

  const toggle = (k: 'sfx' | 'music') => { const next = !prefs[k]; setSoundPref(k, next); setPrefs({ ...prefs, [k]: next }); if (next && k === 'sfx') sfx('tap'); };
  const total = s.total; const over = s.phase === 'won' || s.phase === 'failed';
  const shownBalance = s.result?.balance ?? Math.max(0, balance - (s.sessionId ? entryCost : 0));
  const mode = climberMode(s);
  const reward = s.result?.reward ?? 0; const bonus = s.result?.bonus ?? 0;

  return (
    <div className="relative max-w-xl mx-auto rounded-3xl overflow-hidden bg-gradient-to-b from-[#0B1B3A] to-[#24103a] text-white shadow-xl select-none">
      <GameStyles />
      {s.phase === 'won' && <Confetti />}

      {/* top bar */}
      <div className="flex items-center justify-between gap-2 px-3 pt-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/40 border border-white/15 px-3 py-1.5 text-sm font-black"><CoinIcon size={18} />{shownBalance.toLocaleString()}</span>
        {!over && s.phase !== 'loading' && s.phase !== 'error' && (
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-black/40 border border-white/15 px-3 py-1 text-xs font-black">{Math.min(s.index + 1, total)}/{total}</span>
            <Ring left={s.secondsLeft} total={s.timerSeconds} />
          </div>)}
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => toggle('sfx')} aria-pressed={prefs.sfx} aria-label={prefs.sfx ? 'Mute sound effects' : 'Turn on sound effects'}
            className={`w-9 h-9 rounded-full flex items-center justify-center border border-white/15 ${prefs.sfx ? 'bg-emerald-600/80' : 'bg-black/40 text-white/60'}`}><IconSound on={prefs.sfx} className="w-4 h-4" /></button>
          <button type="button" onClick={() => toggle('music')} aria-pressed={prefs.music} aria-label={prefs.music ? 'Turn music off' : 'Turn music on'}
            className={`w-9 h-9 rounded-full flex items-center justify-center border border-white/15 ${prefs.music ? 'bg-emerald-600/80' : 'bg-black/40 text-white/60'}`}><IconMusic on={prefs.music} className="w-4 h-4" /></button>
          <button type="button" onClick={onExit} aria-label="Leave the game" className="w-9 h-9 rounded-full flex items-center justify-center bg-black/40 border border-white/15"><X className="w-4 h-4" /></button>
        </div>
      </div>

      {/* loading / error */}
      {s.phase === 'loading' && (
        <div className="py-24 text-center" role="status" aria-live="polite"><Loader2 className="w-10 h-10 mx-auto motion-safe:animate-spin" /><p className="mt-3 text-sm font-bold text-white/80">Preparing your round...</p></div>)}
      {s.phase === 'error' && (
        <div className="px-5 py-14 text-center space-y-4" role="alert">
          <p className="text-base font-extrabold">{s.sessionId ? 'We could not send your answer' : 'We could not start the round'}</p>
          <p className="text-sm text-white/80">{s.error}</p>
          <div className="flex flex-col gap-2 max-w-xs mx-auto">
            {s.sessionId ? <button type="button" onClick={() => submit(s.picked)} className="rounded-xl bg-emerald-600 py-3 text-sm font-black">Send answer again</button>
              : <button type="button" onClick={onPlayAgain} className="rounded-xl bg-emerald-600 py-3 text-sm font-black">Try again</button>}
            {canBuy && /enough game coins/.test(s.error || '') && <button type="button" onClick={onBuyCoins} className="rounded-xl bg-amber-500 text-emerald-950 py-3 text-sm font-black">Buy coins</button>}
            <button type="button" onClick={onExit} className="rounded-xl bg-white/10 py-3 text-sm font-bold">Back to games</button>
          </div>
        </div>)}

      {/* scene */}
      {!over && s.phase !== 'loading' && s.phase !== 'error' && (
        <div className="relative px-6 -mt-1">
          <CauldronScene level={s.score} total={total} mode={mode} />
          {s.phase === 'correct' && (
            <div className="absolute inset-x-6 top-3 gc-a-pop text-center" role="status">
              <div className="mx-auto inline-block bg-gradient-to-b from-emerald-400 to-emerald-700 border-2 border-emerald-200 rounded-xl px-8 py-1.5 text-2xl font-black tracking-wide drop-shadow">CORRECT!</div>
              <p className="mt-1 text-lg font-extrabold text-white drop-shadow">Well done!</p>
            </div>)}
          {s.phase === 'wrong' && (
            <div className="absolute inset-x-6 top-3 gc-a-pop text-center" role="alert">
              <div className="mx-auto inline-block bg-gradient-to-b from-red-500 to-red-800 border-2 border-red-200 rounded-xl px-8 py-1.5 text-2xl font-black tracking-wide drop-shadow">{s.timedOut ? "TIME'S UP!" : 'OH NO!'}</div>
              <p className="mt-1 text-lg font-extrabold text-white drop-shadow">{s.timedOut ? 'You ran out of time' : 'Wrong answer!'}</p>
            </div>)}
        </div>)}

      {/* question + answers */}
      {(s.phase === 'asking' || s.phase === 'submitting' || s.phase === 'correct' || s.phase === 'wrong') && s.question && (
        <div className="px-4 pb-4">
          <div className="rounded-2xl bg-white text-slate-900 p-4 shadow-lg">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[11px] font-black">{s.question.category_name || s.question.category}</span>
              {s.question.as_of && <span className="text-[10px] font-bold text-slate-500">As at {asOf(s.question.as_of)}</span>}
            </div>
            <p className="mt-2 text-base font-extrabold leading-snug">{s.question.text}</p>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {s.question.options.map((o, i) => {
                const reveal = s.phase === 'correct' || s.phase === 'wrong';
                const isRight = reveal && s.correctIndex === i;
                const isWrongPick = s.phase === 'wrong' && s.picked === i && s.correctIndex !== i;
                const base = i % 2 === 0 ? 'from-emerald-500 to-emerald-700' : 'from-sky-500 to-blue-700';
                const cls = isRight ? 'from-emerald-400 to-green-600 ring-4 ring-emerald-300' : isWrongPick ? 'from-red-500 to-red-700 ring-4 ring-red-300' : reveal ? 'from-slate-400 to-slate-500 opacity-60' : base;
                return (
                  <button key={i} type="button" disabled={s.phase !== 'asking'} onClick={() => submit(i)} aria-label={`Option ${LETTERS[i]}: ${o}`}
                    className={`relative rounded-xl bg-gradient-to-b ${cls} text-white px-2.5 py-3 text-left text-sm font-bold leading-tight min-h-[3.2rem] shadow active:scale-[0.97] transition disabled:cursor-default ${s.phase === 'submitting' && s.picked === i ? 'ring-4 ring-amber-300' : ''}`}>
                    <span className="mr-1.5 inline-flex w-5 h-5 rounded-full bg-black/25 items-center justify-center text-[11px] font-black">{LETTERS[i]}</span>{o}
                    {isRight && <Check className="absolute right-2 top-2 w-4 h-4" />}
                  </button>);
              })}
            </div>
            {(s.phase === 'correct' || s.phase === 'wrong') && s.explanation && <p className="mt-3 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg px-3 py-2">{s.explanation}</p>}
            {s.error && s.phase === 'asking' && <p className="mt-2 text-xs font-bold text-red-600" role="alert">{s.error} Tap your answer again.</p>}
          </div>
          {s.phase === 'correct' && (
            <button type="button" onClick={() => dispatch({ type: 'advance' })} className="mt-3 w-full rounded-2xl bg-gradient-to-b from-emerald-500 to-emerald-700 border border-emerald-300 py-3.5 text-base font-black shadow-lg active:scale-[0.98]">
              {s.result?.finished ? 'See my result' : 'Next question'}</button>)}
          {(s.phase === 'asking' || s.phase === 'submitting') && <p className="mt-3 text-center text-xs font-bold text-white/80 rounded-xl bg-emerald-800/80 py-2.5 border border-emerald-500/40">Choose your answer before time runs out!</p>}
          {s.phase === 'wrong' && <p className="mt-3 text-center text-xs font-bold text-white/80">Preparing your result...</p>}
        </div>)}

      {/* victory */}
      {s.phase === 'won' && (
        <div className="relative px-4 pb-5">
          <div className="-mt-1 px-2"><CauldronScene level={total} total={total} mode="dance" /></div>
          <div className="relative -mt-8 rounded-3xl bg-white text-slate-900 p-5 text-center shadow-xl gc-a-pop" role="status">
            <div className="-mt-12 mb-2 mx-auto w-max bg-gradient-to-b from-emerald-500 to-emerald-700 text-white rounded-xl px-5 py-2 border-2 border-emerald-200">
              <p className="text-lg font-black tracking-wide">CONGRATULATIONS!</p><p className="text-[11px] font-bold text-emerald-100">You completed the round!</p></div>
            <p className="text-sm font-extrabold text-amber-600 mt-3">Your Rewards</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-amber-50 border border-amber-200 py-3"><CoinIcon size={26} className="mx-auto" /><p className="text-xl font-black text-amber-700">+{reward}</p><p className="text-[10px] font-bold text-slate-500">Game Coins</p></div>
              <div className="rounded-2xl bg-amber-50 border border-amber-200 py-3"><CoinIcon size={26} className="mx-auto" /><p className="text-xl font-black text-amber-700">+{bonus}</p><p className="text-[10px] font-bold text-slate-500">Bonus Coins</p></div>
            </div>
            {reward + bonus === 0 && <p className="mt-2 text-[11px] font-semibold text-slate-500">No coins were added this time (rewards are paused or today&rsquo;s reward limit has been reached).</p>}
            <p className="mt-3 text-sm font-black">Score: {s.score}/{total}</p>
            <p className="text-[11px] font-semibold text-slate-500">Your balance: {shownBalance.toLocaleString()} coins</p>
            <button type="button" onClick={onPlayAgain} className="mt-4 w-full rounded-2xl bg-gradient-to-b from-emerald-600 to-emerald-800 text-white py-3.5 text-base font-black shadow active:scale-[0.98]">Play Again</button>
            <button type="button" onClick={onExit} className="mt-2 w-full rounded-2xl border-2 border-emerald-700 text-emerald-800 py-3 text-sm font-black">Back to Games</button>
          </div>
        </div>)}

      {/* failure */}
      {s.phase === 'failed' && (
        <div className="px-4 pb-5">
          <div className="px-6 -mt-1"><CauldronScene level={s.score} total={total} mode="fall" /></div>
          <div className="relative -mt-6 rounded-3xl bg-white text-slate-900 p-5 text-center shadow-xl gc-a-pop" role="status">
            <div className="-mt-12 mb-2 mx-auto w-max bg-gradient-to-b from-red-500 to-red-800 text-white rounded-xl px-6 py-2 border-2 border-red-200">
              <p className="text-xl font-black">You Failed!</p><p className="text-[11px] font-bold text-red-100">Better luck next time!</p></div>
            <p className="mt-3 text-sm font-black">Score: {s.score}/{total}</p>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1.5 text-sm font-black text-amber-700"><CoinIcon size={18} />Reward: {reward > 0 ? `+${reward} coins` : 'none this round'}</div>
            <p className="mt-2 text-[11px] font-semibold text-slate-500">Your balance: {shownBalance.toLocaleString()} coins</p>
            <button type="button" onClick={onPlayAgain} className="mt-4 w-full rounded-2xl bg-gradient-to-b from-emerald-600 to-emerald-800 text-white py-3.5 text-base font-black shadow active:scale-[0.98]">Try Again</button>
            <button type="button" onClick={onExit} className="mt-2 w-full rounded-2xl border-2 border-emerald-700 text-emerald-800 py-3 text-sm font-black">Back to Games</button>
          </div>
        </div>)}
    </div>
  );
}
