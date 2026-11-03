/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { WorldDefinition } from './types';

// Materials for Dino Safari
const jungleGroundMat = new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.85 }); // Dense prehistoric moss
const mudTrailMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.95 }); // Deep wet jungle mud
const rockVolcanoMat = new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.85 });
const lavaOrangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xea580c, emissiveIntensity: 1.2, roughness: 0.2 });
const palmWoodMat = new THREE.MeshStandardMaterial({ color: 0x573212, roughness: 0.8 });
const palmLeafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.5 });
const boneWhiteMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.4 });
const dinoSkinGreenMat = new THREE.MeshStandardMaterial({ color: 0x047857, roughness: 0.65 });
const dinoSkinUnderbellyMat = new THREE.MeshStandardMaterial({ color: 0xa7f3d0, roughness: 0.6 });
const amberCoinMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.9, metalness: 0.8, roughness: 0.2 });
const geyserSteamMat = new THREE.MeshStandardMaterial({ color: 0x67e8f9, emissive: 0x06b6d4, emissiveIntensity: 0.8, transparent: true, opacity: 0.85 });
const fireBoostMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 1.1, roughness: 0.2 });
const eggShellMat = new THREE.MeshStandardMaterial({ color: 0xfef9c3, roughness: 0.5 });
const eggSpotMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.6 });
const mysteryDinoBoxMat = new THREE.MeshStandardMaterial({ color: 0xeab308, emissive: 0xca8a04, emissiveIntensity: 0.9, roughness: 0.2 });
const portalRingMat = new THREE.MeshStandardMaterial({ color: 0xeab308, emissive: 0xf59e0b, emissiveIntensity: 0.95, roughness: 0.2 });
const portalVortexMat = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x34d399, emissiveIntensity: 0.85, transparent: true, opacity: 0.8 });

