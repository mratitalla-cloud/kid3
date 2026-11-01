/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { WorldDefinition } from './types';

// Materials
const grassMat = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.8 });
const dirtRoadMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.9 });
const barnMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 });
const roofMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.3 });
const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 });
const whiteTrimMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
const hayMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.9 });
const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.8 });
const foliageMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.5 });
const appleMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 });
const goldStarMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xf59e0b, emissiveIntensity: 0.7, roughness: 0.2, metalness: 0.8 });
const rainbowCloudMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.3, transparent: true, opacity: 0.9 });
const cowWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
const cowBlackMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
const portalRingMat = new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0xc084fc, emissiveIntensity: 0.9, roughness: 0.2, metalness: 0.5 });
const portalVortexMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x67e8f9, emissiveIntensity: 0.8, transparent: true, opacity: 0.75 });

export const sunnyCountrysideWorld: WorldDefinition = {
  id: 'sunny_countryside',
  name: 'Sunny Countryside',
  subtitle: 'Farms, Barns, Windmills & Apple Orchards',
  skyColor: 0x93c5fd,
  fogColor: 0xe0f2fe,
  groundColor: 0x4ade80,
  roadColor: 0xf59e0b,
  ambientLightColor: 0xffffff,
  sunLightColor: 0xfffbeb,

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
    // 1. Red Barn
    if (rand(1) > 0.45) {
      const barnX = rand(2) > 0.5 ? 14 : chunkSize - 14;
      const barnZ = 15 + rand(3) * (chunkSize - 30);

      const barnGroup = new THREE.Group();
      const barn = new THREE.Mesh(new THREE.BoxGeometry(7, 4.5, 6), barnMat);
      barn.position.set(0, 2.25, 0);
      barn.castShadow = true;
      barnGroup.add(barn);

      const roof = new THREE.Mesh(new THREE.ConeGeometry(5.2, 3.2, 4), roofMat);
      roof.rotation.y = Math.PI / 4;
      roof.scale.set(1.1, 1, 0.9);
      roof.position.set(0, 5.8, 0);
      roof.castShadow = true;
      barnGroup.add(roof);

      const door = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.2, 0.2), whiteTrimMat);
      door.position.set(0, 1.6, 3.05);
      barnGroup.add(door);

      barnGroup.position.set(barnX, 0, barnZ);
      chunk.add(barnGroup);

      registerCollidable(
        `barn_${cx}_${cz}`,
        'barn',
        new THREE.Vector3(originX + barnX, 0, originZ + barnZ),
        5.5,
        barnGroup,
        'major',
        false
      );
    }

    // 2. Windmill
    if (rand(4) > 0.6) {
      const millX = rand(5) > 0.5 ? 16 : chunkSize - 16;
      const millZ = 12 + rand(6) * (chunkSize - 24);

      const millGroup = new THREE.Group();
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2.6, 8, 8), whiteTrimMat);
      tower.position.set(0, 4, 0);
      tower.castShadow = true;
      millGroup.add(tower);

      const cap = new THREE.Mesh(new THREE.ConeGeometry(1.9, 2.0, 8), roofMat);
      cap.position.set(0, 9.0, 0);
      millGroup.add(cap);

      const bladesGroup = new THREE.Group();
      bladesGroup.position.set(0, 8.2, 1.6);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.4, 12), woodMat);
      hub.rotation.x = Math.PI / 2;
      bladesGroup.add(hub);

      const bladeGeo = new THREE.BoxGeometry(0.6, 3.6, 0.08);
      for (let i = 0; i < 4; i++) {
        const blade = new THREE.Mesh(bladeGeo, woodMat);
        blade.position.y = 1.8;
        const bladePivot = new THREE.Group();
        bladePivot.rotation.z = (i * Math.PI) / 2;
        bladePivot.add(blade);
        bladesGroup.add(bladePivot);
      }
      millGroup.add(bladesGroup);
      millGroup.position.set(millX, 0, millZ);
      chunk.add(millGroup);

      registerCollidable(
        `windmill_${cx}_${cz}`,
        'windmill',
        new THREE.Vector3(originX + millX, 0, originZ + millZ),
        3.5,
        millGroup,
        'major',
        false
      );
    }

    // 3. Fences along path
    const fenceStep = 9;
    for (let fz = 4; fz < chunkSize - 4; fz += fenceStep) {
      [-5.5, 5.5].forEach((offsetSide, sideIdx) => {
        const fGroup = new THREE.Group();
        const post1 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.3, 8), woodMat);
        post1.position.set(0, 0.65, -3.5);
        post1.castShadow = true;
        const post2 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.3, 8), woodMat);
        post2.position.set(0, 0.65, 3.5);
        post2.castShadow = true;
        const rail1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 7.2), woodMat);
        rail1.position.set(0, 0.5, 0);
        const rail2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 7.2), woodMat);
        rail2.position.set(0, 0.95, 0);
        fGroup.add(post1, post2, rail1, rail2);

        const fx = chunkSize / 2 + offsetSide;
        fGroup.position.set(fx, 0, fz);
        chunk.add(fGroup);

        registerCollidable(
          `fence_${sideIdx}_${cx}_${cz}_${fz}`,
          'fence',
          new THREE.Vector3(originX + fx, 0, originZ + fz),
          2.0,
          fGroup,
          'minor',
          false
        );
      });
    }

    // 4. Hay Bales
    const numHay = Math.floor(4 * density);
    for (let i = 0; i < numHay; i++) {
      const hx = 6 + rand(10 + i) * (chunkSize - 12);
      if (Math.abs(hx - chunkSize / 2) > 6) {
        const hz = 6 + rand(20 + i) * (chunkSize - 12);
        const hay = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.6, 12), hayMat);
        hay.rotation.z = Math.PI / 2;
        hay.position.set(hx, 0.9, hz);
        hay.castShadow = true;
        chunk.add(hay);

        registerCollidable(
          `hay_${cx}_${cz}_${i}`,
          'hay',
          new THREE.Vector3(originX + hx, 0, originZ + hz),
          2.0,
          hay,
          'minor',
          false
        );
      }
    }

    // 5. Apple Trees
    const numTrees = Math.floor(7 * density);
    for (let i = 0; i < numTrees; i++) {
      const tx = 5 + rand(30 + i) * (chunkSize - 10);
      if (Math.abs(tx - chunkSize / 2) > 7) {
        const tz = 5 + rand(40 + i) * (chunkSize - 10);
        const tGroup = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 2.5, 8), treeTrunkMat);
        trunk.position.set(0, 1.25, 0);
        trunk.castShadow = true;
        const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(1.6, 1), foliageMat);
        crown.position.set(0, 3.2, 0);
        crown.castShadow = true;
        tGroup.add(trunk, crown);

        const appleGeo = new THREE.SphereGeometry(0.18, 8, 8);
        [[-0.8, 3.2, 0.9], [0.9, 3.0, 0.7], [-0.4, 2.7, -1.0], [0.7, 3.4, -0.6]].forEach(([x, y, z]) => {
          const apple = new THREE.Mesh(appleGeo, appleMat);
          apple.position.set(x, y, z);
          tGroup.add(apple);
        });

        tGroup.position.set(tx, 0, tz);
        chunk.add(tGroup);

        registerCollidable(
          `tree_${cx}_${cz}_${i}`,
          'tree',
          new THREE.Vector3(originX + tx, 0, originZ + tz),
          2.4,
          tGroup,
          'minor',
          false
        );
      }
    }

    // 6. Grazing Cow
    if (rand(50) > 0.4) {
      const cowX = rand(51) > 0.5 ? 20 : chunkSize - 20;
      const cowZ = 10 + rand(52) * (chunkSize - 20);
      const cowGroup = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, 2.0), cowWhiteMat);
      body.position.set(0, 1.3, 0);
      body.castShadow = true;
      const spot = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.8), cowBlackMat);
      spot.position.set(0.45, 1.35, 0.2);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.9), cowWhiteMat);
      head.position.set(0, 1.9, -1.1);
      const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.4), new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.5 }));
      muzzle.position.set(0, 1.7, -1.5);
      cowGroup.add(body, spot, head, muzzle);

      const legGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.8, 8);
      [[-0.5, -0.7], [0.5, -0.7], [-0.5, 0.7], [0.5, 0.7]].forEach(([x, z]) => {
        const leg = new THREE.Mesh(legGeo, cowWhiteMat);
        leg.position.set(x, 0.4, z);
        cowGroup.add(leg);
      });

      cowGroup.position.set(cowX, 0, cowZ);
      chunk.add(cowGroup);

      registerCollidable(
        `cow_${cx}_${cz}`,
        'cow',
        new THREE.Vector3(originX + cowX, 0, originZ + cowZ),
        2.2,
        cowGroup,
        'minor',
        false
      );
    }

    // 7. AIR OBJECTS: Golden Star Rings to fly through!
    for (let r = 0; r < 2; r++) {
      const ringX = 8 + rand(60 + r) * (chunkSize - 16);
      const ringZ = 8 + rand(70 + r) * (chunkSize - 16);
      const ringY = 12 + rand(80 + r) * 14;

      const ringGroup = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.35, 12, 24), goldStarMat);
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.8), goldStarMat);
      ringGroup.add(ring, star);
      ringGroup.position.set(ringX, ringY, ringZ);
      chunk.add(ringGroup);

      registerCollidable(
        `star_ring_${cx}_${cz}_${r}`,
        'star_ring',
        new THREE.Vector3(originX + ringX, ringY, originZ + ringZ),
        3.2,
        ringGroup,
        'minor',
        true
      );
    }

    // 8. RANDOM PORTAL TO ANOTHER WORLD!
    // Spawns with ~25% chance per chunk on the side of the road
    if (rand(95) > 0.75 && availableWorldIds.length > 1) {
      const otherWorlds = availableWorldIds.filter((w) => w !== 'sunny_countryside');
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
