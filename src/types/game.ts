/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MotionPacket {
  alpha: number;      // Gyro compass / yaw (0 - 360)
  beta: number;       // Front-to-back tilt (-180 to 180)
  gamma: number;      // Left-to-right tilt (-90 to 90)
  accelX: number;     // Linear acceleration X (m/s^2)
  accelY: number;     // Linear acceleration Y (forward/backward push)
  accelZ: number;     // Linear acceleration Z (vertical lift for jump)
  throttle?: number;  // Direct gas / push input (-1.0 to 1.0)
  isDriving?: boolean;
  timestamp: number;
}

export type CollisionSeverity = 'minor' | 'major' | 'landing' | 'flip';

export type GameEvent =
  | { type: 'MOTION'; data: MotionPacket }
  | { type: 'SWAP_VEHICLE'; vehicleId: string }
  | { type: 'COLLISION_TRIGGER'; severity: CollisionSeverity; isAirItem?: boolean }
  | { type: 'DESTRUCTION_EVENT'; objType: string; pos: { x: number; y: number; z: number }; severity: CollisionSeverity }
  | { type: 'INTERACTIVE_TRIGGER'; action: 'boost' | 'spring' | 'coin' | 'mystery' | 'creature'; noteIndex?: number; powerUp?: string }
  | { type: 'CALIBRATE_BASELINE'; baselineAlpha: number }
  | { type: 'FORCE_REQUEST_PERMISSIONS' }
  | { type: 'RESET_SPAWN' }
  | { type: 'WORLD_WARP'; worldId: string }
  | { type: 'GAME_STATE'; x: number; y: number; z: number; yaw: number; speed: number; worldId: string; powerUp?: string }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<ParentSettings> }
  | { type: 'PING'; timestamp: number }
  | { type: 'PONG'; timestamp: number };

export interface VehicleDefinition {
  id: string;
  name: string;
  subtitle: string;
  type: 'ground' | 'air';
  baseSpeed: number;
  primaryColor: string;
  accentColor: string;
  custom?: boolean;
}

export interface ParentSettings {
  deadzoneAngle: number;       // 0 - 15 degrees
  sensitivity: number;         // 0.5 - 2.5 multiplier
  cameraMode: 'overhead' | 'chase';
  groundDensity: number;       // 0.5 - 2.0
  skyDensity: number;          // 0.5 - 2.0
  theme: 'day' | 'sunset' | 'night';
  phoneVolume: number;         // 0.0 - 1.0
  desktopVolume: number;       // 0.0 - 1.0
  hapticEnabled: boolean;
  hapticIntensity: number;     // 0.5 - 1.5
  baselineAlpha: number;       // Zero orientation angle
  activeVehicleIds: string[];  // Which vehicles appear in mobile swipe
  autoCruise: boolean;         // Constant stable speed so kid doesn't have to press phone
  cruiseSpeed: number;         // Stable cruise speed (4 - 20 m/s)
  enabledModules: string[];    // Enabled dynamic world modules & events
}

export const DEFAULT_PARENT_SETTINGS: ParentSettings = {
  deadzoneAngle: 5,
  sensitivity: 1.2,
  cameraMode: 'overhead',
  groundDensity: 1.0,
  skyDensity: 1.0,
  theme: 'day',
  phoneVolume: 0.8,
  desktopVolume: 0.7,
  hapticEnabled: true,
  hapticIntensity: 1.0,
  baselineAlpha: 0,
  activeVehicleIds: ['roadster', 'steam_train', 'biplane', 'digger'],
  autoCruise: true,
  cruiseSpeed: 10,
  enabledModules: ['traffic_cars', 'train_railway', 'dense_forest', 'stunt_ramps', 'balloon_parade'],
};
