export type SoundKind =
  | 'move'
  | 'capture'
  | 'check'
  | 'castle'
  | 'promote'
  | 'gameEnd'
  | 'success'
  | 'error'
  | 'click';

interface Note {
  frequency: number;
  duration: number;
  delay?: number;
  type?: OscillatorType;
  gain?: number;
}

const SOUNDS: Record<SoundKind, Note[]> = {
  move: [{ frequency: 330, duration: 0.09, type: 'sine', gain: 0.5 }],
  capture: [
    { frequency: 280, duration: 0.08, type: 'triangle', gain: 0.55 },
    { frequency: 190, duration: 0.1, delay: 0.04, type: 'triangle', gain: 0.4 },
  ],
  check: [
    { frequency: 660, duration: 0.1, type: 'square', gain: 0.35 },
    { frequency: 880, duration: 0.12, delay: 0.09, type: 'square', gain: 0.25 },
  ],
  castle: [
    { frequency: 260, duration: 0.08, type: 'sine', gain: 0.45 },
    { frequency: 390, duration: 0.11, delay: 0.09, type: 'sine', gain: 0.4 },
  ],
  promote: [
    { frequency: 523, duration: 0.11, type: 'triangle', gain: 0.4 },
    { frequency: 659, duration: 0.11, delay: 0.09, type: 'triangle', gain: 0.4 },
    { frequency: 784, duration: 0.16, delay: 0.18, type: 'triangle', gain: 0.4 },
  ],
  gameEnd: [
    { frequency: 392, duration: 0.16, type: 'triangle', gain: 0.4 },
    { frequency: 523, duration: 0.16, delay: 0.14, type: 'triangle', gain: 0.4 },
    { frequency: 659, duration: 0.24, delay: 0.28, type: 'triangle', gain: 0.4 },
  ],
  success: [
    { frequency: 523, duration: 0.1, type: 'sine', gain: 0.4 },
    { frequency: 784, duration: 0.14, delay: 0.09, type: 'sine', gain: 0.35 },
  ],
  error: [
    { frequency: 180, duration: 0.13, type: 'sawtooth', gain: 0.28 },
    { frequency: 130, duration: 0.16, delay: 0.08, type: 'sawtooth', gain: 0.25 },
  ],
  click: [{ frequency: 520, duration: 0.045, type: 'sine', gain: 0.25 }],
};

/**
 * Tiny Web Audio sound engine. All effects are synthesized locally, so no
 * audio files or network requests are required.
 */
class SoundService {
  private context: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (this.context) return this.context;
    const AudioContextClass =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;
    this.context = new AudioContextClass();
    return this.context;
  }

  async unlock() {
    const context = this.getContext();
    if (context?.state === 'suspended') {
      try {
        await context.resume();
      } catch {
        // Autoplay policy may still block audio; continue silently.
      }
    }
  }

  play(kind: SoundKind, enabled: boolean, volume: number) {
    if (!enabled || volume <= 0) return;
    const context = this.getContext();
    if (!context) return;
    if (context.state === 'suspended') void context.resume();

    const now = context.currentTime;
    for (const note of SOUNDS[kind]) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = now + (note.delay ?? 0);
      const end = start + note.duration;
      const peak = Math.max(0.001, (note.gain ?? 0.4) * volume * 0.16);

      oscillator.type = note.type ?? 'sine';
      oscillator.frequency.setValueAtTime(note.frequency, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, end);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(end + 0.02);
    }
  }

  dispose() {
    void this.context?.close();
    this.context = null;
  }
}

export const soundService = new SoundService();
