import React from 'react';
import { Flame } from 'lucide-react';
import type { StreakInfo } from './useStreak';

const DAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function StreakStrip({ streak, loaded, compact }: { streak: StreakInfo | null; loaded: boolean; compact?: boolean }) {
  const today = new Date();
  const days = streak?.days || [false, false, false, false, false, false, false];
  const size = compact ? 'max-w-[34px]' : 'max-w-[38px]';
  return (
    <>
      <div className="flex items-center gap-1.5">
        {days.map((on, i) => {
          const d = new Date(today); d.setDate(today.getDate() - (6 - i));
          return (
            <span key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <span className={`w-full aspect-square ${size} rounded-full flex items-center justify-center border-2 ${on ? 'bg-amber-400 border-amber-400' : 'border-dashed border-slate-200'}`}>
                <Flame className={`w-4 h-4 ${on ? 'text-white' : 'text-slate-300'}`} />
              </span>
              <span className="text-[9px] font-bold text-slate-400">{DAY[d.getDay()]}</span>
            </span>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-500 font-medium mt-2 leading-relaxed">
        {!loaded ? 'Loading...' : !streak ? 'Streak tracking is unavailable right now.'
          : streak.rewards_enabled && streak.reward_points > 0
            ? `${streak.streak}-day streak. Log in ${streak.milestone_days} days in a row to earn ${streak.reward_points} reward points${streak.streak > 0 && streak.streak % streak.milestone_days === 0 ? ' - earned today!' : '.'}`
            : `${streak.streak}-day streak (best ${streak.longest}). Open the app every day to keep it going.`}
      </p>
    </>
  );
}
