/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { CollisionSeverity } from '../types/game';
import { InteractiveObjectType } from '../worlds/types';

export interface CollidableRegistrationFn {
  (
    id: string,
    type: InteractiveObjectType,
    pos: THREE.Vector3,
    radius: number,
    mesh: THREE.Object3D,
    severity: CollisionSeverity,
    isAirObject: boolean,
    portalTargetWorldId?: string,
    extraData?: { noteIndex?: number; powerUp?: string; sound?: string; speed?: number; lane?: number }
  ): void;
}

export interface WorldModule {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  icon: string;
  category: 'traffic' | 'railway' | 'nature' | 'stunts' | 'carnival';
  defaultEnabled: boolean;
  aiPromptIdea: string;
  spawnChunk: (
    chunk: THREE.Group,
    cx: number,
    cz: number,
    originX: number,
    originZ: number,
    chunkSize: number,
    density: number,
    rand: (offset: number) => number,
    registerCollidable: CollidableRegistrationFn
  ) => void;
  tickModule?: (
    delta: number,
    elapsed: number,
    carPos: THREE.Vector3,
    chunk: THREE.Group
  ) => void;
}
