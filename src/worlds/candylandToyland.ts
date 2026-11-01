/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { WorldDefinition } from './types';

// Materials for Candyland
const frostingGroundMat = new THREE.MeshStandardMaterial({ color: 0xa7f3d0, roughness: 0.7 });
const cookieRoadMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.8 });
const gingerbreadMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.6 });
const icingWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
const candyCaneRedMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 });
const candyCaneWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
const marshmallowMat = new THREE.MeshStandardMaterial({ color: 0xfbcfe8, roughness: 0.5 });
const lollipopPinkMat = new THREE.MeshStandardMaterial({ color: 0xec4899, roughness: 0.2, metalness: 0.2 });
const gumdropGreenMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.2, transparent: true, opacity: 0.85 });
const chocolateMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.4 });
const portalRingMat = new THREE.MeshStandardMaterial({ color: 0xec4899, emissive: 0xf472b6, emissiveIntensity: 0.9, roughness: 0.2 });
const portalVortexMat = new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0xc084fc, emissiveIntensity: 0.8, transparent: true, opacity: 0.75 });

export const candylandToylandWorld: WorldDefinition = {
  id: 'candyland_toyland',
  name: 'Candyland & Toyland',
  subtitle: 'Gingerbread Cottages, Candy Canes & Lollipop Forests',
  skyColor: 0xf472b6,
  fogColor: 0xfce7f3,
  groundColor: 0xa7f3d0,
  roadColor: 0xfde047,
  ambientLightColor: 0xfff1f2,
  sunLightColor: 0xfef08a,

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
    // 1. Giant Gingerbread Cottage
    if (rand(1) > 0.4) {
      const gX = rand(2) > 0.5 ? 14 : chunkSize - 14;
      const gZ = 15 + rand(3) * (chunkSize - 30);

      const cottage = new THREE.Group();
      // Gingerbread Walls
      const walls = new THREE.Mesh(new THREE.BoxGeometry(6.5, 4.2, 5.5), gingerbreadMat);
      walls.position.set(0, 2.1, 0);
      walls.castShadow = true;
      cottage.add(walls);

      // White Icing Roof
      const roof = new THREE.Mesh(new THREE.ConeGeometry(5.0, 3.2, 4), icingWhiteMat);
      roof.rotation.y = Math.PI / 4;
      roof.position.set(0, 5.4, 0);
      cottage.add(roof);

      // Gumdrop chimney
      const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.8, 12), candyCaneRedMat);
      chimney.position.set(1.8, 5.5, 0);
      cottage.add(chimney);

      cottage.position.set(gX, 0, gZ);
      chunk.add(cottage);

      registerCollidable(
        `candy_cottage_${cx}_${cz}`,
        'candy',
        new THREE.Vector3(originX + gX, 0, originZ + gZ),
        5.2,
        cottage,
        'major',
        false
      );
    }

    // 2. Striped Candy Canes
    const numCanes = Math.floor(4 * density);
    for (let i = 0; i < numCanes; i++) {
      const cX = 6 + rand(10 + i) * (chunkSize - 12);
      if (Math.abs(cX - chunkSize / 2) > 6) {
        const cZ = 6 + rand(20 + i) * (chunkSize - 12);

        const caneGroup = new THREE.Group();
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 4.5, 12), candyCaneRedMat);
        post.position.set(0, 2.25, 0);
        post.castShadow = true;

        const crook = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.35, 8, 16, Math.PI), candyCaneWhiteMat);
        crook.position.set(0.8, 4.5, 0);
        crook.rotation.z = -Math.PI / 2;
        caneGroup.add(post, crook);

        caneGroup.position.set(cX, 0, cZ);
        chunk.add(caneGroup);

        registerCollidable(
          `candy_cane_${cx}_${cz}_${i}`,
          'candy',
          new THREE.Vector3(originX + cX, 0, originZ + cZ),
          2.0,
          caneGroup,
          'minor',
          false
        );
      }
    }

    // 3. Marshmallow Trees & Lollipop Flowers
    const numTrees = Math.floor(6 * density);
    for (let i = 0; i < numTrees; i++) {
      const tX = 5 + rand(30 + i) * (chunkSize - 10);
      if (Math.abs(tX - chunkSize / 2) > 7) {
        const tZ = 5 + rand(40 + i) * (chunkSize - 10);
        const lollyGroup = new THREE.Group();

        // Candy stick
        const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 3.2, 8), icingWhiteMat);
        stick.position.set(0, 1.6, 0);
        stick.castShadow = true;

        // Lollipop disc or Marshmallow puff
        const isMallow = rand(45 + i) > 0.5;
        if (isMallow) {
          const puff = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 1.2, 16), marshmallowMat);
          puff.position.set(0, 3.4, 0);
          puff.castShadow = true;
          lollyGroup.add(stick, puff);
        } else {
          const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.3, 16), lollipopPinkMat);
          disc.rotation.x = Math.PI / 2;
          disc.position.set(0, 3.5, 0);
          disc.castShadow = true;
          lollyGroup.add(stick, disc);
        }

        lollyGroup.position.set(tX, 0, tZ);
        chunk.add(lollyGroup);

        registerCollidable(
          `lolly_${cx}_${cz}_${i}`,
          'candy',
          new THREE.Vector3(originX + tX, 0, originZ + tZ),
          2.2,
          lollyGroup,
          'minor',
          false
        );
      }
    }

    // 4. Chocolate Bar Fences along road
    const fenceStep = 10;
    for (let fz = 5; fz < chunkSize - 5; fz += fenceStep) {
      [-5.5, 5.5].forEach((offsetSide, sideIdx) => {
        const choc = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.1, 7.5), chocolateMat);
        const fx = chunkSize / 2 + offsetSide;
        choc.position.set(fx, 0.55, fz);
        choc.castShadow = true;
        chunk.add(choc);

        registerCollidable(
          `choc_fence_${sideIdx}_${cx}_${cz}_${fz}`,
          'fence',
          new THREE.Vector3(originX + fx, 0, originZ + fz),
          2.0,
          choc,
          'minor',
          false
        );
      });
    }

    // 5. AIR OBJECTS: Flying Sugar Doughnut Hoops!
    for (let r = 0; r < 2; r++) {
      const ringX = 8 + rand(60 + r) * (chunkSize - 16);
      const ringZ = 8 + rand(70 + r) * (chunkSize - 16);
      const ringY = 12 + rand(80 + r) * 14;

      const donut = new THREE.Mesh(
        new THREE.TorusGeometry(2.5, 0.65, 12, 24),
        new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.5 })
      );
      const icing = new THREE.Mesh(
        new THREE.TorusGeometry(2.5, 0.7, 12, 24),
        lollipopPinkMat
      );
      icing.scale.set(1.02, 1.02, 1.02);

      const donutGroup = new THREE.Group();
      donutGroup.add(donut, icing);
      donutGroup.position.set(ringX, ringY, ringZ);
      chunk.add(donutGroup);

      registerCollidable(
        `donut_ring_${cx}_${cz}_${r}`,
        'star_ring',
        new THREE.Vector3(originX + ringX, ringY, originZ + ringZ),
        3.2,
        donutGroup,
        'minor',
        true
      );
    }

    // 6. RANDOM PORTAL TO ANOTHER WORLD!
    if (rand(95) > 0.75 && availableWorldIds.length > 1) {
      const otherWorlds = availableWorldIds.filter((w) => w !== 'candyland_toyland');
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
