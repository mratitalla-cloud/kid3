/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { CollisionSeverity } from '../types/game';

export interface CollidableRegisterFn {
  (
    id: string,
    type: 'barn' | 'windmill' | 'fence' | 'hay' | 'tree' | 'cow' | 'star_ring' | 'rainbow_cloud' | 'balloon' | 'candy' | 'dino' | 'crystal' | 'portal',
    pos: THREE.Vector3,
    radius: number,
    mesh: THREE.Object3D,
    severity: CollisionSeverity,
    isAirObject: boolean,
    portalTargetWorldId?: string
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
}
