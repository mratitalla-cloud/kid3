/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { WorldDefinition } from './types';

// Materials
const grassMat = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.8 });
const cobblestoneMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.75 });
const barnRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35 });
const barnRoofMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3 });
const woodDarkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 });
const woodFenceMat = new THREE.MeshStandardMaterial({ color: 0xfafaf9, roughness: 0.4 });
const whiteTrimMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
const hayYellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.85 });
const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x713f12, roughness: 0.8 });
const foliageMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.45 });
const appleRedMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.25 });
const sunflowerYellowMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.3 });
const sunflowerCenterMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 });
const goldCoinMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xf59e0b, emissiveIntensity: 0.8, metalness: 0.85, roughness: 0.15 });
const boostOrangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xea580c, emissiveIntensity: 1.0, roughness: 0.2 });
const springMushroomCapMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xb91c1c, emissiveIntensity: 0.5, roughness: 0.3 });
const springMushroomStemMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.5 });
const mysteryBoxMat = new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0x7e22ce, emissiveIntensity: 0.8, roughness: 0.2 });
const chickenWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
const chickenCombMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 });
const chickenBeakMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3 });
const cowWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
const cowBlackMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
const cowMuzzleMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.5 });
const portalRingMat = new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0xc084fc, emissiveIntensity: 0.95, roughness: 0.2, metalness: 0.6 });
const portalVortexMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.9, transparent: true, opacity: 0.85 });

