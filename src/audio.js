export class Soundscape {
  constructor() {
    this.enabled = false;
    this.context = null;
    this.timer = null;
    this.noteIndex = 0;
  }
  async toggle() {
    if (!this.context)
      this.context = new (window.AudioContext || window.webkitAudioContext)();
    await this.context.resume();
    this.enabled = !this.enabled;
    if (this.enabled) {
      this.tone(523, 0.5, 0.018, "sine");
      this.timer = setInterval(() => this.ambient(), 2800);
    } else {
      clearInterval(this.timer);
      this.timer = null;
    }
    return this.enabled;
  }
  tone(freq, duration, volume = 0.04, type = "triangle", endFreq = freq) {
    if (!this.enabled || !this.context) return;
    const c = this.context;
    const oscillator = c.createOscillator(),
      gain = c.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, c.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(1, endFreq),
      c.currentTime + duration,
    );
    gain.gain.setValueAtTime(0, c.currentTime);
    gain.gain.linearRampToValueAtTime(volume, c.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(c.destination);
    oscillator.start();
    oscillator.stop(c.currentTime + duration + 0.02);
  }
  ambient() {
    if (document.hidden) return;
    const notes = [392, 523.25, 587.33, 659.25, 523.25, 440, 392, 329.63];
    this.tone(notes[this.noteIndex++ % notes.length], 2.3, 0.012, "sine");
  }
  play(kind) {
    if (kind === "attack") this.tone(220, 0.12, 0.025, "triangle", 60);
    if (kind === "hit") this.tone(110, 0.15, 0.025, "square", 55);
    if (kind === "pickup") {
      this.tone(660, 0.25, 0.04);
      setTimeout(() => this.tone(880, 0.4, 0.025), 100);
    }
    if (kind === "heal") this.tone(392, 0.7, 0.025, "sine", 784);
    if (kind === "step") this.tone(90, 0.035, 0.003, "triangle", 50);
    if (kind === "quest") {
      [392, 523, 659, 784].forEach((f, i) =>
        setTimeout(() => this.tone(f, 0.55, 0.025), i * 130),
      );
    }
  }
}
