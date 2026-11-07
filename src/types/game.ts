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
  | { type: 'GAME_STATE'; x: number; y: number; z: number; yaw: number; speed: number; worldId: string; vehicleId?: string; powerUp?: string; pitch?: number; roll?: number; isFlipped?: boolean }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<ParentSettings> }
  | { type: 'TRIGGER_ON_DEMAND'; action: 'spawn_landed_plane' | 'spawn_mega_ramp' | 'spawn_train_crossing' | 'spawn_traffic_rush' | 'spawn_red_chasers' | 'spawn_star_shower' | 'spawn_mushrooms' | 'pop_word' | 'spawn_challenge'; word?: string; vehicleId?: string; challengeId?: string; promptText?: string }
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
  activeVehicleIds: string[];  // Available vehicles
  autoCruise: boolean;         // Constant stable speed so kid doesn't have to press phone
  cruiseSpeed: number;         // Stable cruise speed (4 - 20 m/s)
  drivingMode: 'autoCruise' | 'phonePush'; // Auto-cruise vs physically pushing phone forward/back
  vehicleHitActions: Record<string, 'swap' | 'destroy'>; // Whether hitting a vehicle drives it or destroys it
  enabledModules: string[];    // Enabled dynamic world modules & events
  enabledMiniGames: string[];  // Active mini-games: 'paint_trail', 'red_chasers', 'star_blaster'
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
  activeVehicleIds: [
    'roadster',
    'steam_train',
    'biplane',
    'digger',
    'fire_truck',
    'police_cruiser',
    'ice_cream_van',
    'monster_truck',
  ],
  autoCruise: true,
  cruiseSpeed: 10,
  drivingMode: 'autoCruise',
  vehicleHitActions: {
    roadster: 'swap',
    steam_train: 'swap',
    biplane: 'swap',
    digger: 'swap',
    fire_truck: 'swap',
    police_cruiser: 'swap',
    ice_cream_van: 'swap',
    monster_truck: 'swap',
  },
  enabledModules: ['traffic_cars', 'train_railway', 'dense_forest', 'stunt_ramps', 'balloon_parade', 'airport_runway'],
  enabledMiniGames: ['paint_trail', 'red_chasers', 'star_blaster'],
};
