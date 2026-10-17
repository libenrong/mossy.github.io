/**
 * Small Web Audio sound kit. No audio files, no network requests.
 * The context is created lazily after a user gesture so browsers stay happy.
 */

export class SoundKit {
  constructor({ muted = false } = {}) {
    this.muted = muted;
    this.context = null;
    this.lastTick = 0;
  }

  setMuted(value) {
    this.muted = Boolean(value);
  }

  ensureContext() {
    if (this.muted) return null;
    if (!this.context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      try {
        this.context = new AudioContextClass();
      } catch {
        return null;
      }
    }
    if (this.context.state === 'suspended') {
      this.context.resume().catch(() => {});
    }
    return this.context;
  }

  tone({ frequency = 440, duration = 0.08, type = 'sine', volume = 0.035, slide = 0, delay = 0 }) {
    const context = this.ensureContext();
    if (!context) return;
    const now = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    if (slide) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, frequency + slide), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.03);
  }

  click() {
    this.tone({ frequency: 620, duration: 0.035, type: 'square', volume: 0.014 });
  }

  tick(urgent = false) {
    const now = performance.now();
    if (now - this.lastTick < 300) return;
    this.lastTick = now;
    this.tone({ frequency: urgent ? 980 : 720, duration: 0.03, type: 'square', volume: urgent ? 0.028 : 0.016 });
  }

  cut() {
    const context = this.ensureContext();
    if (!context) return;
    const now = context.currentTime;
    const length = Math.floor(context.sampleRate * 0.15);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
    }
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(0.055, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
    source.connect(gain).connect(context.destination);
    source.start(now);
    this.tone({ frequency: 420, duration: 0.1, type: 'triangle', volume: 0.025, slide: 520 });
  }

  wrong() {
    this.tone({ frequency: 130, duration: 0.32, type: 'sawtooth', volume: 0.045, slide: -55 });
    this.tone({ frequency: 92, duration: 0.4, type: 'square', volume: 0.018, delay: 0.08, slide: -20 });
  }

  win() {
    const notes = [392, 523.25, 659.25, 783.99];
    notes.forEach((frequency, index) => {
      this.tone({ frequency, duration: 0.28, type: 'triangle', volume: 0.032, delay: index * 0.1 });
    });
  }

  lose() {
    this.tone({ frequency: 180, duration: 0.7, type: 'sawtooth', volume: 0.04, slide: -130 });
    this.tone({ frequency: 80, duration: 0.9, type: 'sine', volume: 0.05, slide: -40, delay: 0.13 });
  }
}
