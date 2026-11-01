/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CollisionSeverity } from '../types/game';

export class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private engineGain: GainNode | null = null;
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private isEngineRunning = false;
  private baseFrequency = 60;
  private bgmTimer: number | null = null;

  public init(volume = 0.85): void {
    if (this.ctx) return;

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    } catch (err) {
      console.warn('AudioContext failed to initialize:', err);
    }
  }

  public unlockSynchronously(): void {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      try {
        const buffer = this.ctx.createBuffer(1, 1, 22050);
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.ctx.destination);
        source.start(0);
      } catch {
        // ignore
      }
    }
  }

  public async resume(): Promise<void> {
    if (!this.ctx) this.init();
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      // Play a 1ms micro-sound to permanently unlock audio hardware in iOS/Android
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        gain.gain.value = 0.001;
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.005);
      } catch {
        // ignore
      }
    }
  }

  public setVolume(volume: number): void {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        Math.max(0, Math.min(1, volume)),
        this.ctx.currentTime,
        0.05
      );
    }
  }

  /**
   * Universal physical haptic sub-bass thump:
   * Drives the phone's physical speaker transducer at 50Hz for 60ms,
   * vibrating the phone body on ALL devices (including iPhones where navigator.vibrate is disabled).
   */
  public playHapticThud(intensity = 1.0): void {
    if (!this.ctx || !this.masterGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(52, now);
      osc.frequency.exponentialRampToValueAtTime(32, now + 0.09);

      const amp = Math.min(1.0, 0.7 * intensity);
      gain.gain.setValueAtTime(amp, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch {
      // ignore
    }
  }

  /**
   * Start dynamic continuous engine sound
   */
  public startEngine(): void {
    if (!this.ctx || !this.masterGain || this.isEngineRunning) return;

    try {
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0.18, this.ctx.currentTime);

      this.engineOsc1 = this.ctx.createOscillator();
      this.engineOsc1.type = 'sawtooth';
      this.engineOsc1.frequency.setValueAtTime(this.baseFrequency, this.ctx.currentTime);

      this.engineOsc2 = this.ctx.createOscillator();
      this.engineOsc2.type = 'triangle';
      this.engineOsc2.frequency.setValueAtTime(this.baseFrequency * 1.5, this.ctx.currentTime);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, this.ctx.currentTime);

      this.engineOsc1.connect(filter);
      this.engineOsc2.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.masterGain);

      this.engineOsc1.start();
      this.engineOsc2.start();
      this.isEngineRunning = true;
    } catch (e) {
      console.warn('Engine audio start error:', e);
    }
  }

  /**
   * Modulate engine pitch with push/pull speed
   */
  public updateEngineSpeed(speedRatio: number): void {
    if (!this.ctx || !this.isEngineRunning || !this.engineOsc1 || !this.engineOsc2) return;

    const clampedRatio = Math.max(0.2, Math.min(3.5, speedRatio));
    const targetFreq = this.baseFrequency + clampedRatio * 65;

    this.engineOsc1.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.08);
    this.engineOsc2.frequency.setTargetAtTime(targetFreq * 1.5, this.ctx.currentTime, 0.08);

    if (this.engineGain) {
      const volumeBoost = 0.15 + clampedRatio * 0.09;
      this.engineGain.gain.setTargetAtTime(volumeBoost, this.ctx.currentTime, 0.08);
    }
  }

  /**
   * Upward frequency sweep boing for jumping
   */
  public playJump(): void {
    if (!this.ctx || !this.masterGain) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.32);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.38);
    } catch {
      // Ignore
    }
  }

  /**
   * Loud cartoon collision crash / smash impact sound
   */
  public playCrash(severity: CollisionSeverity): void {
    if (!this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      const duration = severity === 'major' ? 0.5 : 0.28;

      // Noise buffer for impact crunch
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(severity === 'major' ? 360 : 720, now);
      filter.Q.setValueAtTime(2.5, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(severity === 'major' ? 0.6 : 0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      whiteNoise.start(now);

      // Low cartoon boom punch
      const popOsc = this.ctx.createOscillator();
      const popGain = this.ctx.createGain();
      popOsc.type = 'triangle';
      popOsc.frequency.setValueAtTime(severity === 'major' ? 140 : 200, now);
      popOsc.frequency.exponentialRampToValueAtTime(45, now + duration);

      popGain.gain.setValueAtTime(0.5, now);
      popGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      popOsc.connect(popGain);
      popGain.connect(this.masterGain);

      popOsc.start(now);
      popOsc.stop(now + duration);
    } catch {
      // Ignore
    }
  }

  /**
   * Star / ring collection chime in the air
   */
  public playStarCollect(): void {
    if (!this.ctx || !this.masterGain) return;
    try {
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        if (!this.ctx || !this.masterGain) return;
        const noteTime = now + idx * 0.06;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0.25, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.25);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(noteTime);
        osc.stop(noteTime + 0.28);
      });
    } catch {
      // Ignore
    }
  }

  /**
   * Upward melodic chime when vehicle is swapped
   */
  public playVehicleSwap(): void {
    if (!this.ctx || !this.masterGain) return;

    try {
      const notes = [330, 440, 554, 659];
      const now = this.ctx.currentTime;

      notes.forEach((freq, idx) => {
        if (!this.ctx || !this.masterGain) return;
        const noteTime = now + idx * 0.05;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0.25, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.18);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(noteTime);
        osc.stop(noteTime + 0.2);
      });
    } catch {
      // Ignore
    }
  }

  /**
   * Sci-fi cosmic warp whoosh when entering a world portal
   */
  public playPortalWarp(): void {
    if (!this.ctx || !this.masterGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.6);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(400, now);
      filter.frequency.exponentialRampToValueAtTime(3200, now + 0.6);
      filter.Q.value = 3.0;

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.25);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.8);
    } catch {
      // Ignore
    }
  }

  /**
   * Cheerful chime to test audio and vibration on phone
   */
  public playTestChime(): void {
    if (!this.ctx || !this.masterGain) return;
    try {
      const now = this.ctx.currentTime;
      [440, 554.37, 659.25, 880].forEach((freq, idx) => {
        if (!this.ctx || !this.masterGain) return;
        const noteTime = now + idx * 0.08;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0.3, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.35);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(noteTime);
        osc.stop(noteTime + 0.38);
      });
      this.playHapticThud(1.2);
    } catch {
      // Ignore
    }
  }

  /**
   * Cheerful background countryside arpeggio loop
   */
  public startBgm(): void {
    if (this.bgmTimer) return;
    const notes = [261.63, 329.63, 392.0, 523.25, 392.0, 329.63]; // C, E, G, C5, G, E
    let noteIdx = 0;

    this.bgmTimer = window.setInterval(() => {
      if (!this.ctx || !this.masterGain || this.ctx.state !== 'running') return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(notes[noteIdx], this.ctx.currentTime);

        gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.45);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);
        noteIdx = (noteIdx + 1) % notes.length;
      } catch {
        // ignore
      }
    }, 450);
  }

  public stopEngine(): void {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    if (!this.isEngineRunning) return;
    try {
      if (this.engineOsc1) {
        this.engineOsc1.stop();
        this.engineOsc1.disconnect();
        this.engineOsc1 = null;
      }
      if (this.engineOsc2) {
        this.engineOsc2.stop();
        this.engineOsc2.disconnect();
        this.engineOsc2 = null;
      }
      if (this.engineGain) {
        this.engineGain.disconnect();
        this.engineGain = null;
      }
      this.isEngineRunning = false;
    } catch {
      // Ignore
    }
  }
}

export const mobileAudio = new AudioService();
export const desktopAudio = new AudioService();
