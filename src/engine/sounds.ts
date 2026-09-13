// ============================================================
// OVERRUN — Sound Engine (Web Audio API)
// Generates procedural UI sounds without external audio files.
// ============================================================

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.15
) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Audio not available — silent fallback
  }
}

/** Satisfying click sound — short, crisp */
export function playClick() {
  playTone(800, 0.08, 'sine', 0.12);
  setTimeout(() => playTone(1200, 0.06, 'sine', 0.08), 30);
}

/** Buzz sound — for overtime/warnings */
export function playBuzz() {
  playTone(200, 0.15, 'sawtooth', 0.1);
  setTimeout(() => playTone(150, 0.2, 'sawtooth', 0.08), 80);
}

/** XP shimmer — ascending sparkle */
export function playShimmer() {
  playTone(523, 0.1, 'sine', 0.1);
  setTimeout(() => playTone(659, 0.1, 'sine', 0.1), 60);
  setTimeout(() => playTone(784, 0.12, 'sine', 0.08), 120);
  setTimeout(() => playTone(1047, 0.2, 'sine', 0.06), 180);
}

/** Error sound — low thud */
export function playError() {
  playTone(150, 0.2, 'square', 0.08);
  setTimeout(() => playTone(120, 0.25, 'square', 0.06), 100);
}

/** Soft pop for modal open/close */
export function playPop() {
  playTone(600, 0.06, 'sine', 0.1);
}

/** Typewriter tick */
export function playTick() {
  playTone(400 + Math.random() * 200, 0.03, 'square', 0.04);
}
