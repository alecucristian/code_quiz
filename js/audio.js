/**
 * ArcadeAudio: Pure Web Audio API 8-Bit Retro Chiptune Synthesizer
 * Zero external audio files, authentic 1980s PSG (Programmable Sound Generator) waveforms.
 */
export class ArcadeAudio {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.masterGain = null;
    this.sfxGain = null;
    this.bgmGain = null;

    // Music sequencer state
    this.bgmPlaying = false;
    this.bgmStep = 0;
    this.bgmTimer = null;

    // Load saved mute preference
    const saved = localStorage.getItem('code_quiz_audio_muted');
    this.isMuted = saved === 'true';
  }

  /**
   * Initialize AudioContext upon user gesture
   */
  initContext() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      this.ctx = new AudioContextClass();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // SFX Gain
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // BGM Gain
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      this.bgmGain.connect(this.masterGain);
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Toggle Mute State
   */
  toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem('code_quiz_audio_muted', this.isMuted ? 'true' : 'false');

    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, now);
    }

    return !this.isMuted;
  }

  // =========================================================================
  // RETRO SOUND EFFECTS (SFX)
  // =========================================================================

  /**
   * UI Click / Selection Blip
   */
  playBlip() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  /**
   * Option Selection Keypress
   */
  playOptionSelect() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.07); // E5

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.07);
  }

  /**
   * Correct Answer Arcade Arpeggio (Coin Pickup Chime)
   */
  playCorrect() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const stepDuration = 0.055;

    notes.forEach((freq, idx) => {
      const startTime = now + idx * stepDuration;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.22, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(startTime);
      osc.stop(startTime + 0.12);
    });
  }

  /**
   * Incorrect Answer Arcade Buzzer (Descending Sawtooth Thud)
   */
  playWrong() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.35);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  /**
   * Combo Multiplier Rising Chime
   */
  playCombo(streak = 2) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const baseFreq = 400 + Math.min(streak * 100, 600);
    const now = this.ctx.currentTime;

    [0, 0.07, 0.14].forEach((offset, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(baseFreq * (1 + i * 0.25), now + offset);

      gain.gain.setValueAtTime(0.18, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.15);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + offset);
      osc.stop(now + offset + 0.15);
    });
  }

  /**
   * Mission Accomplished / Victory Fanfare
   */
  playVictory() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    this.stopBgm();

    const now = this.ctx.currentTime;
    // C5, E5, G5, C6, G5, C6 (extended high note)
    const melody = [
      { f: 523.25, d: 0.12 },
      { f: 659.25, d: 0.12 },
      { f: 783.99, d: 0.12 },
      { f: 1046.50, d: 0.20 },
      { f: 783.99, d: 0.14 },
      { f: 1046.50, d: 0.50 }
    ];

    let t = now;
    melody.forEach(note => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(note.f, t);

      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + note.d);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + note.d);
      t += note.d + 0.02;
    });
  }

  /**
   * Game Over Sad Slide Fanfare
   */
  playGameOver() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    this.stopBgm();

    const now = this.ctx.currentTime;
    const notes = [
      { f: 392.00, d: 0.2 }, // G4
      { f: 370.00, d: 0.2 }, // F#4
      { f: 349.23, d: 0.2 }, // F4
      { f: 329.63, d: 0.45 } // E4 (slurred down to C4)
    ];

    let t = now;
    notes.forEach((note, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(note.f, t);
      if (idx === notes.length - 1) {
        osc.frequency.exponentialRampToValueAtTime(220, t + note.d);
      }

      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + note.d);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + note.d);
      t += note.d + 0.03;
    });
  }

  // =========================================================================
  // RETRO 8-BIT BACKGROUND MUSIC (BGM CHIPTUNE SEQUENCER)
  // =========================================================================

  /**
   * Start 8-bit Retro Arcade Background Music Loop
   */
  startBgm() {
    if (this.bgmPlaying) return;
    this.initContext();
    if (!this.ctx) return;

    this.bgmPlaying = true;
    this.bgmStep = 0;

    // Classic 16-step retro arcade walking bass & melody loop
    // Key: A minor / D minor arcade groove (128 BPM = ~117ms per 16th note)
    const stepTimeMs = 125;

    // Bass frequencies (A minor / C / D / E)
    const bassNotes = [
      110.00, 110.00, 130.81, 146.83, // A2, A2, C3, D3
      164.81, 146.83, 130.81, 110.00, // E3, D3, C3, A2
      110.00, 164.81, 196.00, 164.81, // A2, E3, G3, E3
      146.83, 130.81, 123.47, 110.00  // D3, C3, B2, A2
    ];

    // Lead melodic accents (sparse 8-bit arcade bleeps)
    const leadNotes = [
      440.00, null, 523.25, null,
      null, 587.33, null, 440.00,
      659.25, null, 587.33, null,
      523.25, null, 493.88, null
    ];

    const playStep = () => {
      if (!this.bgmPlaying || !this.ctx || this.isMuted) {
        this.bgmStep = (this.bgmStep + 1) % 16;
        return;
      }

      const now = this.ctx.currentTime;
      const step = this.bgmStep;

      // Play Bass note (triangle wave with punchy envelope)
      const bFreq = bassNotes[step];
      if (bFreq) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(bFreq, now);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

        osc.connect(gain);
        gain.connect(this.bgmGain);

        osc.start(now);
        osc.stop(now + 0.11);
      }

      // Play Lead note (square wave retro melody pulse)
      const lFreq = leadNotes[step];
      if (lFreq) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(lFreq, now);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(this.bgmGain);

        osc.start(now);
        osc.stop(now + 0.08);
      }

      this.bgmStep = (this.bgmStep + 1) % 16;
    };

    this.bgmTimer = setInterval(playStep, stepTimeMs);
  }

  /**
   * Stop Background Music Loop
   */
  stopBgm() {
    this.bgmPlaying = false;
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}
