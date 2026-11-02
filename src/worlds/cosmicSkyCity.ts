/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { WorldDefinition } from './types';

// Materials for Cosmic Sky City
const spaceGroundMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.95 }); // Deep dark cosmos floor
const neonCyanRoadMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x0891b2, emissiveIntensity: 0.85, roughness: 0.2 }); // Glowing cyber speedway
const neonPinkMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0xe11d48, emissiveIntensity: 0.95, roughness: 0.2 });
const crystalTowerMat = new THREE.MeshStandardMaterial({ color: 0x818cf8, emissive: 0x4f46e5, emissiveIntensity: 0.65, roughness: 0.1, metalness: 0.8 });
const metalUfoMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.15, metalness: 0.95 });
const tractorBeamMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x16a34a, emissiveIntensity: 0.9, transparent: true, opacity: 0.6 });
const laserFenceMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x22d3ee, emissiveIntensity: 0.95, transparent: true, opacity: 0.75 });
const cyberCoinMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 1.0, metalness: 0.9, roughness: 0.1 });
const magneticBoostMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x38bdf8, emissiveIntensity: 1.2, roughness: 0.2 });
const repulsorJumpMat = new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0x9333ea, emissiveIntensity: 1.1, roughness: 0.2 });
const robotMetalMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.8, roughness: 0.2 });
const robotEyeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
const mysteryCosmicBoxMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0xbe123c, emissiveIntensity: 0.95, roughness: 0.2 });
const portalRingMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x22d3ee, emissiveIntensity: 1.0, roughness: 0.2 });
const portalVortexMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0xfb7185, emissiveIntensity: 0.9, transparent: true, opacity: 0.85 });

