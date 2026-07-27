// Tiny synthesized sound effects for gameplay (no audio assets to ship/license).
// All tones are short, low-volume beeps built from oscillators + a gain envelope.

const MUTE_KEY = "exams_sound_muted";

let audioCtx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) {
    audioCtx = new Ctor();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isSoundMuted(): boolean {
  return localStorage.getItem(MUTE_KEY) === "1";
}

export function setSoundMuted(muted: boolean): void {
  localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
}

// Warms up / unlocks the AudioContext on the first real user gesture on the
// page, since browsers block autoplay until then.
export function unlockAudio(): void {
  getContext();
}

function tone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  type: OscillatorType,
  peakGain: number,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(ctx.destination);

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

function play(fn: (ctx: AudioContext, now: number) => void): void {
  if (isSoundMuted()) return;
  const ctx = getContext();
  if (!ctx) return;
  fn(ctx, ctx.currentTime);
}

export function playTick(): void {
  play((ctx, now) => tone(ctx, 1000, now, 0.05, "square", 0.05));
}

export function playTimeout(): void {
  play((ctx, now) => {
    tone(ctx, 500, now, 0.15, "triangle", 0.08);
    tone(ctx, 300, now + 0.12, 0.18, "triangle", 0.08);
  });
}

export function playCorrect(): void {
  play((ctx, now) => {
    tone(ctx, 523.25, now, 0.12, "sine", 0.07); // C5
    tone(ctx, 659.25, now + 0.09, 0.12, "sine", 0.07); // E5
    tone(ctx, 783.99, now + 0.18, 0.18, "sine", 0.07); // G5
  });
}

export function playIncorrect(): void {
  play((ctx, now) => {
    tone(ctx, 220, now, 0.18, "sawtooth", 0.06);
    tone(ctx, 180, now + 0.1, 0.2, "sawtooth", 0.06);
  });
}

// Podium reveal — pitch rises with the medal (bronze < silver < gold), a
// short two-note "ding" for each.
export function playMedalReveal(rank: 1 | 2 | 3): void {
  const base = { 3: 440, 2: 554.37, 1: 698.46 }[rank]; // A4, C#5, F5
  play((ctx, now) => {
    tone(ctx, base, now, 0.15, "sine", 0.08);
    tone(ctx, base * 1.5, now + 0.1, 0.25, "sine", 0.08);
  });
}

export function playFanfare(): void {
  play((ctx, now) => {
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    notes.forEach((freq, i) => tone(ctx, freq, now + i * 0.12, 0.3, "triangle", 0.08));
  });
}
