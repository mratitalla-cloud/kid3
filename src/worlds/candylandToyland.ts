/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { WorldDefinition } from './types';

// Materials for Candyland
const frostingGroundMat = new THREE.MeshStandardMaterial({ color: 0xfbcfe8, roughness: 0.6 }); // Frosted sugar meadow
const waferRoadMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.75 }); // Golden wafer biscuit road
const gingerbreadMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.65 });
const royalIcingWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
const candyCaneRedMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.25 });
const candyCaneWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25 });
const marshmallowPinkMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.5 });
const marshmallowCyanMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.5 });
const jellyGreenMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.1, transparent: true, opacity: 0.85 });
const jellyPinkMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0xe11d48, emissiveIntensity: 0.4, roughness: 0.1, transparent: true, opacity: 0.88 });
const chocolateDarkMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.35 });
const lollipopYellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.2, metalness: 0.3 });
const lollipopPurpleMat = new THREE.MeshStandardMaterial({ color: 0xa855f7, roughness: 0.2, metalness: 0.3 });
const sugarCoinMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xf59e0b, emissiveIntensity: 0.9, metalness: 0.8, roughness: 0.2 });
const boostRainbowMat = new THREE.MeshStandardMaterial({ color: 0xec4899, emissive: 0xdb2777, emissiveIntensity: 1.0, roughness: 0.2 });
const mysteryCandyBoxMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x0891b2, emissiveIntensity: 0.85, roughness: 0.2 });
const portalRingMat = new THREE.MeshStandardMaterial({ color: 0xec4899, emissive: 0xf472b6, emissiveIntensity: 0.95, roughness: 0.2 });
const portalVortexMat = new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0xc084fc, emissiveIntensity: 0.85, transparent: true, opacity: 0.85 });