export const cosmicSkyCityWorld: WorldDefinition = {
  id: 'cosmic_sky_city',
  name: 'Cosmic Sky City',
  subtitle: 'UFO Tractor Beams, Magnetic Hyper-Boosters, Cyber Rings & Robot Droids',
  skyColor: 0x090514,
  fogColor: 0x1e1b4b,
  groundColor: 0x090d16,
  roadColor: 0x06b6d4,
  ambientLightColor: 0x818cf8,
  sunLightColor: 0x67e8f9,
  particleType: 'stars',
  particleColor: 0x38bdf8, // Twinkling cyan & white cosmic star dust

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
    // 1. HOVERING UFO FLYING SAUCER WITH GREEN TRACTOR BEAM!
    // Flying saucer hovering directly over the road with a glowing tractor beam cone
    if (cz % 3 === 0 && rand(1) > 0.35) {
      const ufoZ = chunkSize / 2;
      const ufoGroup = new THREE.Group();
      ufoGroup.name = 'hovering_ufo';

      // Disk hull
      const disk = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 5.0, 0.9, 18), metalUfoMat);
      disk.position.y = 8.0;
      disk.castShadow = true;

      // Glowing cockpit dome
      const dome = new THREE.Mesh(new THREE.SphereGeometry(2.0, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), neonCyanRoadMat);
      dome.position.y = 8.4;
      dome.castShadow = true;

      // Ring of colored perimeter lights
      for (let l = 0; l < 8; l++) {
        const lightAngle = (l * Math.PI * 2) / 8;
        const pLight = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 6), l % 2 === 0 ? neonPinkMat : neonCyanRoadMat);
        pLight.position.set(Math.cos(lightAngle) * 4.6, 8.0, Math.sin(lightAngle) * 4.6);
        ufoGroup.add(pLight);
      }

      // Translucent glowing green tractor beam cone reaching down to road
      const beam = new THREE.Mesh(new THREE.ConeGeometry(3.6, 7.8, 16, 1, true), tractorBeamMat);
      beam.position.y = 4.0;
      beam.name = 'tractor_beam';

      ufoGroup.add(disk, dome, beam);
      ufoGroup.position.set(chunkSize / 2, 0, ufoZ);
      chunk.add(ufoGroup);

      // Driving through the tractor beam gives an anti-gravity super bounce lift!
      registerCollidable(
        `ufo_beam_${cx}_${cz}`,
        'jump_pad',
        new THREE.Vector3(originX + chunkSize / 2, 2.0, originZ + ufoZ),
        3.5,
        beam,
        'minor',
        false,
        undefined,
        { sound: 'ufo' }
      );
    }

    // 2. MAGNETIC HYPER-SPEED BOOST CHUTE
    // Sci-fi neon accelerator gate spanning across the speedway
    if (rand(10) > 0.35) {
      const boostZ = 10 + rand(11) * (chunkSize - 20);
      const chuteGroup = new THREE.Group();

      const arch = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.45, 8, 24, Math.PI), magneticBoostMat);
      arch.position.y = 0.1;

      // Floor arrows
      const base = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.08, 4.0), neonPinkMat);
      base.position.y = 0.04;

      const arrowGeo = new THREE.ConeGeometry(0.75, 1.3, 3);
      arrowGeo.rotateX(Math.PI / 2);
      [-0.9, 0, 0.9].forEach((zOff) => {
        const arrow = new THREE.Mesh(arrowGeo, magneticBoostMat);
        arrow.position.set(0, 0.1, zOff);
        chuteGroup.add(arrow);
      });

      chuteGroup.add(arch, base);
      chuteGroup.position.set(chunkSize / 2, 0, boostZ);
      chunk.add(chuteGroup);

      registerCollidable(
        `cosmic_boost_${cx}_${cz}`,
        'boost_pad',
        new THREE.Vector3(originX + chunkSize / 2, 0.3, originZ + boostZ),
        3.0,
        chuteGroup,
        'minor',
        false
      );
    }

    // 3. ANTI-GRAVITY REPULSOR JUMP PAD
    // Pulsing cyber disc that flings vehicles 22m high
    if (rand(20) > 0.4) {
      const repZ = 12 + rand(21) * (chunkSize - 24);
      const repGroup = new THREE.Group();
      repGroup.name = 'repulsor_disc';

      const ringOuter = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.4, 8, 18), repulsorJumpMat);
      ringOuter.rotation.x = Math.PI / 2;
      ringOuter.position.y = 0.2;

      const core = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.3, 16), neonCyanRoadMat);
      core.position.y = 0.15;

      repGroup.add(ringOuter, core);
      repGroup.position.set(chunkSize / 2, 0, repZ);
      chunk.add(repGroup);

      registerCollidable(
        `repulsor_${cx}_${cz}`,
        'jump_pad',
        new THREE.Vector3(originX + chunkSize / 2, 0.5, originZ + repZ),
        2.6,
        repGroup,
        'minor',
        false
      );
    }

    // 4. NEON LASER GUARD RAILS
    const laserStep = 8;
    for (let z = 4; z < chunkSize - 4; z += laserStep) {
      [-4.8, 4.8].forEach((xOff) => {
        const pylon = new THREE.Group();
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.6, 8), metalUfoMat);
        post.position.y = 0.8;
        const orb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), neonCyanRoadMat);
        orb.position.y = 1.7;
        const beamRail = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 7.8, 6), laserFenceMat);
        beamRail.rotation.x = Math.PI / 2;
        beamRail.position.set(0, 1.2, 0);

        pylon.add(post, orb, beamRail);
        pylon.position.set(chunkSize / 2 + xOff, 0, z);
        chunk.add(pylon);

        registerCollidable(
          `laser_fence_${cx}_${cz}_${xOff}_${z}`,
          'crystal',
          new THREE.Vector3(originX + chunkSize / 2 + xOff, 1.0, originZ + z),
          1.4,
          pylon,
          'minor',
          false
        );
      });
    }

    // 5. GLOWING CRYSTAL SPACE SPIRES
    if (rand(30) > 0.45) {
      const sX = rand(31) > 0.5 ? 16 : chunkSize - 16;
      const sZ = 12 + rand(32) * (chunkSize - 24);

      const spireGroup = new THREE.Group();
      spireGroup.name = 'crystal_spire';

      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 2.2, 10.0, 6), crystalTowerMat);
      tower.position.set(0, 5.0, 0);
      tower.castShadow = true;

      const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(1.4), neonPinkMat);
      beacon.position.set(0, 11.0, 0);
      beacon.name = 'spire_beacon';

      spireGroup.add(tower, beacon);
      spireGroup.position.set(sX, 0, sZ);
      chunk.add(spireGroup);

      registerCollidable(
        `spire_${cx}_${cz}`,
        'crystal',
        new THREE.Vector3(originX + sX, 5.0, originZ + sZ),
        4.0,
        spireGroup,
        'major',
        false
      );
    }

    // 6. FLOATING ROBOT ASSISTANT DROIDS!
    // Friendly hovering spherical robots with blinking cyan eyes that cheer
    if (rand(40) > 0.4) {
      const botX = rand(41) > 0.5 ? 9.5 : chunkSize - 9.5;
      const botZ = 10 + rand(42) * (chunkSize - 20);

      const botGroup = new THREE.Group();
      botGroup.name = 'helper_droid';

      const head = new THREE.Mesh(new THREE.SphereGeometry(1.0, 16, 16), robotMetalMat);
      head.position.y = 2.0;

      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 12), robotEyeMat);
      eye.position.set(0, 2.0, 0.85);

      const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 6), metalUfoMat);
      antenna.position.set(0, 3.2, 0);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), neonPinkMat);
      tip.position.set(0, 3.7, 0);

      botGroup.add(head, eye, antenna, tip);
      botGroup.position.set(botX, 0, botZ);
      chunk.add(botGroup);

      registerCollidable(
        `robot_droid_${cx}_${cz}`,
        'creature',
        new THREE.Vector3(originX + botX, 2.0, originZ + botZ),
        2.2,
        botGroup,
        'minor',
        false,
        undefined,
        { sound: 'ufo' }
      );
    }

    // 7. MUSICAL CYBER CHIP COINS (Ascending Major Scale!)
    if (rand(50) > 0.3) {
      const startZ = 10 + rand(51) * (chunkSize - 35);
      const offset = (rand(52) - 0.5) * 2.6;

      for (let c = 0; c < 4; c++) {
        const coinZ = startZ + c * 4.5;
        const chipGeo = new THREE.BoxGeometry(0.9, 0.14, 0.9);
        const chip = new THREE.Mesh(chipGeo, cyberCoinMat);
        chip.position.set(chunkSize / 2 + offset, 0.9, coinZ);
        chip.rotation.y = Math.PI / 4;
        chunk.add(chip);

        registerCollidable(
          `cyber_coin_${cx}_${cz}_${c}`,
          'coin',
          new THREE.Vector3(originX + chunkSize / 2 + offset, 0.9, originZ + coinZ),
          1.4,
          chip,
          'minor',
          false,
          undefined,
          { noteIndex: (cz * 4 + c) % 8 }
        );
      }
    }

    // 8. SURPRISE COSMIC MYSTERY BOX
    if (rand(60) > 0.5) {
      const boxX = chunkSize / 2 + (rand(61) > 0.5 ? 2.0 : -2.0);
      const boxZ = 15 + rand(62) * (chunkSize - 30);

      const boxGroup = new THREE.Group();
      const cube = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), mysteryCosmicBoxMat);
      cube.position.y = 1.0;
      cube.castShadow = true;

      const ribbon = new THREE.Mesh(
        new THREE.BoxGeometry(1.24, 0.3, 1.24),
        neonCyanRoadMat
      );
      ribbon.position.y = 1.0;
      boxGroup.add(cube, ribbon);

      boxGroup.position.set(boxX, 0, boxZ);
      chunk.add(boxGroup);

      registerCollidable(
        `cosmic_mystery_${cx}_${cz}`,
        'mystery_box',
        new THREE.Vector3(originX + boxX, 1.0, originZ + boxZ),
        1.8,
        boxGroup,
        'minor',
        false
      );
    }

    // 9. CYBER QUANTUM RINGS IN THE SKY
    for (let r = 0; r < 2; r++) {
      const ringX = 8 + rand(70 + r) * (chunkSize - 16);
      const ringZ = 8 + rand(75 + r) * (chunkSize - 16);
      const ringY = 12 + rand(80 + r) * 14;

      const ringGroup = new THREE.Group();
      ringGroup.name = 'quantum_ring';

      const ringOuter = new THREE.Mesh(new THREE.TorusGeometry(2.8, 0.35, 12, 24), neonCyanRoadMat);
      const ringInner = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.25, 12, 24), neonPinkMat);
      ringInner.rotation.x = Math.PI / 4;
      ringGroup.add(ringOuter, ringInner);

      ringGroup.position.set(ringX, ringY, ringZ);
      chunk.add(ringGroup);

      registerCollidable(
        `quantum_ring_${cx}_${cz}_${r}`,
        'star_ring',
        new THREE.Vector3(originX + ringX, ringY, originZ + ringZ),
        3.4,
        ringGroup,
        'minor',
        true
      );
    }

    // 10. PROCEDURAL STARGATE WARP PORTAL
    if (rand(90) > 0.75 && availableWorldIds.length > 1) {
      const otherWorlds = availableWorldIds.filter((w) => w !== 'cosmic_sky_city');
      const targetWorldId = otherWorlds[Math.floor(rand(91) * otherWorlds.length)];

      const portalX = chunkSize / 2 + (rand(92) > 0.5 ? 9.5 : -9.5);
      const portalZ = 15 + rand(93) * (chunkSize - 30);

      const portalGroup = new THREE.Group();
      portalGroup.name = 'cosmic_portal';
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
    // 1. Spin hovering UFO & pulse tractor beam
    const ufo = chunk.getObjectByName('hovering_ufo');
    if (ufo) {
      ufo.rotation.y += delta * 1.2;
      ufo.position.y = Math.sin(elapsed * 2) * 0.4;
    }

    // 2. Pulse crystal spire beacon
    const beacon = chunk.getObjectByName('spire_beacon');
    if (beacon) {
      beacon.rotation.y += delta * 2.0;
      beacon.rotation.x += delta * 1.0;
    }

    // 3. Hovering helper robot droid bob and look
    const droid = chunk.getObjectByName('helper_droid');
    if (droid) {
      droid.position.y = Math.sin(elapsed * 3) * 0.25;
      droid.rotation.y = Math.sin(elapsed * 1.5) * 0.4;
    }

    // 4. Spin quantum rings
    const qRing = chunk.getObjectByName('quantum_ring');
    if (qRing) {
      qRing.rotation.z += delta * 1.4;
      qRing.rotation.y += delta * 0.7;
    }
  },
};
