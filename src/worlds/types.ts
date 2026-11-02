/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { CollisionSeverity } from '../types/game';

export type InteractiveObjectType =
  | 'barn'
  | 'windmill'
  | 'fence'
  | 'hay'
  | 'tree'
  | 'cow'
  | 'chicken'
  | 'star_ring'
  | 'rainbow_cloud'
  | 'balloon'
  | 'candy'
  | 'dino'
  | 'crystal'
  | 'portal'
  | 'boost_pad'
  | 'jump_pad'
  | 'coin'
  | 'mystery_box'
  | 'creature';

export interface CollidableRegisterFn {
  (
    id: string,
    type: InteractiveObjectType,
    pos: THREE.Vector3,
    radius: number,
    mesh: THREE.Object3D,
    severity: CollisionSeverity,
    isAirObject: boolean,
    portalTargetWorldId?: string,
    extraData?: { noteIndex?: number; powerUp?: string; sound?: string }
  ): void;
}

export interface WorldDefinition {
  id: string;
  name: string;
  subtitle: string;
  skyColor: number;
  fogColor: number;
  groundColor: number;
  roadColor: number;
  ambientLightColor: number;
  sunLightColor: number;
  particleType?: 'blossoms' | 'sprinkles' | 'embers' | 'stars';
  particleColor?: number;
  spawnChunkObjects: (
    chunk: THREE.Group,
    cx: number,
    cz: number,
    originX: number,
    originZ: number,
    chunkSize: number,
    density: number,
    rand: (offset: number) => number,
    registerCollidable: CollidableRegisterFn,
    availableWorldIds: string[]
  ) => void;
  tickChunk?: (chunk: THREE.Group, delta: number, elapsed: number, carPos: THREE.Vector3) => void;
}
