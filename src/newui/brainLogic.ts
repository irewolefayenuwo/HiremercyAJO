import type { BrainAnswer, BrainPayload, BrainQuestion } from './gameApi';

// The screen is driven by this small state machine. The SERVER decides every outcome (correct, score, reward);
// this file only turns the server's answers into what the player sees.
export type Phase = 'loading' | 'asking' | 'submitting' | 'correct' | 'wrong' | 'won' | 'failed' | 'error';

export interface BrainState {
  phase: Phase;
  sessionId: string | null;
  index: number; total: number; score: number;
  question: BrainQuestion | null;
  timerSeconds: number; secondsLeft: number;
  picked: number | null; correctIndex: number | null; explanation: string | null;
  timedOut: boolean;
  result: BrainAnswer | null;      // set once the round is over
  pendingNext: BrainPayload | null; // the next question, shown only after the player taps Next
  error: string | null;
}

export const initialBrain: BrainState = {
  phase: 'loading', sessionId: null, index: 0, total: 6, score: 0, question: null, timerSeconds: 15, secondsLeft: 15,
  picked: null, correctIndex: null, explanation: null, timedOut: false, result: null, pendingNext: null, error: null
};

export type BrainAction =
  | { type: 'started'; payload: BrainPayload }
  | { type: 'error'; message: string }
  | { type: 'tick' }
  | { type: 'submit'; choice: number | null }
  | { type: 'answered'; answer: BrainAnswer; choice: number | null }
  | { type: 'submitFailed'; message: string }
  | { type: 'advance' };

function showQuestion(s: BrainState, p: BrainPayload): BrainState {
  if (p.finished || !p.question) {
    // a finished round was returned (for example after a repeated request): show the saved result, never charge or reward again
    return { ...s, phase: p.status === 'won' ? 'won' : 'failed', score: p.score, total: p.total, result: { finished: true, score: p.score, total: p.total, reward: p.reward, won: p.status === 'won', status: p.status }, error: null };
  }
  return {
    ...s, phase: 'asking', sessionId: p.session_id ?? s.sessionId, index: p.index ?? 0, total: p.total, score: p.score, question: p.question,
    timerSeconds: p.timer_seconds ?? s.timerSeconds, secondsLeft: p.seconds_left ?? p.timer_seconds ?? s.timerSeconds,
    picked: null, correctIndex: null, explanation: null, timedOut: false, pendingNext: null, error: null
  };
}

export function brainReducer(s: BrainState, a: BrainAction): BrainState {
  switch (a.type) {
    case 'started': return showQuestion(s, a.payload);
    case 'error': return { ...s, phase: 'error', error: a.message };
    case 'tick': return s.phase === 'asking' && s.secondsLeft > 0 ? { ...s, secondsLeft: s.secondsLeft - 1 } : s;
    // Sending is allowed from 'asking', or from 'error' when a round exists (a safe re-send of the SAME question number).
    case 'submit': return s.phase === 'asking' || (s.phase === 'error' && s.sessionId) ? { ...s, phase: 'submitting', picked: a.choice, error: null } : s;
    // A failed send goes back to the question only while time is left, so an expired timer can never loop.
    case 'submitFailed': return s.phase === 'submitting' ? { ...s, phase: s.secondsLeft > 0 ? 'asking' : 'error', picked: s.secondsLeft > 0 ? null : s.picked, error: a.message } : s;
    case 'answered': {
      if (s.phase !== 'submitting') return s;
      const r = a.answer;
      if (r.stale && r.next) return showQuestion({ ...s, phase: 'asking' }, r.next);   // an old repeated request: carry on from the server's question
      if (r.replay) return { ...s, phase: r.status === 'won' ? 'won' : 'failed', result: r, score: r.score, total: r.total };
      if (r.correct) {
        return { ...s, phase: 'correct', score: r.score, total: r.total, correctIndex: r.correct_index ?? null, explanation: r.explanation ?? null,
          result: r.finished ? r : null, pendingNext: r.finished ? null : r.next ?? null, error: null };
      }
      return { ...s, phase: 'wrong', score: r.score, total: r.total, correctIndex: r.correct_index ?? null, explanation: r.explanation ?? null,
        timedOut: !!r.timed_out, result: r, error: null };
    }
    case 'advance': {
      if (s.phase === 'correct') {
        if (s.result?.finished) return { ...s, phase: s.result.won ? 'won' : 'failed' };
        return s.pendingNext ? showQuestion(s, s.pendingNext) : s;
      }
      if (s.phase === 'wrong') return { ...s, phase: 'failed' };
      return s;
    }
    default: return s;
  }
}

/** Where the character should be on the rope. */
export function climberMode(s: BrainState): 'idle' | 'up' | 'fall' | 'dance' {
  if (s.phase === 'wrong' || s.phase === 'failed') return 'fall';
  if (s.phase === 'won' || (s.phase === 'correct' && s.result?.won)) return 'dance';
  if (s.phase === 'correct') return 'up';
  return 'idle';
}
