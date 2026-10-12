import React from 'react';
import { PiggyBank, Store, Gift, ShieldCheck } from 'lucide-react';
import { Mascot } from './Mascot';

/**
 * Welcome panel shown above/beside the EXISTING login and register forms.
 * It only adds branding, the character and a Login / Create account switch;
 * the forms and their authentication handlers are untouched.
 */
export function AuthHero({
  mode, onLogin, onRegister
}: { mode: 'login' | 'register'; onLogin: () => void; onRegister: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-600 text-white shadow-lg p-5 sm:p-7 fade-in">
      <div className="absolute -right-12 -top-14 w-52 h-52 rounded-full bg-amber-300/20 blur-3xl pointer-events-none" />
      <div className="absolute -left-14 -bottom-16 w-48 h-48 rounded-full bg-emerald-300/10 blur-3xl pointer-events-none" />

      <div className="relative flex items-center gap-3 sm:block">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-extrabold tracking-[0.2em] text-amber-300 uppercase">HireMercyAJO</p>
          <h2 className="text-xl sm:text-3xl font-black leading-tight mt-1">
            Save daily. <span className="text-amber-300">Shop smart.</span> Earn rewards.
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100 font-medium mt-2 max-w-sm">
            Your trusted space to save, contribute, shop and earn - all in one place.
          </p>
        </div>
        <div className="shrink-0 sm:hidden"><Mascot pose="wave" size={110} /></div>
      </div>

      <div className="relative hidden sm:flex justify-center my-2"><Mascot pose="wave" size={190} /></div>

      <div className="relative hidden sm:grid grid-cols-3 gap-2 mt-2">
        {[
          { i: PiggyBank, t: 'Daily Ajo' },
          { i: Store, t: 'Marketplace' },
          { i: Gift, t: 'Rewards' }
        ].map(({ i: Icon, t }) => (
          <div key={t} className="rounded-2xl bg-white/10 border border-white/15 px-2 py-2.5 text-center">
            <Icon className="w-5 h-5 mx-auto text-amber-300" />
            <p className="text-[11px] font-bold mt-1">{t}</p>
          </div>
        ))}
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-1 p-1 rounded-2xl bg-black/20" role="tablist" aria-label="Login or register">
        <button type="button" role="tab" aria-selected={mode === 'login'} onClick={onLogin}
          className={`py-2.5 rounded-xl text-sm font-bold transition ${mode === 'login' ? 'bg-white text-emerald-800 shadow' : 'text-white/80 hover:text-white'}`}>
          Login
        </button>
        <button type="button" role="tab" aria-selected={mode === 'register'} onClick={onRegister}
          className={`py-2.5 rounded-xl text-sm font-bold transition ${mode === 'register' ? 'bg-white text-emerald-800 shadow' : 'text-white/80 hover:text-white'}`}>
          Create account
        </button>
      </div>

      <p className="relative mt-3 flex items-center gap-1.5 text-[11px] text-emerald-100 font-medium">
        <ShieldCheck className="w-3.5 h-3.5 text-amber-300 shrink-0" /> Secure sign-in. Your savings records stay private to you.
      </p>
    </div>
  );
}
