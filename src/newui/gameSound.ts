// Sound effects + music made with the browser's Web Audio API: no audio files to download or host.
// Effects default ON, music defaults OFF (never surprise anyone with sound). Choices are remembered on the device.
type Sfx = 'tap' | 'correct' | 'wrong' | 'win' | 'lose' | 'tick' | 'coin';
const K_SFX = 'hm_game_sfx';
const K_MUSIC = 'hm_game_music';
let ctx: AudioContext | null = null;
let musicTimer: ReturnType<typeof setInterval> | null = null;
let step = 0;

export function getSoundPrefs(): { sfx: boolean; music: boolean } {
  try { return { sfx: localStorage.getItem(K_SFX) !== '0', music: localStorage.getItem(K_MUSIC) === '1' }; } catch { return { sfx: true, music: false }; }
}

function audio(): AudioContext | null {
  try {
    if (!ctx) {
      const C = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => { /* needs a tap first */ });
    return ctx;
  } catch { return null; }
}

function tone(freq: number, at: number, dur: number, type: OscillatorType = 'sine', vol = 0.14) {
  const c = audio(); if (!c) return;
  const o = c.createOscillator(); const g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, at);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g); g.connect(c.destination); o.start(at); o.stop(at + dur + 0.03);
}

export function sfx(name: Sfx) {
  if (!getSoundPrefs().sfx) return;
  const c = audio(); if (!c) return;
  const t = c.currentTime;
  switch (name) {
    case 'tap': tone(520, t, 0.07, 'triangle', 0.1); break;
    case 'tick': tone(880, t, 0.05, 'square', 0.05); break;
    case 'coin': tone(988, t, 0.09, 'square', 0.08); tone(1319, t + 0.08, 0.16, 'square', 0.08); break;
    case 'correct': tone(523, t, 0.12, 'triangle'); tone(659, t + 0.11, 0.12, 'triangle'); tone(784, t + 0.22, 0.2, 'triangle'); break;
    case 'wrong': tone(300, t, 0.18, 'sawtooth', 0.1); tone(200, t + 0.16, 0.3, 'sawtooth', 0.1); break;
    case 'win': [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, t + i * 0.13, 0.22, 'triangle', 0.15)); break;
    case 'lose': [392, 330, 262].forEach((f, i) => tone(f, t + i * 0.2, 0.3, 'sine', 0.13)); break;
  }
}

const SCALE = [262, 294, 330, 392, 440, 392, 330, 294];
export function startMusic() {
  if (musicTimer) return;
  const c = audio(); if (!c) return;
  musicTimer = setInterval(() => {
    const cc = audio(); if (!cc) return;
    tone(SCALE[step % SCALE.length], cc.currentTime, 0.28, 'sine', 0.035);
    if (step % 4 === 0) tone(SCALE[step % SCALE.length] / 2, cc.currentTime, 0.5, 'triangle', 0.03);
    step += 1;
  }, 320);
}
export function stopMusic() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } }

export function setSoundPref(kind: 'sfx' | 'music', on: boolean) {
  try { localStorage.setItem(kind === 'sfx' ? K_SFX : K_MUSIC, on ? '1' : '0'); } catch { /* storage unavailable */ }
  if (kind === 'music') { if (on) startMusic(); else stopMusic(); }
}

/** Call when a game screen closes so music never keeps playing in the background. */
export function silenceAll() { stopMusic(); }