export const dinoSafariWorld: WorldDefinition = {
  id: 'dino_safari',
  name: 'Prehistoric Dino Safari',
  subtitle: 'Giant Brontosaurus, Erupting Volcano, Steam Geysers & Fossil Rib Tunnels',
  skyColor: 0xfdba74,
  fogColor: 0xfed7aa,
  groundColor: 0x4d7c0f,
  roadColor: 0x78350f,
  ambientLightColor: 0xffedd5,
  sunLightColor: 0xffedd5,
  particleType: 'embers',
  particleColor: 0xf97316, // Rising floating fire embers

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
    // 1. GIANT ANIMATED BRONTOSAURUS STRADDLING OVER THE ROAD!
    // Kids drive directly under its massive belly between its legs!
    if (cz % 3 === 0 && rand(1) > 0.3) {
      const dinoZ = chunkSize / 2;
      const dinoGroup = new THREE.Group();
      dinoGroup.name = 'brontosaurus';

      // Massive Body hovering 3.8m above ground
      const body = new THREE.Mesh(new THREE.BoxGeometry(6.5, 4.0, 7.5), dinoSkinGreenMat);
      body.position.set(0, 5.5, 0);
      body.castShadow = true;

      const underbelly = new THREE.Mesh(new THREE.BoxGeometry(5.8, 1.2, 7.0), dinoSkinUnderbellyMat);
      underbelly.position.set(0, 3.8, 0);

      // 4 Massive Column Legs (leaving wide 6m center road clearance)
      const legGeo = new THREE.CylinderGeometry(0.8, 1.0, 4.5, 8);
      const legFL = new THREE.Mesh(legGeo, dinoSkinGreenMat);
      legFL.position.set(-3.8, 2.25, -2.6);
      const legFR = new THREE.Mesh(legGeo, dinoSkinGreenMat);
      legFR.position.set(3.8, 2.25, -2.6);
      const legBL = new THREE.Mesh(legGeo, dinoSkinGreenMat);
      legBL.position.set(-3.8, 2.25, 2.6);
      const legBR = new THREE.Mesh(legGeo, dinoSkinGreenMat);
      legBR.position.set(3.8, 2.25, 2.6);

      // Long curving neck arching high into the sky
      const neckGroup = new THREE.Group();
      neckGroup.name = 'dino_neck';
      neckGroup.position.set(0, 6.8, -3.5);

      const neckSeg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.9, 4.0, 8), dinoSkinGreenMat);
      neckSeg1.position.set(0, 1.8, -1.0);
      neckSeg1.rotation.x = -0.5;

      const neckSeg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.65, 3.5, 8), dinoSkinGreenMat);
      neckSeg2.position.set(0, 4.2, -2.5);
      neckSeg2.rotation.x = -0.2;

      const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 1.8), dinoSkinGreenMat);
      head.position.set(0, 5.8, -3.2);

      const eyes = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 6), amberCoinMat);
      eyes.position.set(0.6, 6.0, -3.0);
      const eyesL = eyes.clone();
      eyesL.position.x = -0.6;

      neckGroup.add(neckSeg1, neckSeg2, head, eyes, eyesL);

      // Long swaying tail
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.8, 7.0, 8), dinoSkinGreenMat);
      tail.name = 'dino_tail';
      tail.position.set(0, 5.5, 5.5);
      tail.rotation.x = 1.3;

      dinoGroup.add(body, underbelly, legFL, legFR, legBL, legBR, neckGroup, tail);
      dinoGroup.position.set(chunkSize / 2, 0, dinoZ);
      chunk.add(dinoGroup);

      // Left legs collision
      registerCollidable(
        `bronto_legs_l_${cx}_${cz}`,
        'dino',
        new THREE.Vector3(originX + chunkSize / 2 - 3.8, 2.0, originZ + dinoZ),
        2.5,
        legFL,
        'major',
        false,
        undefined,
        { sound: 'dino_roar' }
      );
      // Right legs collision
      registerCollidable(
        `bronto_legs_r_${cx}_${cz}`,
        'dino',
        new THREE.Vector3(originX + chunkSize / 2 + 3.8, 2.0, originZ + dinoZ),
        2.5,
        legFR,
        'major',
        false,
        undefined,
        { sound: 'dino_roar' }
      );
    }

    // 2. ACTIVE SMOKING MINI VOLCANO
    if (rand(10) > 0.45) {
      const vX = rand(11) > 0.5 ? 18 : chunkSize - 18;
      const vZ = 12 + rand(12) * (chunkSize - 24);

      const volcanoGroup = new THREE.Group();
      volcanoGroup.name = 'active_volcano';

      // Craggy cone
      const cone = new THREE.Mesh(new THREE.ConeGeometry(7.0, 7.5, 7), rockVolcanoMat);
      cone.position.set(0, 3.75, 0);
      cone.castShadow = true;

      // Glowing pulsing magma crater at the peak
      const crater = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.6, 12), lavaOrangeMat);
      crater.position.set(0, 7.3, 0);
      crater.name = 'lava_crater';

      // Hardened lava drips down the slopes
      const dripGeo = new THREE.ConeGeometry(0.5, 3.5, 4);
      dripGeo.rotateZ(Math.PI);
      const drip1 = new THREE.Mesh(dripGeo, lavaOrangeMat);
      drip1.position.set(2.2, 5.2, 1.2);
      const drip2 = new THREE.Mesh(dripGeo, lavaOrangeMat);
      drip2.position.set(-1.8, 4.8, 1.8);

      volcanoGroup.add(cone, crater, drip1, drip2);
      volcanoGroup.position.set(vX, 0, vZ);
      chunk.add(volcanoGroup);

      registerCollidable(
        `volcano_${cx}_${cz}`,
        'dino',
        new THREE.Vector3(originX + vX, 3.5, originZ + vZ),
        5.2,
        volcanoGroup,
        'major',
        false
      );
    }

    // 3. BUBBLING STEAM GEYSER JUMP SPRINGS
    // Hot volcanic steam geysers in the mud that shoot the car 22m high!
    if (rand(20) > 0.4) {
      const geyserZ = 10 + rand(21) * (chunkSize - 20);
      const geyserGroup = new THREE.Group();
      geyserGroup.name = 'steam_geyser';

      // Rocky steam vent ring
      const ventRing = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.45, 8, 16), rockVolcanoMat);
      ventRing.rotation.x = Math.PI / 2;
      ventRing.position.y = 0.2;

      // Pulsing steam fountain column
      const steamMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.2, 2.2, 12), geyserSteamMat);
      steamMesh.position.y = 1.1;

      geyserGroup.add(ventRing, steamMesh);
      geyserGroup.position.set(chunkSize / 2, 0, geyserZ);
      chunk.add(geyserGroup);

      registerCollidable(
        `geyser_${cx}_${cz}`,
        'jump_pad',
        new THREE.Vector3(originX + chunkSize / 2, 1.0, originZ + geyserZ),
        2.6,
        geyserGroup,
        'minor',
        false
      );
    }

    // 4. PREHISTORIC FIRE CHEVRON TURBO BOOST
    if (rand(30) > 0.4) {
      const boostZ = 8 + rand(31) * (chunkSize - 16);
      const boostGroup = new THREE.Group();

      const base = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.08, 3.6), rockVolcanoMat);
      base.position.y = 0.04;

      const arrowGeo = new THREE.ConeGeometry(0.7, 1.2, 3);
      arrowGeo.rotateX(Math.PI / 2);
      [-0.8, 0, 0.8].forEach((zOff) => {
        const arrow = new THREE.Mesh(arrowGeo, fireBoostMat);
        arrow.position.set(0, 0.1, zOff);
        boostGroup.add(arrow);
      });

      boostGroup.add(base);
      boostGroup.position.set(chunkSize / 2, 0, boostZ);
      chunk.add(boostGroup);

      registerCollidable(
        `dino_boost_${cx}_${cz}`,
        'boost_pad',
        new THREE.Vector3(originX + chunkSize / 2, 0.2, originZ + boostZ),
        2.8,
        boostGroup,
        'minor',
        false
      );
    }

    // 5. FOSSIL RIB-CAGE BONE ARCHWAY TUNNEL
    if (rand(40) > 0.5) {
      const ribZ = 12 + rand(41) * (chunkSize - 24);
      const archGroup = new THREE.Group();

      for (let r = 0; r < 4; r++) {
        const ribArch = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.35, 8, 16, Math.PI), boneWhiteMat);
        ribArch.position.set(0, 0.1, r * 2.4 - 3.6);
        archGroup.add(ribArch);
      }

      archGroup.position.set(chunkSize / 2, 0, ribZ);
      chunk.add(archGroup);

      registerCollidable(
        `rib_arch_${cx}_${cz}`,
        'dino',
        new THREE.Vector3(originX + chunkSize / 2, 2.0, originZ + ribZ),
        3.5,
        archGroup,
        'minor',
        false
      );
    }

    // 6. GIANT DINOSAUR EGG NESTS
    if (rand(50) > 0.45) {
      const eggX = rand(51) > 0.5 ? 9.5 : chunkSize - 9.5;
      const eggZ = 10 + rand(52) * (chunkSize - 20);

      const nestGroup = new THREE.Group();
      nestGroup.name = 'dino_nest';

      // Twig nest
      const nest = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.4, 8, 12), palmWoodMat);
      nest.rotation.x = Math.PI / 2;
      nestGroup.add(nest);

      // 3 Speckled Eggs
      const eggGeo = new THREE.SphereGeometry(0.65, 8, 8);
      eggGeo.scale(1.0, 1.35, 1.0);
      [[-0.4, 0.5, 0.3], [0.4, 0.5, 0.2], [0, 0.5, -0.4]].forEach(([ex, ey, ez]) => {
        const egg = new THREE.Mesh(eggGeo, eggShellMat);
        egg.position.set(ex, ey, ez);
        nestGroup.add(egg);
      });

      nestGroup.position.set(eggX, 0, eggZ);
      chunk.add(nestGroup);

      registerCollidable(
        `dino_egg_${cx}_${cz}`,
        'creature',
        new THREE.Vector3(originX + eggX, 0.8, originZ + eggZ),
        2.2,
        nestGroup,
        'minor',
        false,
        undefined,
        { sound: 'dino_roar' }
      );
    }

    // 7. MUSICAL AMBER GEMS (Ascending Scale)
    if (rand(60) > 0.3) {
      const startZ = 10 + rand(61) * (chunkSize - 35);
      const offset = (rand(62) - 0.5) * 2.6;

      for (let c = 0; c < 4; c++) {
        const coinZ = startZ + c * 4.5;
        const gemGroup = new THREE.Group();
        const gemMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.7, 0), amberCoinMat);
        gemMesh.scale.set(1.1, 0.5, 1.1);
        const core = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.35, 0),
          new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfde047, emissiveIntensity: 0.8 })
        );
        gemGroup.add(gemMesh, core);
        gemGroup.rotation.x = 0.85; // 50 deg tilt facing camera!
        gemGroup.position.set(chunkSize / 2 + offset, 0.9, coinZ);
        chunk.add(gemGroup);

        registerCollidable(
          `dino_coin_${cx}_${cz}_${c}`,
          'coin',
          new THREE.Vector3(originX + chunkSize / 2 + offset, 0.9, originZ + coinZ),
          1.5,
          gemGroup,
          'minor',
          false,
          undefined,
          { noteIndex: (cz * 4 + c) % 8 }
        );
      }
    }

    // 8. SURPRISE DINO MYSTERY BOX
    if (rand(70) > 0.5) {
      const boxX = chunkSize / 2 + (rand(71) > 0.5 ? 2.0 : -2.0);
      const boxZ = 15 + rand(72) * (chunkSize - 30);

      const boxGroup = new THREE.Group();
      const cube = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), mysteryDinoBoxMat);
      cube.position.y = 1.0;
      cube.castShadow = true;

      const ribbon = new THREE.Mesh(
        new THREE.BoxGeometry(1.24, 0.3, 1.24),
        boneWhiteMat
      );
      ribbon.position.y = 1.0;
      boxGroup.add(cube, ribbon);

      boxGroup.position.set(boxX, 0, boxZ);
      chunk.add(boxGroup);

      registerCollidable(
        `dino_mystery_${cx}_${cz}`,
        'mystery_box',
        new THREE.Vector3(originX + boxX, 1.0, originZ + boxZ),
        1.8,
        boxGroup,
        'minor',
        false
      );
    }

    // 9. FLYING PTERODACTYLS IN AIR WITH GLOWING HOOPS
    for (let r = 0; r < 2; r++) {
      const pteroX = 8 + rand(80 + r) * (chunkSize - 16);
      const pteroZ = 8 + rand(85 + r) * (chunkSize - 16);
      const pteroY = 12 + rand(90 + r) * 14;

      const pteroGroup = new THREE.Group();
      pteroGroup.name = 'pterodactyl';

      // Wings
      const wingGeo = new THREE.ConeGeometry(0.5, 3.2, 3);
      wingGeo.rotateZ(Math.PI / 2);
      const wingL = new THREE.Mesh(wingGeo, dinoSkinGreenMat);
      wingL.position.x = -1.6;
      const wingR = new THREE.Mesh(wingGeo, dinoSkinGreenMat);
      wingR.position.x = 1.6;
      wingR.rotation.y = Math.PI;

      // Golden Amber Ring carried below
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.35, 12, 24), amberCoinMat);
      ring.position.y = -1.5;

      pteroGroup.add(wingL, wingR, ring);
      pteroGroup.position.set(pteroX, pteroY, pteroZ);
      chunk.add(pteroGroup);

      registerCollidable(
        `ptero_ring_${cx}_${cz}_${r}`,
        'star_ring',
        new THREE.Vector3(originX + pteroX, pteroY - 1.5, originZ + pteroZ),
        3.2,
        pteroGroup,
        'minor',
        true
      );
    }

    // 10. PROCEDURAL STARGATE WARP PORTAL (High Frequency for Exciting Exploration!)
    if (rand(95) > 0.35 && availableWorldIds.length > 1) {
      const otherWorlds = availableWorldIds.filter((w) => w !== 'dino_safari');
      const targetWorldId = otherWorlds[Math.floor(rand(96) * otherWorlds.length)];

      const portalX = chunkSize / 2 + (rand(97) > 0.6 ? 2.8 : rand(97) < 0.4 ? -2.8 : 0);
      const portalZ = 12 + rand(98) * (chunkSize - 24);

      const portalGroup = new THREE.Group();
      portalGroup.name = 'dino_portal';
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
    // 1. Sway Brontosaurus neck and tail
    const neck = chunk.getObjectByName('dino_neck');
    if (neck) {
      neck.rotation.y = Math.sin(elapsed * 1.2) * 0.25;
      neck.rotation.z = Math.cos(elapsed * 1.5) * 0.12;
    }
    const tail = chunk.getObjectByName('dino_tail');
    if (tail) {
      tail.rotation.y = Math.sin(elapsed * 2.0) * 0.4;
    }

    // 2. Pulse volcano crater lava
    const lava = chunk.getObjectByName('lava_crater');
    if (lava) {
      const pulse = 1.0 + Math.sin(elapsed * 5) * 0.15;
      lava.scale.set(pulse, 1.0, pulse);
    }

    // 3. Flap pterodactyl wings
    const ptero = chunk.getObjectByName('pterodactyl');
    if (ptero) {
      ptero.rotation.y += delta * 0.8;
      ptero.position.y += Math.sin(elapsed * 3) * 0.05;
    }

    // 4. Wobble steam geyser
    const geyser = chunk.getObjectByName('steam_geyser');
    if (geyser) {
      const s = 1.0 + Math.sin(elapsed * 8) * 0.15;
      geyser.scale.set(1.0, s, 1.0);
    }
  },
};
