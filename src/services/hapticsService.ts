/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CollisionSeverity } from '../types/game';

export class HapticsService {
  private static isSupported = typeof window !== 'undefined' && 'vibrate' in navigator;

  public static trigger(severity: CollisionSeverity, enabled = true, intensity = 1.0): void {
    if (!enabled || !this.isSupported) return;

    try {
      const scale = (val: number) => Math.max(10, Math.round(val * intensity));

      switch (severity) {
        case 'minor':
          navigator.vibrate(scale(40));
          break;
        case 'major':
          navigator.vibrate([scale(60), 30, scale(80)]);
          break;
        case 'landing':
          navigator.vibrate(scale(70));
          break;
        case 'flip':
          navigator.vibrate([scale(100), 50, scale(100), 50]);
          break;
      }
    } catch {
      // Ignore vibration error on unsupported or blocked browser contexts
    }
  }
}
