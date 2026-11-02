/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WorldDefinition } from './types';
import { sunnyCountrysideWorld } from './sunnyCountryside';
import { candylandToylandWorld } from './candylandToyland';
import { dinoSafariWorld } from './dinoSafari';
import { cosmicSkyCityWorld } from './cosmicSkyCity';

export * from './types';
export { sunnyCountrysideWorld } from './sunnyCountryside';
export { candylandToylandWorld } from './candylandToyland';
export { dinoSafariWorld } from './dinoSafari';
export { cosmicSkyCityWorld } from './cosmicSkyCity';

export const BUILTIN_WORLDS: WorldDefinition[] = [
  sunnyCountrysideWorld,
  candylandToylandWorld,
  dinoSafariWorld,
  cosmicSkyCityWorld,
];

// Active registry of worlds (built-in + any user-created worlds)
export const WORLDS_REGISTRY = new Map<string, WorldDefinition>(
  BUILTIN_WORLDS.map((w) => [w.id, w])
);

export function getWorldById(id: string): WorldDefinition {
  return WORLDS_REGISTRY.get(id) || sunnyCountrysideWorld;
}

export function registerCustomWorld(world: WorldDefinition): void {
  WORLDS_REGISTRY.set(world.id, world);
}

export function getAllAvailableWorldIds(): string[] {
  return Array.from(WORLDS_REGISTRY.keys());
}

/**
 * AI World Generator Prompt Template:
 * Parents can copy this prompt into Gemini / Claude / ChatGPT to generate brand new worlds
 * that match the exact WorldDefinition schema!
 */
export function getAiWorldPrompt(themeIdea = 'Underwater Coral Kingdom or Pirate Cove'): string {
  return `Create a new 3D world definition for the Toddler Motion Drive WebGL game written in TypeScript using Three.js.

The world should be themed around: "${themeIdea}".

Follow this exact TypeScript structure:

\`\`\`typescript
import * as THREE from 'three';
import { WorldDefinition } from './types';

// Declare reusable MeshStandardMaterials here
const groundMat = new THREE.MeshStandardMaterial({ color: 0x..., roughness: 0.8 });
const roadMat = new THREE.MeshStandardMaterial({ color: 0x..., roughness: 0.9 });
// ...other materials

export const myCustomWorld: WorldDefinition = {
  id: 'my_custom_world',
  name: 'World Name',
  subtitle: 'Short playful subtitle for toddlers',
  skyColor: 0x...,
  fogColor: 0x...,
  groundColor: 0x...,
  roadColor: 0x...,
  ambientLightColor: 0xffffff,
  sunLightColor: 0xfffbeb,
  particleType: 'blossoms', // 'blossoms' | 'sprinkles' | 'embers' | 'stars'
  particleColor: 0x...,

  spawnChunkObjects: (
    chunk,
    cx,
    cz,
    originX,
    originZ,
    chunkSize,
    density,
    rand,
    registerCollidable,
    availableWorldIds
  ) => {
    // 1. Landmark structures (Drive-through arches, towers, castles)
    // 2. Turbo Boost Chevrons on Road (type: 'boost_pad')
    // 3. Super Bounce Jump Springs / Trampolines (type: 'jump_pad')
    // 4. Musical Melody Coins (type: 'coin', extraData: { noteIndex: 0..7 })
    // 5. Surprise Mystery Gift Boxes (type: 'mystery_box')
    // 6. Interactive Creatures / Animals (type: 'creature', extraData: { sound: 'moo' | 'squawk' | 'dino_roar' | 'ufo' })
    // 7. Air Hoops / Star Rings (type: 'star_ring', isAirObject: true)
    // 8. Random Stargate Warp Portal (type: 'portal', portalTargetWorldId)
  },

  // Optional live animation tick per chunk:
  tickChunk: (chunk, delta, elapsed, carPos) => {
    // animate windmills, creature heads, beacons, or tractor beams
  }
};
\`\`\`

Rules:
- High contrast, vibrant toddler-friendly cartoon palette.
- Use clean low-poly Three.js primitives (BoxGeometry, CylinderGeometry, ConeGeometry, SphereGeometry, TorusGeometry).
- Keep geometries shared or lightweight.
- Collidables must call \`registerCollidable(id, type, pos, radius, mesh, severity, isAirObject, portalTargetWorldId?, extraData?)\`.
- For random portals, pick a target from \`availableWorldIds\`.`;
}