export const candylandToylandWorld: WorldDefinition = {
  id: 'candyland_toyland',
  name: 'Candyland & Toyland',
  subtitle: 'Jelly Trampolines, Peppermint Pinwheels, Gummy Bears & Donut Loops',
  skyColor: 0xf472b6,
  fogColor: 0xfce7f3,
  groundColor: 0xfbcfe8,
  roadColor: 0xfef08a,
  ambientLightColor: 0xfff1f2,
  sunLightColor: 0xfef08a,
  particleType: 'sprinkles',
  particleColor: 0xec4899,

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
    // 1. CANDY CANE ROAD BORDERS
    // Striped candy cane safety bumpers on both sides of the biscuit road
    const caneStep = 7;
    for (let z = 3; z < chunkSize - 3; z += caneStep) {
      [-4.6, 4.6].forEach((xOff) => {
        const cane = new THREE.Group();
        const seg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.7, 8), candyCaneRedMat);
        seg1.position.y = 0.35;
        const seg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.7, 8), candyCaneWhiteMat);
        seg2.position.y = 1.05;
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), candyCaneRedMat);
        cap.position.y = 1.45;
        cane.add(seg1, seg2, cap);
        cane.position.set(chunkSize / 2 + xOff, 0, z);
        chunk.add(cane);

        registerCollidable(
          `cane_${cx}_${cz}_${xOff}_${z}`,
          'candy',
          new THREE.Vector3(originX + chunkSize / 2 + xOff, 0.7, originZ + z),
          1.2,
          cane,
          'minor',
          false
        );
      });
    }

    // 2. GIANT BOUNCY JELLY PUDDING TRAMPOLINE!
    // Translucent glowing wobbly pudding on the road that bounces the car 22m high
    if (rand(1) > 0.35) {
      const jelloZ = 12 + rand(2) * (chunkSize - 24);
      const jelloGroup = new THREE.Group();
      jelloGroup.name = 'jelly_trampoline';

      // Fluted gelatin mold geometry
      const jelloMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(2.2, 2.8, 1.4, 16),
        jellyPinkMat
      );
      jelloMesh.position.y = 0.7;
      jelloMesh.castShadow = true;

      // Glossy red cherry on top
      const cherry = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 12), candyCaneRedMat);
      cherry.position.set(0, 1.6, 0);

      // Cherry stem
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 4), chocolateDarkMat);
      stem.position.set(0.15, 2.0, 0);
      stem.rotation.z = -0.4;

      jelloGroup.add(jelloMesh, cherry, stem);
      jelloGroup.position.set(chunkSize / 2, 0, jelloZ);
      chunk.add(jelloGroup);

      registerCollidable(
        `jelly_${cx}_${cz}`,
        'jump_pad',
        new THREE.Vector3(originX + chunkSize / 2, 1.0, originZ + jelloZ),
        2.8,
        jelloGroup,
        'minor',
        false
      );
    }

    // 3. TURBO RAINBOW SUGAR BOOST PAD
    if (rand(10) > 0.4) {
      const boostZ = 8 + rand(11) * (chunkSize - 16);
      const boostGroup = new THREE.Group();

      const base = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.08, 3.6), chocolateDarkMat);
      base.position.y = 0.04;

      // Glowing pink/cyan chevrons
      const arrowGeo = new THREE.ConeGeometry(0.7, 1.2, 3);
      arrowGeo.rotateX(Math.PI / 2);
      [-0.8, 0, 0.8].forEach((zOff) => {
        const arrow = new THREE.Mesh(arrowGeo, boostRainbowMat);
        arrow.position.set(0, 0.1, zOff);
        boostGroup.add(arrow);
      });

      boostGroup.add(base);
      boostGroup.position.set(chunkSize / 2, 0, boostZ);
      chunk.add(boostGroup);

      registerCollidable(
        `candy_boost_${cx}_${cz}`,
        'boost_pad',
        new THREE.Vector3(originX + chunkSize / 2, 0.2, originZ + boostZ),
        2.8,
        boostGroup,
        'minor',
        false
      );
    }

    // 4. GIANT GINGERBREAD CASTLE WITH DRIVE-THROUGH ARCHWAY
    if (cz % 3 === 0 && rand(20) > 0.35) {
      const castleZ = chunkSize / 2;
      const castle = new THREE.Group();

      // Left tower
      const towerL = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.0, 8.0, 8), gingerbreadMat);
      towerL.position.set(-6.0, 4.0, 0);
      const roofL = new THREE.Mesh(new THREE.ConeGeometry(2.4, 3.0, 8), royalIcingWhiteMat);
      roofL.position.set(-6.0, 9.5, 0);

      // Right tower
      const towerR = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.0, 8.0, 8), gingerbreadMat);
      towerR.position.set(6.0, 4.0, 0);
      const roofR = new THREE.Mesh(new THREE.ConeGeometry(2.4, 3.0, 8), royalIcingWhiteMat);
      roofR.position.set(6.0, 9.5, 0);

      // Spanning castle bridge arch over the road
      const arch = new THREE.Mesh(new THREE.BoxGeometry(10.0, 2.5, 3.0), gingerbreadMat);
      arch.position.set(0, 7.0, 0);

      // White frosting icicles
      const icing = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.6, 3.2), royalIcingWhiteMat);
      icing.position.set(0, 8.4, 0);

      castle.add(towerL, roofL, towerR, roofR, arch, icing);
      castle.position.set(chunkSize / 2, 0, castleZ);
      chunk.add(castle);

      registerCollidable(
        `castle_left_${cx}_${cz}`,
        'candy',
        new THREE.Vector3(originX + chunkSize / 2 - 6.0, 4.0, originZ + castleZ),
        2.6,
        towerL,
        'major',
        false
      );
      registerCollidable(
        `castle_right_${cx}_${cz}`,
        'candy',
        new THREE.Vector3(originX + chunkSize / 2 + 6.0, 4.0, originZ + castleZ),
        2.6,
        towerR,
        'major',
        false
      );
    }

    // 5. SPINNING PEPPERMINT PINWHEELS
    // Giant candy pinwheels that spin rapidly in the wind
    if (rand(30) > 0.5) {
      const pinX = rand(31) > 0.5 ? 16 : chunkSize - 16;
      const pinZ = 12 + rand(32) * (chunkSize - 24);

      const pinGroup = new THREE.Group();
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 6.0, 8), royalIcingWhiteMat);
      stick.position.y = 3.0;

      const wheel = new THREE.Group();
      wheel.name = 'peppermint_wheel';
      wheel.position.set(0, 5.8, 0.3);

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.3, 12), candyCaneRedMat);
      hub.rotation.x = Math.PI / 2;
      wheel.add(hub);

      for (let p = 0; p < 6; p++) {
        const blade = new THREE.Mesh(
          new THREE.ConeGeometry(0.8, 2.5, 4),
          p % 2 === 0 ? candyCaneRedMat : candyCaneWhiteMat
        );
        blade.position.y = 1.3;
        const pivot = new THREE.Group();
        pivot.rotation.z = (p * Math.PI) / 3;
        pivot.add(blade);
        wheel.add(pivot);
      }

      pinGroup.add(stick, wheel);
      pinGroup.position.set(pinX, 0, pinZ);
      chunk.add(pinGroup);

      registerCollidable(
        `pinwheel_${cx}_${cz}`,
        'candy',
        new THREE.Vector3(originX + pinX, 3.0, originZ + pinZ),
        3.2,
        pinGroup,
        'minor',
        false
      );
    }

    // 6. DANCING WOBBLY GUMMY BEARS!
    // Giant translucent jelly bears on the roadside that wobble
    if (rand(40) > 0.4) {
      const bearX = rand(41) > 0.5 ? 10 : chunkSize - 10;
      const bearZ = 14 + rand(42) * (chunkSize - 28);

      const bearGroup = new THREE.Group();
      bearGroup.name = 'gummy_bear';

      // Bear body
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.9, 1.2, 8, 8), jellyGreenMat);
      body.position.y = 1.5;
      body.castShadow = true;

      // Bear head
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 8), jellyGreenMat);
      head.position.set(0, 2.6, 0);

      // Ears
      const earL = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 6), jellyGreenMat);
      earL.position.set(-0.55, 3.2, 0);
      const earR = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 6), jellyGreenMat);
      earR.position.set(0.55, 3.2, 0);

      // Snout
      const snout = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 6), royalIcingWhiteMat);
      snout.position.set(0, 2.5, 0.6);

      bearGroup.add(body, head, earL, earR, snout);
      bearGroup.position.set(bearX, 0, bearZ);
      chunk.add(bearGroup);

      registerCollidable(
        `gummy_bear_${cx}_${cz}`,
        'creature',
        new THREE.Vector3(originX + bearX, 1.5, originZ + bearZ),
        2.2,
        bearGroup,
        'minor',
        false,
        undefined,
        { sound: 'squish' }
      );
    }

    // 7. MUSICAL GUMMY MELODY COINS (Chains along the wafer path)
    if (rand(50) > 0.3) {
      const startZ = 10 + rand(51) * (chunkSize - 35);
      const offset = (rand(52) - 0.5) * 2.5;

      for (let c = 0; c < 4; c++) {
        const coinZ = startZ + c * 4.5;
        const coinGroup = new THREE.Group();
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.35, 16), sugarCoinMat);
        const star = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.42, 0),
          new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xf472b6, emissiveIntensity: 0.5 })
        );
        star.position.y = 0.22;
        star.scale.set(1.1, 0.3, 1.1);
        coinGroup.add(disc, star);
        coinGroup.rotation.x = 0.85; // Tilt up toward camera!
        coinGroup.position.set(chunkSize / 2 + offset, 0.9, coinZ);
        chunk.add(coinGroup);

        registerCollidable(
          `candy_coin_${cx}_${cz}_${c}`,
          'coin',
          new THREE.Vector3(originX + chunkSize / 2 + offset, 0.9, originZ + coinZ),
          1.5,
          coinGroup,
          'minor',
          false,
          undefined,
          { noteIndex: (cz * 4 + c) % 8 }
        );
      }
    }

    // 8. SURPRISE CANDY MYSTERY BOX
    if (rand(60) > 0.5) {
      const boxX = chunkSize / 2 + (rand(61) > 0.5 ? 2.0 : -2.0);
      const boxZ = 15 + rand(62) * (chunkSize - 30);

      const boxGroup = new THREE.Group();
      const cube = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), mysteryCandyBoxMat);
      cube.position.y = 1.0;
      cube.castShadow = true;

      const ribbon = new THREE.Mesh(
        new THREE.BoxGeometry(1.24, 0.3, 1.24),
        royalIcingWhiteMat
      );
      ribbon.position.y = 1.0;
      boxGroup.add(cube, ribbon);

      boxGroup.position.set(boxX, 0, boxZ);
      chunk.add(boxGroup);

      registerCollidable(
        `candy_mystery_${cx}_${cz}`,
        'mystery_box',
        new THREE.Vector3(originX + boxX, 1.0, originZ + boxZ),
        1.8,
        boxGroup,
        'minor',
        false
      );
    }

    // 9. RAINBOW SUGAR DONUT HOOPS IN THE AIR
    // Huge floating sugar donuts to fly/jump through
    for (let r = 0; r < 2; r++) {
      const donutX = 8 + rand(70 + r) * (chunkSize - 16);
      const donutZ = 8 + rand(75 + r) * (chunkSize - 16);
      const donutY = 12 + rand(80 + r) * 14;

      const donutGroup = new THREE.Group();
      donutGroup.name = 'donut_hoop';

      const ring = new THREE.Mesh(new THREE.TorusGeometry(3.0, 0.65, 12, 24), waferRoadMat);
      const glaze = new THREE.Mesh(new THREE.TorusGeometry(3.0, 0.68, 12, 24), marshmallowPinkMat);
      glaze.scale.set(1.01, 1.01, 1.01);
      donutGroup.add(ring, glaze);

      donutGroup.position.set(donutX, donutY, donutZ);
      chunk.add(donutGroup);

      registerCollidable(
        `donut_ring_${cx}_${cz}_${r}`,
        'star_ring',
        new THREE.Vector3(originX + donutX, donutY, originZ + donutZ),
        3.8,
        donutGroup,
        'minor',
        true
      );
    }

    // 10. PROCEDURAL STARGATE WARP PORTAL (High Frequency for Exciting Exploration!)
    if (rand(90) > 0.35 && availableWorldIds.length > 1) {
      const otherWorlds = availableWorldIds.filter((w) => w !== 'candyland_toyland');
      const targetWorldId = otherWorlds[Math.floor(rand(91) * otherWorlds.length)];

      const portalX = chunkSize / 2 + (rand(92) > 0.6 ? 2.8 : rand(92) < 0.4 ? -2.8 : 0);
      const portalZ = 12 + rand(93) * (chunkSize - 24);

      const portalGroup = new THREE.Group();
      portalGroup.name = 'candy_portal';
      const outerArch = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.55, 16, 32), portalRingMat);
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
    // 1. Spin peppermint pinwheels
    const pinwheel = chunk.getObjectByName('peppermint_wheel');
    if (pinwheel) {
      pinwheel.rotation.z += delta * 3.5;
    }

    // 2. Wobble jelly trampolines
    const jello = chunk.getObjectByName('jelly_trampoline');
    if (jello) {
      const wobble = 1.0 + Math.sin(elapsed * 6) * 0.08;
      jello.scale.set(wobble, 2.0 - wobble, wobble);
    }

    // 3. Wobbly dancing gummy bears
    const bear = chunk.getObjectByName('gummy_bear');
    if (bear) {
      bear.rotation.z = Math.sin(elapsed * 4) * 0.15;
      bear.position.y = Math.abs(Math.sin(elapsed * 4)) * 0.3;
    }

    // 4. Spin donut air hoops
    const donut = chunk.getObjectByName('donut_hoop');
    if (donut) {
      donut.rotation.y += delta * 0.9;
    }
  },
};
