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
  private baseFrequency = 55; // Deep cartoon idle rumble

  public init(volume = 0.8): void {
    if (this.ctx) return;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    } catch (err) {
      console.warn('AudioContext failed to initialize:', err);
    }
  }

  public async resume(): Promise<void> {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  public setVolume(volume: number): void {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1, volume)), this.ctx.currentTime, 0.05);
    }
  }

  /**
   * Start dynamic continuous engine sound
   */
  public startEngine(): void {
    if (!this.ctx || !this.masterGain || this.isEngineRunning) return;

    try {
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

      // Low rumble sawtooth
      this.engineOsc1 = this.ctx.createOscillator();
      this.engineOsc1.type = 'sawtooth';
      this.engineOsc1.frequency.setValueAtTime(this.baseFrequency, this.ctx.currentTime);

      // Harmonious sub-octave triangle
      this.engineOsc2 = this.ctx.createOscillator();
      this.engineOsc2.type = 'triangle';
      this.engineOsc2.frequency.setValueAtTime(this.baseFrequency * 1.5, this.ctx.currentTime);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(260, this.ctx.currentTime);

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
   * Modulate engine pitch with push/pull speed (0.0 idle to 2.0+ top speed)
   */
  public updateEngineSpeed(speedRatio: number): void {
    if (!this.ctx || !this.isEngineRunning || !this.engineOsc1 || !this.engineOsc2) return;

    const clampedRatio = Math.max(0, Math.min(3, speedRatio));
    const targetFreq = this.baseFrequency + clampedRatio * 60; // 55Hz to 235Hz cartoon rev

    this.engineOsc1.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.08);
    this.engineOsc2.frequency.setTargetAtTime(targetFreq * 1.5, this.ctx.currentTime, 0.08);

    if (this.engineGain) {
      const volumeBoost = 0.12 + clampedRatio * 0.08;
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
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(540, now + 0.35);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.4);
    } catch {
      // Ignore audio error
    }
  }

  /**
   * Cartoon collision crash / bounce sound
   */
  public playCrash(severity: CollisionSeverity): void {
    if (!this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      const duration = severity === 'major' ? 0.45 : 0.25;

      // Noise buffer for impact crunch
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(severity === 'major' ? 320 : 640, now);
      filter.Q.setValueAtTime(3.0, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(severity === 'major' ? 0.4 : 0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      whiteNoise.start(now);

      // Low cartoon pop underneath
      const popOsc = this.ctx.createOscillator();
      const popGain = this.ctx.createGain();
      popOsc.type = 'triangle';
      popOsc.frequency.setValueAtTime(severity === 'major' ? 120 : 180, now);
      popOsc.frequency.exponentialRampToValueAtTime(40, now + duration);

      popGain.gain.setValueAtTime(0.35, now);
      popGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      popOsc.connect(popGain);
      popGain.connect(this.masterGain);

      popOsc.start(now);
      popOsc.stop(now + duration);
    } catch {
      // Ignore audio error
    }
  }

  /**
   * Upward melodic chime when vehicle is swapped
   */
  public playVehicleSwap(): void {
    if (!this.ctx || !this.masterGain) return;

    try {
      const notes = [330, 440, 554, 659]; // E4, A4, C#5, E5
      const now = this.ctx.currentTime;

      notes.forEach((freq, idx) => {
        if (!this.ctx || !this.masterGain) return;
        const noteTime = now + idx * 0.05;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0.2, noteTime);
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

  public stopEngine(): void {
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

// Singleton instances for mobile and desktop
export const mobileAudio = new AudioService();
export const desktopAudio = new AudioService();
