/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { WorldDefinition } from './types';

// Materials for Dino Safari
const jungleGroundMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.85 });
const mudTrailMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.95 });
const rockVolcanoMat = new THREE.MeshStandardMaterial({ color: 0x44403c, roughness: 0.8 });
const lavaOrangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xea580c, emissiveIntensity: 0.8, roughness: 0.3 });
const palmWoodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
const palmLeafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 });
const boneWhiteMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.4 });
const dinoSkinMat = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.7 });
const portalRingMat = new THREE.MeshStandardMaterial({ color: 0xeab308, emissive: 0xf59e0b, emissiveIntensity: 0.9, roughness: 0.2 });
const portalVortexMat = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x34d399, emissiveIntensity: 0.8, transparent: true, opacity: 0.75 });

export const dinoSafariWorld: WorldDefinition = {
  id: 'dino_safari',
  name: 'Prehistoric Dino Safari',
  subtitle: 'Volcanoes, Palm Forests, Fossil Arches & Friendly Dinosaurs',
  skyColor: 0xfdba74,
  fogColor: 0xfed7aa,
  groundColor: 0x65a30d,
  roadColor: 0x92400e,
  ambientLightColor: 0xffedd5,
  sunLightColor: 0xffedd5,

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
    // 1. Smoking Mini Volcano
    if (rand(1) > 0.45) {
      const vX = rand(2) > 0.5 ? 14 : chunkSize - 14;
      const vZ = 15 + rand(3) * (chunkSize - 30);

      const volcanoGroup = new THREE.Group();
      const mountain = new THREE.Mesh(new THREE.ConeGeometry(5.5, 6.0, 7), rockVolcanoMat);
      mountain.position.set(0, 3.0, 0);
      mountain.castShadow = true;

      const lava = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.4, 12), lavaOrangeMat);
      lava.position.set(0, 5.8, 0);
      volcanoGroup.add(mountain, lava);

      volcanoGroup.position.set(vX, 0, vZ);
      chunk.add(volcanoGroup);

      registerCollidable(
        `volcano_${cx}_${cz}`,
        'dino',
        new THREE.Vector3(originX + vX, 0, originZ + vZ),
        5.5,
        volcanoGroup,
        'major',
        false
      );
    }

    // 2. Giant Dinosaur Fossil Rib Arches across road
    if (rand(4) > 0.6) {
      const archZ = 15 + rand(5) * (chunkSize - 30);
      const ribArch = new THREE.Group();

      const rib = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.4, 8, 16, Math.PI), boneWhiteMat);
      rib.position.set(0, 4.0, 0);
      rib.rotation.z = Math.PI;
      ribArch.add(rib);

      ribArch.position.set(chunkSize / 2, 0, archZ);
      chunk.add(ribArch);

      registerCollidable(
        `rib_arch_${cx}_${cz}`,
        'dino',
        new THREE.Vector3(originX + chunkSize / 2, 4.0, originZ + archZ),
        4.0,
        ribArch,
        'minor',
        false
      );
    }

    // 3. Jungle Palm Trees
    const numPalms = Math.floor(6 * density);
    for (let i = 0; i < numPalms; i++) {
      const pX = 5 + rand(20 + i) * (chunkSize - 10);
      if (Math.abs(pX - chunkSize / 2) > 7) {
        const pZ = 5 + rand(30 + i) * (chunkSize - 10);
        const palmGroup = new THREE.Group();

        // Curved trunk
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 4.5, 8), palmWoodMat);
        trunk.position.set(0, 2.25, 0);
        trunk.rotation.z = (rand(35 + i) - 0.5) * 0.3;
        trunk.castShadow = true;

        // Fronds
        for (let f = 0; f < 5; f++) {
          const frond = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 2.2), palmLeafMat);
          frond.position.set(0, 4.4, 0.8);
          frond.rotation.x = 0.5;
          const frondPivot = new THREE.Group();
          frondPivot.rotation.y = (f * Math.PI * 2) / 5;
          frondPivot.add(frond);
          palmGroup.add(frondPivot);
        }
        palmGroup.add(trunk);
        palmGroup.position.set(pX, 0, pZ);
        chunk.add(palmGroup);

        registerCollidable(
          `palm_${cx}_${cz}_${i}`,
          'tree',
          new THREE.Vector3(originX + pX, 0, originZ + pZ),
          2.2,
          palmGroup,
          'minor',
          false
        );
      }
    }

    // 4. Friendly Cartoon Brontosaurus
    if (rand(50) > 0.4) {
      const dX = rand(51) > 0.5 ? 18 : chunkSize - 18;
      const dZ = 10 + rand(52) * (chunkSize - 20);

      const dinoGroup = new THREE.Group();
      // Body
      const body = new THREE.Mesh(new THREE.SphereGeometry(1.8, 12, 12), dinoSkinMat);
      body.scale.set(1.4, 1.0, 1.8);
      body.position.set(0, 1.8, 0);
      body.castShadow = true;

      // Long Neck
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.7, 3.5, 8), dinoSkinMat);
      neck.position.set(0, 3.8, -1.5);
      neck.rotation.x = -0.3;

      // Head
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 1.1), dinoSkinMat);
      head.position.set(0, 5.2, -2.1);

      dinoGroup.add(body, neck, head);

      // 4 Pillar Legs
      const legGeo = new THREE.CylinderGeometry(0.3, 0.35, 1.4, 8);
      [[-0.9, -1.0], [0.9, -1.0], [-0.9, 1.0], [0.9, 1.0]].forEach(([x, z]) => {
        const leg = new THREE.Mesh(legGeo, dinoSkinMat);
        leg.position.set(x, 0.7, z);
        dinoGroup.add(leg);
      });

      dinoGroup.position.set(dX, 0, dZ);
      chunk.add(dinoGroup);

      registerCollidable(
        `dino_${cx}_${cz}`,
        'dino',
        new THREE.Vector3(originX + dX, 0, originZ + dZ),
        3.5,
        dinoGroup,
        'major',
        false
      );
    }

    // 5. AIR OBJECTS: Flying Amber Pterodactyl Hoops
    for (let r = 0; r < 2; r++) {
      const ringX = 8 + rand(60 + r) * (chunkSize - 16);
      const ringZ = 8 + rand(70 + r) * (chunkSize - 16);
      const ringY = 12 + rand(80 + r) * 14;

      const hoop = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.35, 12, 24), lavaOrangeMat);
      hoop.position.set(ringX, ringY, ringZ);
      chunk.add(hoop);

      registerCollidable(
        `dino_ring_${cx}_${cz}_${r}`,
        'star_ring',
        new THREE.Vector3(originX + ringX, ringY, originZ + ringZ),
        3.2,
        hoop,
        'minor',
        true
      );
    }

    // 6. RANDOM PORTAL TO ANOTHER WORLD!
    if (rand(95) > 0.75 && availableWorldIds.length > 1) {
      const otherWorlds = availableWorldIds.filter((w) => w !== 'dino_safari');
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