export const sunnyCountrysideWorld: WorldDefinition = {
  id: 'sunny_countryside',
  name: 'Sunny Countryside',
  subtitle: 'Barn Tunnels, Clucking Chickens, Turbo Chevrons & Bouncy Mushrooms',
  skyColor: 0x93c5fd,
  fogColor: 0xe0f2fe,
  groundColor: 0x4ade80,
  roadColor: 0xd97706,
  ambientLightColor: 0xffffff,
  sunLightColor: 0xfffbeb,
  particleType: 'blossoms',
  particleColor: 0xfecdd3, // Soft pink floating cherry blossom petals

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
    // Zoned rhythmic layout: Each chunk gets ONE distinct primary feature for clear, non-dizzying gameplay!
    const zone = (Math.abs(cz) + Math.abs(cx) * 2) % 6;

    // ZONE 0: DRIVE-THROUGH BIG RED BARN (Iconic Architecture Tunnel)
    if (zone === 0) {
      const barnZ = chunkSize / 2;
      const barnGroup = new THREE.Group();

      const leftWall = new THREE.Mesh(new THREE.BoxGeometry(2.5, 6.0, 10.0), barnRedMat);
      leftWall.position.set(-5.5, 3.0, 0);
      leftWall.castShadow = true;

      const rightWall = new THREE.Mesh(new THREE.BoxGeometry(2.5, 6.0, 10.0), barnRedMat);
      rightWall.position.set(5.5, 3.0, 0);
      rightWall.castShadow = true;

      const archRoof = new THREE.Mesh(new THREE.ConeGeometry(9.0, 4.0, 4), barnRoofMat);
      archRoof.rotation.y = Math.PI / 4;
      archRoof.scale.set(1.1, 1.0, 1.3);
      archRoof.position.set(0, 7.8, 0);
      archRoof.castShadow = true;

      const signBoard = new THREE.Mesh(new THREE.BoxGeometry(6.0, 1.2, 0.3), whiteTrimMat);
      signBoard.position.set(0, 5.6, 5.1);

      const lanternGeo = new THREE.SphereGeometry(0.35, 8, 8);
      const lanternMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
      const lanternL = new THREE.Mesh(lanternGeo, lanternMat);
      lanternL.position.set(-4.0, 4.5, 5.1);
      const lanternR = new THREE.Mesh(lanternGeo, lanternMat);
      lanternR.position.set(4.0, 4.5, 5.1);

      barnGroup.add(leftWall, rightWall, archRoof, signBoard, lanternL, lanternR);
      barnGroup.position.set(chunkSize / 2, 0, barnZ);
      chunk.add(barnGroup);

      registerCollidable(
        `barn_left_${cx}_${cz}`,
        'barn',
        new THREE.Vector3(originX + chunkSize / 2 - 5.5, 3.0, originZ + barnZ),
        2.5,
        leftWall,
        'major',
        false
      );
      registerCollidable(
        `barn_right_${cx}_${cz}`,
        'barn',
        new THREE.Vector3(originX + chunkSize / 2 + 5.5, 3.0, originZ + barnZ),
        2.5,
        rightWall,
        'major',
        false
      );
    }

    // ZONE 1: MUSICAL MELODY COINS (Ascending Major Scale on Open Road)
    else if (zone === 1) {
      const startZ = 14;
      const coinOffset = 0; // Center of road for easy driving

      for (let c = 0; c < 5; c++) {
        const coinZ = startZ + c * 8.5; // Generously spaced 8.5m apart!
        const coinGroup = new THREE.Group();
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.35, 16), goldCoinMat);
        const star = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.42, 0),
          new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfde047, emissiveIntensity: 0.6 })
        );
        star.position.y = 0.22;
        star.scale.set(1.1, 0.3, 1.1);
        coinGroup.add(disc, star);
        coinGroup.rotation.x = 0.85; // 50 deg tilt facing camera
        coinGroup.position.set(chunkSize / 2 + coinOffset, 0.9, coinZ);
        chunk.add(coinGroup);

        registerCollidable(
          `coin_${cx}_${cz}_${c}`,
          'coin',
          new THREE.Vector3(originX + chunkSize / 2 + coinOffset, 0.9, originZ + coinZ),
          1.6,
          coinGroup,
          'minor',
          false,
          undefined,
          { noteIndex: c % 8 }
        );
      }
    }

    // ZONE 2: BOUNCY TRAMPOLINE MUSHROOM & FLUTTERING CHICKENS
    else if (zone === 2) {
      const mushX = chunkSize / 2 + 3.8;
      const mushZ = chunkSize / 2;

      const mushGroup = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.1, 1.6, 12), springMushroomStemMat);
      stem.position.y = 0.8;
      stem.castShadow = true;

      const cap = new THREE.Mesh(new THREE.SphereGeometry(1.8, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), springMushroomCapMat);
      cap.position.y = 1.4;
      cap.scale.set(1.3, 0.8, 1.3);
      cap.castShadow = true;

      const spotGeo = new THREE.CircleGeometry(0.3, 8);
      spotGeo.rotateX(-Math.PI / 2);
      const spotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      [[-0.6, 0.6], [0.7, 0.5], [0, -0.8], [-0.8, -0.4]].forEach(([sx, sz]) => {
        const spot = new THREE.Mesh(spotGeo, spotMat);
        spot.position.set(sx, 2.05, sz);
        mushGroup.add(spot);
      });

      mushGroup.add(stem, cap);
      mushGroup.position.set(mushX, 0, mushZ);
      chunk.add(mushGroup);

      registerCollidable(
        `mushroom_${cx}_${cz}`,
        'jump_pad',
        new THREE.Vector3(originX + mushX, 1.2, originZ + mushZ),
        2.4,
        mushGroup,
        'minor',
        false
      );

      // A cheerful pair of chickens on opposite side
      const chX = chunkSize / 2 - 3.8;
      const chZ = mushZ - 4;
      for (let k = 0; k < 2; k++) {
        const chickenGroup = new THREE.Group();
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), chickenWhiteMat);
        body.position.y = 0.35;
        body.castShadow = true;

        const comb = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.2, 4), chickenCombMat);
        comb.position.set(0, 0.72, 0.1);

        const beak = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.15, 4), chickenBeakMat);
        beak.rotation.x = Math.PI / 2;
        beak.position.set(0, 0.42, 0.38);

        chickenGroup.add(body, comb, beak);
        const offsetZ = k * 1.8;
        chickenGroup.position.set(chX, 0, chZ + offsetZ);
        chunk.add(chickenGroup);

        registerCollidable(
          `chicken_${cx}_${cz}_${k}`,
          'chicken',
          new THREE.Vector3(originX + chX, 0.4, originZ + chZ + offsetZ),
          1.2,
          chickenGroup,
          'minor',
          false,
          undefined,
          { sound: 'squawk' }
        );
      }
    }

    // ZONE 3: TURBO SPEED BOOST PAD & MYSTERY GIFT BOX
    else if (zone === 3) {
      const boostZ = 16;
      const boostGroup = new THREE.Group();

      const padPlate = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.08, 3.6), woodDarkMat);
      padPlate.position.y = 0.04;

      const arrowGeo = new THREE.ConeGeometry(0.7, 1.2, 3);
      arrowGeo.rotateX(Math.PI / 2);
      [-0.8, 0, 0.8].forEach((zOff) => {
        const arrow = new THREE.Mesh(arrowGeo, boostOrangeMat);
        arrow.position.set(0, 0.1, zOff);
        boostGroup.add(arrow);
      });

      boostGroup.add(padPlate);
      boostGroup.position.set(chunkSize / 2, 0, boostZ);
      chunk.add(boostGroup);

      registerCollidable(
        `boost_${cx}_${cz}`,
        'boost_pad',
        new THREE.Vector3(originX + chunkSize / 2, 0.2, originZ + boostZ),
        2.8,
        boostGroup,
        'minor',
        false
      );

      // Mystery Box placed 24m ahead down the straightaway!
      const boxZ = boostZ + 24;
      const boxGroup = new THREE.Group();
      const cube = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), mysteryBoxMat);
      cube.position.y = 1.0;
      cube.castShadow = true;

      const ribbon = new THREE.Mesh(
        new THREE.BoxGeometry(1.44, 0.3, 1.44),
        new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8, roughness: 0.2 })
      );
      ribbon.position.y = 1.0;
      boxGroup.add(cube, ribbon);

      boxGroup.position.set(chunkSize / 2, 0, boxZ);
      chunk.add(boxGroup);

      registerCollidable(
        `mystery_${cx}_${cz}`,
        'mystery_box',
        new THREE.Vector3(originX + chunkSize / 2, 1.0, originZ + boxZ),
        2.0,
        boxGroup,
        'minor',
        false
      );
    }

    // ZONE 4: SCENIC COUNTRY WINDMILL & GRAZING COWS (Meadow Scenery on outer flanks)
    else if (zone === 4) {
      const millX = chunkSize - 16;
      const millZ = chunkSize / 2;

      const millGroup = new THREE.Group();
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.8, 9, 8), whiteTrimMat);
      tower.position.set(0, 4.5, 0);
      tower.castShadow = true;
      millGroup.add(tower);

      const cap = new THREE.Mesh(new THREE.ConeGeometry(2.0, 2.2, 8), barnRoofMat);
      cap.position.set(0, 10.0, 0);
      millGroup.add(cap);

      const bladesGroup = new THREE.Group();
      bladesGroup.name = 'windmill_blades';
      bladesGroup.position.set(0, 9.2, 1.7);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.4, 12), woodDarkMat);
      hub.rotation.x = Math.PI / 2;
      bladesGroup.add(hub);

      const bladeGeo = new THREE.BoxGeometry(0.65, 4.0, 0.08);
      for (let i = 0; i < 4; i++) {
        const blade = new THREE.Mesh(bladeGeo, woodDarkMat);
        blade.position.y = 2.0;
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
        3.8,
        millGroup,
        'major',
        false
      );

      // Nodding cow on opposite side of meadow
      const cowX = 13;
      const cowZ = chunkSize / 2;

      const cowGroup = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.2, 2.2), cowWhiteMat);
      body.position.set(0, 1.4, 0);
      body.castShadow = true;
      cowGroup.add(body);

      const spot = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.9), cowBlackMat);
      spot.position.set(0.48, 1.45, 0.2);
      cowGroup.add(spot);

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 0.95), cowWhiteMat);
      head.position.set(0, 2.0, -1.2);
      head.name = 'cow_head';
      cowGroup.add(head);

      const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.45, 0.45), cowMuzzleMat);
      muzzle.position.set(0, 1.8, -1.65);
      cowGroup.add(muzzle);

      const legGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.9, 8);
      [[-0.55, -0.75], [0.55, -0.75], [-0.55, 0.75], [0.55, 0.75]].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(legGeo, cowWhiteMat);
        leg.position.set(lx, 0.45, lz);
        cowGroup.add(leg);
      });

      cowGroup.position.set(cowX, 0, cowZ);
      chunk.add(cowGroup);

      registerCollidable(
        `cow_${cx}_${cz}`,
        'cow',
        new THREE.Vector3(originX + cowX, 0, originZ + cowZ),
        2.5,
        cowGroup,
        'minor',
        false,
        undefined,
        { sound: 'moo' }
      );
    }

    // ZONE 5: COSMIC STARGATE WARP PORTAL (Clean Gateway to other worlds)
    else if (zone === 5 && availableWorldIds.length > 1) {
      const otherWorlds = availableWorldIds.filter((w) => w !== 'sunny_countryside');
      const targetWorldId = otherWorlds[Math.floor(rand(96) * otherWorlds.length)];

      const portalX = chunkSize / 2;
      const portalZ = chunkSize / 2;

      const portalGroup = new THREE.Group();
      portalGroup.name = 'portal_vortex';
      const outerArch = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.5, 16, 32), portalRingMat);
      outerArch.position.y = 3.4;
      const vortex = new THREE.Mesh(new THREE.CircleGeometry(2.9, 32), portalVortexMat);
      vortex.position.y = 3.4;
      portalGroup.add(outerArch, vortex);

      portalGroup.position.set(portalX, 0, portalZ);
      chunk.add(portalGroup);

      registerCollidable(
        `portal_${cx}_${cz}`,
        'portal',
        new THREE.Vector3(originX + portalX, 3.4, originZ + portalZ),
        3.8,
        portalGroup,
        'minor',
        false,
        targetWorldId
      );
    }

    // Gentle decorative trees well outside the road corridor (kept at outer edges > 10m)
    const numTrees = Math.floor(3 * density);
    for (let i = 0; i < numTrees; i++) {
      const tx = 6 + rand(85 + i) * (chunkSize - 12);
      if (Math.abs(tx - chunkSize / 2) > 10.0) {
        const tz = 8 + rand(90 + i) * (chunkSize - 16);
        const tree = new THREE.Group();

        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 2.8, 8), treeTrunkMat);
        trunk.position.set(0, 1.4, 0);
        trunk.castShadow = true;
        tree.add(trunk);

        const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(1.8, 1), foliageMat);
        crown.position.set(0, 3.6, 0);
        crown.castShadow = true;
        tree.add(crown);

        const appleGeo = new THREE.SphereGeometry(0.22, 8, 8);
        [[-0.9, 3.5, 0.8], [0.8, 3.3, 0.7], [-0.5, 3.0, -1.0], [0.7, 3.7, -0.6]].forEach(([x, y, z]) => {
          const apple = new THREE.Mesh(appleGeo, appleRedMat);
          apple.position.set(x, y, z);
          tree.add(apple);
        });

        tree.position.set(tx, 0, tz);
        chunk.add(tree);

        registerCollidable(
          `tree_${cx}_${cz}_${i}`,
          'tree',
          new THREE.Vector3(originX + tx, 0, originZ + tz),
          2.6,
          tree,
          'minor',
          false
        );
      }
    }
  },

  // Interactive chunk animation tick
  tickChunk: (chunk, delta, elapsed, carPos) => {
    // 1. Spin windmill blades
    const blades = chunk.getObjectByName('windmill_blades');
    if (blades) {
      blades.rotation.z += delta * 1.6;
    }

    // 2. Spin & pulse portal vortexes
    const portal = chunk.getObjectByName('portal_vortex');
    if (portal) {
      portal.rotation.y += delta * 0.8;
      const s = 1.0 + Math.sin(elapsed * 4) * 0.05;
      portal.scale.set(s, s, s);
    }

    // 3. Nodding cow head when car gets close!
    const cowHead = chunk.getObjectByName('cow_head');
    if (cowHead) {
      const worldPos = new THREE.Vector3();
      cowHead.getWorldPosition(worldPos);
      const dist = carPos.distanceTo(worldPos);
      if (dist < 15.0) {
        cowHead.rotation.x = Math.sin(elapsed * 6) * 0.35;
      } else {
        cowHead.rotation.x = Math.sin(elapsed * 1.5) * 0.1;
      }
    }
  },
};
