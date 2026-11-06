/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WorldModule } from './types';
import { trafficCarsModule } from './trafficCarsModule';
import { trainRailwayModule } from './trainRailwayModule';
import { denseForestModule } from './denseForestModule';
import { stuntRampsModule } from './stuntRampsModule';
import { balloonParadeModule } from './balloonParadeModule';
import { airportRunwayModule } from './airportRunwayModule';

export * from './types';
export { trafficCarsModule } from './trafficCarsModule';
export { trainRailwayModule } from './trainRailwayModule';
export { denseForestModule } from './denseForestModule';
export { stuntRampsModule } from './stuntRampsModule';
export { balloonParadeModule } from './balloonParadeModule';
export { airportRunwayModule } from './airportRunwayModule';

export const BUILTIN_MODULES: WorldModule[] = [
  trafficCarsModule,
  trainRailwayModule,
  denseForestModule,
  stuntRampsModule,
  balloonParadeModule,
  airportRunwayModule,
];

export function getModuleById(id: string): WorldModule | undefined {
  return BUILTIN_MODULES.find((m) => m.id === id);
}

export function getAllModuleIds(): string[] {
  return BUILTIN_MODULES.map((m) => m.id);
}

export function getAiModulePrompt(customIdea = 'Dinosaur Stampede with stomping triceratops crossing'): string {
  return `Act as a senior Three.js graphics engineer. Generate a modular plug-and-play event module for the "Toddler Motion Drive" 3D WebGL game.

Theme / Module Idea: "${customIdea}"

The module must conform to this TypeScript interface:

\`\`\`typescript
import * as THREE from 'three';
import { WorldModule } from './types';

export const customEventModule: WorldModule = {
  id: 'custom_event_module',
  name: 'Name of Module',
  subtitle: 'Short playful subtitle for toddlers',
  description: 'Detailed description of dynamic elements, sounds, and destructibles',
  icon: 'Sparkles',
  category: 'nature', // 'traffic' | 'railway' | 'nature' | 'stunts' | 'carnival'
  defaultEnabled: true,
  aiPromptIdea: '${customIdea}',

  // Procedural chunk spawn callback
  spawnChunk: (chunk, cx, cz, originX, originZ, chunkSize, density, rand, registerCollidable) => {
    // 1. Procedural Three.js geometry construction using MeshStandardMaterial
    // 2. Register destructibles or interactives via:
    // registerCollidable(id, type, worldPosition, radius, meshGroup, severity, isAirObject, undefined, extraData);
  },

  // Per-frame animated physics & interactive ticks
  tickModule: (delta, elapsed, carPos, chunk) => {
    // Animate moving parts, bobbing meshes, or proximity reactions
  }
};
\`\`\`

Requirements:
- Cartoon, vibrant colors appealing to 2-5 year olds.
- Safe chunk boundaries without blocking the main road entirely.
- Destruction or bounce interaction when the kid drives into the elements.
- Return ONLY clean, production-ready TypeScript code.`;
}
