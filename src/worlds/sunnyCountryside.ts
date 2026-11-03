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
    // 1. DRIVE-THROUGH BIG RED BARN (Over the Road!)
    // Spawn a giant tunnel barn that spans over the road every 3 chunks
    if (cz % 3 === 0 && rand(1) > 0.3) {
      const barnZ = chunkSize / 2;
      const barnGroup = new THREE.Group();

      // Left and right support walls
      const leftWall = new THREE.Mesh(new THREE.BoxGeometry(2.5, 6.0, 10.0), barnRedMat);
      leftWall.position.set(-5.5, 3.0, 0);
      leftWall.castShadow = true;

      const rightWall = new THREE.Mesh(new THREE.BoxGeometry(2.5, 6.0, 10.0), barnRedMat);
      rightWall.position.set(5.5, 3.0, 0);
      rightWall.castShadow = true;

      // High arched roof spanning over the road
      const archRoof = new THREE.Mesh(new THREE.ConeGeometry(9.0, 4.0, 4), barnRoofMat);
      archRoof.rotation.y = Math.PI / 4;
      archRoof.scale.set(1.1, 1.0, 1.3);
      archRoof.position.set(0, 7.8, 0);
      archRoof.castShadow = true;

      // Welcoming white trim sign
      const signBoard = new THREE.Mesh(new THREE.BoxGeometry(6.0, 1.2, 0.3), whiteTrimMat);
      signBoard.position.set(0, 5.6, 5.1);

      // Cheerful glowing golden lanterns on the barn corners
      const lanternGeo = new THREE.SphereGeometry(0.35, 8, 8);
      const lanternMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
      const lanternL = new THREE.Mesh(lanternGeo, lanternMat);
      lanternL.position.set(-4.0, 4.5, 5.1);
      const lanternR = new THREE.Mesh(lanternGeo, lanternMat);
      lanternR.position.set(4.0, 4.5, 5.1);

      barnGroup.add(leftWall, rightWall, archRoof, signBoard, lanternL, lanternR);
      barnGroup.position.set(chunkSize / 2, 0, barnZ);
      chunk.add(barnGroup);

      // Register barn walls as destructible/collidable if hit on side, but middle is a clear open drive-through tunnel!
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

    // 2. TURBO SPEED BOOST CHEVRONS ON ROAD
    // Glowing rocket launcher strips on the road
    if (rand(10) > 0.35) {
      const boostZ = 12 + rand(11) * (chunkSize - 24);
      const boostGroup = new THREE.Group();

      const padPlate = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.08, 3.6), woodDarkMat);
      padPlate.position.y = 0.04;

      // 3 Glowing Arrow Chevrons
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
    }

    // 3. BOUNCY TRAMPOLINE MUSHROOM JUMP SPRINGS
    // Red spotted giant bouncy mushrooms that fling the car 20m high!
    if (rand(20) > 0.4) {
      const mushX = rand(21) > 0.5 ? chunkSize / 2 + 5.5 : chunkSize / 2 - 5.5;
      const mushZ = 8 + rand(22) * (chunkSize - 16);

      const mushGroup = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.1, 1.6, 12), springMushroomStemMat);
      stem.position.y = 0.8;
      stem.castShadow = true;

      const cap = new THREE.Mesh(new THREE.SphereGeometry(1.8, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), springMushroomCapMat);
      cap.position.y = 1.4;
      cap.scale.set(1.3, 0.8, 1.3);
      cap.castShadow = true;

      // White spots on mushroom cap
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
    }

    // 4. MUSICAL MELODY COINS (Ascending Major Scale!)
    // Chains of 4 golden spinning 3D star coins that play ascending chime notes
    if (rand(30) > 0.3) {
      const startZ = 10 + rand(31) * (chunkSize - 35);
      const coinOffset = (rand(32) - 0.5) * 2.8;

      for (let c = 0; c < 4; c++) {
        const coinZ = startZ + c * 4.5;
        const coinGroup = new THREE.Group();
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.35, 16), goldCoinMat);
        const star = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.42, 0),
          new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfde047, emissiveIntensity: 0.6 })
        );
        star.position.y = 0.22;
        star.scale.set(1.1, 0.3, 1.1);
        coinGroup.add(disc, star);
        coinGroup.rotation.x = 0.85; // 50 deg tilt facing camera!
        coinGroup.position.set(chunkSize / 2 + coinOffset, 0.9, coinZ);
        chunk.add(coinGroup);

        registerCollidable(
          `coin_${cx}_${cz}_${c}`,
          'coin',
          new THREE.Vector3(originX + chunkSize / 2 + coinOffset, 0.9, originZ + coinZ),
          1.5,
          coinGroup,
          'minor',
          false,
          undefined,
          { noteIndex: (cz * 4 + c) % 8 }
        );
      }
    }

    // 5. MYSTERY SURPRISE GIFT BOXES
    if (rand(40) > 0.5) {
      const boxX = chunkSize / 2 + (rand(41) > 0.5 ? 2.0 : -2.0);
      const boxZ = 15 + rand(42) * (chunkSize - 30);

      const boxGroup = new THREE.Group();
      const cube = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), mysteryBoxMat);
      cube.position.y = 1.0;
      cube.castShadow = true;

      // Golden ribbon
      const ribbon = new THREE.Mesh(
        new THREE.BoxGeometry(1.24, 0.3, 1.24),
        new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8, roughness: 0.2 })
      );
      ribbon.position.y = 1.0;
      boxGroup.add(cube, ribbon);

      boxGroup.position.set(boxX, 0, boxZ);
      chunk.add(boxGroup);

      registerCollidable(
        `mystery_${cx}_${cz}`,
        'mystery_box',
        new THREE.Vector3(originX + boxX, 1.0, originZ + boxZ),
        1.8,
        boxGroup,
        'minor',
        false
      );
    }

    // 6. CLUCKING CHICKENS ON THE ROAD!
    // Flocks of 3 little chickens that flutter and squawk when approached
    if (rand(50) > 0.45) {
      const chX = chunkSize / 2 + (rand(51) - 0.5) * 3.5;
      const chZ = 12 + rand(52) * (chunkSize - 24);

      for (let k = 0; k < 3; k++) {
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
        const offsetX = (k - 1) * 0.9;
        const offsetZ = (k % 2) * 0.8;
        chickenGroup.position.set(chX + offsetX, 0, chZ + offsetZ);
        chunk.add(chickenGroup);

        registerCollidable(
          `chicken_${cx}_${cz}_${k}`,
          'chicken',
          new THREE.Vector3(originX + chX + offsetX, 0.4, originZ + chZ + offsetZ),
          1.2,
          chickenGroup,
          'minor',
          false,
          undefined,
          { sound: 'squawk' }
        );
      }
    }

    // 7. ROTATING WINDMILL WITH SPINNING BLADES
    if (rand(60) > 0.55) {
      const millX = rand(61) > 0.5 ? 17 : chunkSize - 17;
      const millZ = 14 + rand(62) * (chunkSize - 28);

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
    }

    // 8. NODDING COWS THAT MOO
    if (rand(70) > 0.5) {
      const cowX = rand(71) > 0.5 ? 12 : chunkSize - 12;
      const cowZ = 10 + rand(72) * (chunkSize - 20);

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

    // 9. SUNFLOWER PATCH (Flowers that gently sway in wind)
    for (let s = 0; s < 5; s++) {
      const sunX = rand(80 + s) > 0.5 ? 7.5 + rand(81 + s) * 3 : chunkSize - (7.5 + rand(81 + s) * 3);
      const sunZ = 5 + rand(82 + s) * (chunkSize - 10);

      const flowerGroup = new THREE.Group();
      flowerGroup.name = 'sunflower';
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.6, 6), foliageMat);
      stem.position.y = 0.8;
      flowerGroup.add(stem);

      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.1, 12), sunflowerYellowMat);
      head.position.set(0, 1.6, 0.1);
      head.rotation.x = Math.PI / 4;
      const center = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.12, 12), sunflowerCenterMat);
      center.position.set(0, 1.61, 0.12);
      center.rotation.x = Math.PI / 4;
      flowerGroup.add(head, center);

      flowerGroup.position.set(sunX, 0, sunZ);
      chunk.add(flowerGroup);
    }

    // 10. APPLE TREES WITH BARS OF RED APPLES
    const numTrees = Math.floor(5 * density);
    for (let i = 0; i < numTrees; i++) {
      const tx = 6 + rand(85 + i) * (chunkSize - 12);
      if (Math.abs(tx - chunkSize / 2) > 8.0) {
        const tz = 6 + rand(90 + i) * (chunkSize - 12);
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

    // 11. PROCEDURAL STARGATE WARP PORTAL (High Frequency for Exciting Exploration!)
    if (rand(95) > 0.35 && availableWorldIds.length > 1) {
      const otherWorlds = availableWorldIds.filter((w) => w !== 'sunny_countryside');
      const targetWorldId = otherWorlds[Math.floor(rand(96) * otherWorlds.length)];

      // Spawns right on or adjacent to the roadway
      const portalX = chunkSize / 2 + (rand(97) > 0.6 ? 2.8 : rand(97) < 0.4 ? -2.8 : 0);
      const portalZ = 12 + rand(98) * (chunkSize - 24);

      const portalGroup = new THREE.Group();
      portalGroup.name = 'portal_vortex';
      const outerArch = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.5, 16, 32), portalRingMat);
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
