/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { WorldDefinition } from './types';

// Materials for Cosmic Sky City
const spaceGroundMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
const neonCyanRoadMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x0891b2, emissiveIntensity: 0.7, roughness: 0.2 });
const crystalTowerMat = new THREE.MeshStandardMaterial({ color: 0x818cf8, emissive: 0x4f46e5, emissiveIntensity: 0.6, roughness: 0.1, metalness: 0.8 });
const neonPinkMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0xe11d48, emissiveIntensity: 0.9, roughness: 0.2 });
const metalUfoMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.9 });
const laserFenceMat = new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x06b6d4, emissiveIntensity: 0.9, transparent: true, opacity: 0.75 });
const portalRingMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x22d3ee, emissiveIntensity: 0.9, roughness: 0.2 });
const portalVortexMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0xfb7185, emissiveIntensity: 0.8, transparent: true, opacity: 0.75 });

export const cosmicSkyCityWorld: WorldDefinition = {
  id: 'cosmic_sky_city',
  name: 'Cosmic Sky City',
  subtitle: 'Neon Spire Towers, Space Stations & Hovering UFOs',
  skyColor: 0x1e1b4b,
  fogColor: 0x312e81,
  groundColor: 0x0f172a,
  roadColor: 0x06b6d4,
  ambientLightColor: 0x818cf8,
  sunLightColor: 0x67e8f9,

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
    // 1. Glowing Crystal Space Spires
    if (rand(1) > 0.45) {
      const sX = rand(2) > 0.5 ? 14 : chunkSize - 14;
      const sZ = 15 + rand(3) * (chunkSize - 30);

      const spireGroup = new THREE.Group();
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 2.2, 9.0, 6), crystalTowerMat);
      tower.position.set(0, 4.5, 0);
      tower.castShadow = true;

      const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(1.2), neonPinkMat);
      beacon.position.set(0, 9.8, 0);
      spireGroup.add(tower, beacon);

      spireGroup.position.set(sX, 0, sZ);
      chunk.add(spireGroup);

      registerCollidable(
        `spire_${cx}_${cz}`,
        'crystal',
        new THREE.Vector3(originX + sX, 0, originZ + sZ),
        4.0,
        spireGroup,
        'major',
        false
      );
    }

    // 2. Hovering Flying Saucer (UFO) on ground pylon
    if (rand(4) > 0.5) {
      const uX = rand(5) > 0.5 ? 16 : chunkSize - 16;
      const uZ = 12 + rand(6) * (chunkSize - 24);

      const ufoGroup = new THREE.Group();
      const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.4, 3.5, 8), metalUfoMat);
      pylon.position.set(0, 1.75, 0);

      const saucer = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.5, 16), metalUfoMat);
      saucer.position.set(0, 3.8, 0);

      const dome = new THREE.Mesh(new THREE.SphereGeometry(1.0, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2), neonPinkMat);
      dome.position.set(0, 4.0, 0);

      ufoGroup.add(pylon, saucer, dome);
      ufoGroup.position.set(uX, 0, uZ);
      chunk.add(ufoGroup);

      registerCollidable(
        `ufo_${cx}_${cz}`,
        'crystal',
        new THREE.Vector3(originX + uX, 0, originZ + uZ),
        3.5,
        ufoGroup,
        'major',
        false
      );
    }

    // 3. Neon Laser Fences along highway
    const fenceStep = 10;
    for (let fz = 5; fz < chunkSize - 5; fz += fenceStep) {
      [-5.5, 5.5].forEach((offsetSide, sideIdx) => {
        const fenceGroup = new THREE.Group();
        const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.4, 8), metalUfoMat);
        p1.position.set(0, 0.7, -3.5);
        const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.4, 8), metalUfoMat);
        p2.position.set(0, 0.7, 3.5);

        const beam = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.25, 7.2), laserFenceMat);
        beam.position.set(0, 0.8, 0);
        fenceGroup.add(p1, p2, beam);

        const fx = chunkSize / 2 + offsetSide;
        fenceGroup.position.set(fx, 0, fz);
        chunk.add(fenceGroup);

        registerCollidable(
          `laser_fence_${sideIdx}_${cx}_${cz}_${fz}`,
          'fence',
          new THREE.Vector3(originX + fx, 0, originZ + fz),
          2.0,
          fenceGroup,
          'minor',
          false
        );
      });
    }

    // 4. AIR OBJECTS: Floating Cyber Planetary Rings to fly through!
    for (let r = 0; r < 2; r++) {
      const ringX = 8 + rand(60 + r) * (chunkSize - 16);
      const ringZ = 8 + rand(70 + r) * (chunkSize - 16);
      const ringY = 12 + rand(80 + r) * 14;

      const ringGroup = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.8, 0.35, 12, 24), neonCyanRoadMat);
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 16), neonPinkMat);
      ringGroup.add(ring, sphere);
      ringGroup.position.set(ringX, ringY, ringZ);
      chunk.add(ringGroup);

      registerCollidable(
        `cyber_ring_${cx}_${cz}_${r}`,
        'star_ring',
        new THREE.Vector3(originX + ringX, ringY, originZ + ringZ),
        3.2,
        ringGroup,
        'minor',
        true
      );
    }

    // 5. RANDOM PORTAL TO ANOTHER WORLD!
    if (rand(95) > 0.75 && availableWorldIds.length > 1) {
      const otherWorlds = availableWorldIds.filter((w) => w !== 'cosmic_sky_city');
      const targetWorldId = otherWorlds[Math.floor(rand(96) * otherWorlds.length)];

      const portalX = chunkSize / 2 + (rand(97) > 0.5 ? 9.5 : -9.5);
      const portalZ = 15 + rand(98) * (chunkSize - 30);

      const portalGroup = new THREE.Group();
      const outerArch = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.45, 16, 32), portalRingMat);
      outerArch.position.y = 3.2;
      const vortex = new THREE.Mesh(new THREE.CircleGeometry(2.7, 32), portalVortexMat);
      vortex.position.y = 3.2;
      portalGroup.add(outerArch, vortex);

      portalGroup.position.set(portalX, 0, portalZ);
      chunk.add(portalGroup);

      registerCollidable(
        `portal_${cx}_${cz}`,
        'portal',
        new THREE.Vector3(originX + portalX, 3.2, originZ + portalZ),
        3.6,
        portalGroup,
        'minor',
        false,
        targetWorldId
      );
    }
  },
};
