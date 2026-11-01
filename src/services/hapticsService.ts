/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CollisionSeverity } from '../types/game';
import { mobileAudio } from './audioService';

export class HapticsService {
  private static isSupported = typeof window !== 'undefined' && 'vibrate' in navigator;

  public static trigger(severity: CollisionSeverity, enabled = true, intensity = 1.0): void {
    if (!enabled) return;

    // 1. Physical audio-tactile sub-bass thump (guaranteed on all phones including iPhone / iPad)
    mobileAudio.playHapticThud(intensity);

    // 2. Hardware vibration API (Android & supporting browsers)
    if (this.isSupported) {
      try {
        const scale = (val: number) => Math.max(10, Math.round(val * intensity));

        switch (severity) {
          case 'minor':
            navigator.vibrate(scale(50));
            break;
          case 'major':
            navigator.vibrate([scale(80), 40, scale(120)]);
            break;
          case 'landing':
            navigator.vibrate(scale(85));
            break;
          case 'flip':
            navigator.vibrate([scale(120), 60, scale(120), 60]);
            break;
        }
      } catch {
        // Ignore
      }
    }
  }
}
