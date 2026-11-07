/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { WorldModule } from './types';

const railWoodTieMat = new THREE.MeshStandardMaterial({ color: 0x5c2e0b, roughness: 0.85 });
const steelRailMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.25 });
const trainBlackMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
const trainRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3 });
const trainGoldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.7, roughness: 0.2 });
const steamWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, transparent: true, opacity: 0.8 });
const signalCrossMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
const signalRedMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.8 });

function createSteamLocomotive(): THREE.Group {
  const train = new THREE.Group();
  train.name = 'npc_steam_train';

  // Locomotive boiler
  const boilerGeo = new THREE.CylinderGeometry(1.0, 1.0, 4.2, 16);
  boilerGeo.rotateX(Math.PI / 2);
  const boiler = new THREE.Mesh(boilerGeo, trainBlackMat);
  boiler.position.set(0, 1.4, 0.4);
  boiler.castShadow = true;
  train.add(boiler);

  // Red cowcatcher grill at front
  const cowcatcherGeo = new THREE.ConeGeometry(1.2, 1.2, 4);
  cowcatcherGeo.rotateY(Math.PI / 4);
  cowcatcherGeo.rotateX(-Math.PI / 2);
  const cowcatcher = new THREE.Mesh(cowcatcherGeo, trainRedMat);
  cowcatcher.position.set(0, 0.6, 2.7);
  train.add(cowcatcher);

  // Cabin
  const cabGeo = new THREE.BoxGeometry(2.2, 2.0, 2.0);
  const cab = new THREE.Mesh(cabGeo, trainRedMat);
  cab.position.set(0, 2.0, -1.8);
  cab.castShadow = true;
  train.add(cab);

  // Smokestack with puffy smoke rings
  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.25, 1.2, 10), trainGoldMat);
  chimney.position.set(0, 2.6, 1.6);
  train.add(chimney);

  // Steam puffs group
  const smokePuffs = new THREE.Group();
  smokePuffs.name = 'train_smoke_puffs';
  for (let s = 0; s < 3; s++) {
    const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45 + s * 0.2, 1), steamWhiteMat);
    puff.position.set(0, 3.2 + s * 0.7, 1.6 - s * 0.5);
    smokePuffs.add(puff);
  }
  train.add(smokePuffs);

  // Headlight
  const headlight = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.25, 12), trainGoldMat);
  headlight.rotation.x = Math.PI / 2;
  headlight.position.set(0, 1.7, 2.5);
  train.add(headlight);

  // Tender coal car behind locomotive
  const tender = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.2, 2.4), trainBlackMat);
  tender.position.set(0, 1.1, -4.2);
  tender.castShadow = true;
  train.add(tender);

  // Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.3, 12);
  wheelGeo.rotateZ(Math.PI / 2);
  [-1.0, 1.0].forEach((wx) => {
    [-1.2, 0.2, 1.6, -3.5, -4.8].forEach((wz) => {
      const wheel = new THREE.Mesh(wheelGeo, trainRedMat);
      wheel.position.set(wx, 0.45, wz);
      train.add(wheel);
    });
  });

  return train;
}

export const trainRailwayModule: WorldModule = {
  id: 'train_railway',
  name: 'Choo-Choo Steam Railway',
  subtitle: 'Animated toy train on click-clack tracks!',
  description: 'Spawns realistic railroad tracks across the terrain with railroad crossing signals, and an animated chugging toy steam train that puffs smoke and blows its whistle!',
  icon: 'Train',
  category: 'railway',
  defaultEnabled: true,
  aiPromptIdea: 'Generate toy railroad tracks with bridges, railway crossings, and steam trains.',

  spawnChunk: (chunk, cx, cz, originX, originZ, chunkSize, density, rand, registerCollidable) => {
    // Continuous East-West Railway Corridor:
    // Placed at fixed trackZ = 28 across chunks with (cz % 2 === 0)
    // Because every chunk in this row places rails from x = 0 to x = chunkSize at z = 28,
    // the tracks connect with 100% seamless continuity across the infinite world!
    const isRailCorridor = (cz % 2 + 2) % 2 === 0;
    if (isRailCorridor) {
      const trackZ = 28;
      const railwayGroup = new THREE.Group();
      railwayGroup.name = 'railway_corridor';

      // 1. Crushed Basalt Ballast Bed (Dark Gravel Foundation that prevents floating)
      const ballastMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.95 });
      const ballastGeo = new THREE.BoxGeometry(chunkSize, 0.14, 4.2);
      const ballast = new THREE.Mesh(ballastGeo, ballastMat);
      ballast.position.set(chunkSize / 2, 0.07, trackZ);
      ballast.receiveShadow = true;
      railwayGroup.add(ballast);

      // 2. Dual Steel Rails spanning the full chunk width from x = 0 to x = chunkSize
      const railGeo = new THREE.BoxGeometry(chunkSize, 0.22, 0.16);
      const northRail = new THREE.Mesh(railGeo, steelRailMat);
      northRail.position.set(chunkSize / 2, 0.24, trackZ - 1.25);
      northRail.castShadow = true;

      const southRail = new THREE.Mesh(railGeo, steelRailMat);
      southRail.position.set(chunkSize / 2, 0.24, trackZ + 1.25);
      southRail.castShadow = true;

      railwayGroup.add(northRail, southRail);

      // 3. Wooden Railroad Ties (Sleepers) placed evenly every 2.4 meters
      const tieGeo = new THREE.BoxGeometry(0.7, 0.16, 3.4);
      const numTies = Math.round(chunkSize / 2.4);
      for (let t = 0; t < numTies; t++) {
        const tie = new THREE.Mesh(tieGeo, railWoodTieMat);
        tie.position.set(t * 2.4 + 1.2, 0.13, trackZ);
        tie.receiveShadow = true;
        railwayGroup.add(tie);
      }

      // 4. Level Roadway Crossing (Where central road at x = chunkSize/2 intersects the tracks)
      const roadCrossingX = chunkSize / 2;
      const postGeo = new THREE.CylinderGeometry(0.12, 0.14, 4.0, 8);
      const crossingPost = new THREE.Mesh(postGeo, signalCrossMat);
      crossingPost.position.set(roadCrossingX + 6.0, 2.0, trackZ + 3.2);
      crossingPost.castShadow = true;

      // X Crossbuck
      const crossArmGeo = new THREE.BoxGeometry(1.8, 0.24, 0.08);
      const arm1 = new THREE.Mesh(crossArmGeo, signalCrossMat);
      arm1.rotation.z = Math.PI / 4;
      arm1.position.set(0, 1.3, 0);

      const arm2 = new THREE.Mesh(crossArmGeo, signalCrossMat);
      arm2.rotation.z = -Math.PI / 4;
      arm2.position.set(0, 1.3, 0);

      crossingPost.add(arm1, arm2);

      // Flashing Red Signal Lights
      const signalLight1 = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), signalRedMat);
      signalLight1.name = 'crossing_light_left';
      signalLight1.position.set(-0.5, 0.65, 0.12);

      const signalLight2 = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), signalRedMat);
      signalLight2.name = 'crossing_light_right';
      signalLight2.position.set(0.5, 0.65, 0.12);

      crossingPost.add(signalLight1, signalLight2);
      railwayGroup.add(crossingPost);

      // Boom Gate (Striped red/white safety arm)
      const gateArmGeo = new THREE.BoxGeometry(5.0, 0.15, 0.1);
      const gateArm = new THREE.Mesh(gateArmGeo, trainRedMat);
      gateArm.position.set(roadCrossingX + 2.5, 1.2, trackZ + 3.0);
      railwayGroup.add(gateArm);

      // 5. Chugging Steam Train: Spawn 1 train every 2 chunks along the continuous line
      const hasTrain = (cx % 2 + 2) % 2 === 0;
      if (hasTrain) {
        const train = createSteamLocomotive();
        // Position along the track
        train.position.set(chunkSize / 2 + (rand(125) - 0.5) * 30, 0, trackZ);
        const trainSpeed = 10.0 * (rand(126) > 0.5 ? 1 : -1);
        train.userData = {
          trackZ,
          speed: trainSpeed,
          chunkSize,
          minX: -chunkSize * 1.5,
          maxX: chunkSize * 2.5,
        };
        // Face direction of travel
        train.rotation.y = trainSpeed > 0 ? -Math.PI / 2 : Math.PI / 2;

        railwayGroup.add(train);

        // Register train as collidable/destructible with generous 5.0m radius
        registerCollidable(
          `train_${cx}_${cz}`,
          'train',
          new THREE.Vector3(originX + train.position.x, 1.5, originZ + trackZ),
          5.0,
          train,
          'major',
          false,
          undefined,
          { sound: 'train_whistle', vehicleId: 'steam_train' }
        );
      }

      chunk.add(railwayGroup);
    }
  },

  tickModule: (delta, elapsed, carPos, chunk) => {
    // 1. Chug the steam train along the railroad tracks
    const train = chunk.getObjectByName('npc_steam_train');
    if (train && train.userData.speed !== undefined && train.visible) {
      const spd = train.userData.speed;
      train.position.x += spd * delta;

      if (train.position.x > train.userData.maxX) {
        train.position.x = train.userData.minX;
      } else if (train.position.x < train.userData.minX) {
        train.position.x = train.userData.maxX;
      }

      // Wobble boiler playfully
      train.rotation.z = Math.sin(elapsed * 12) * 0.03;

      // Animate puffing smoke rings
      const smoke = train.getObjectByName('train_smoke_puffs');
      if (smoke) {
        smoke.children.forEach((puff, idx) => {
          puff.position.y = 3.0 + idx * 0.7 + Math.sin(elapsed * 8 + idx) * 0.3;
          puff.scale.setScalar(1.0 + Math.sin(elapsed * 6 + idx) * 0.25);
        });
      }
    }

    // 2. Alternate flashing crossing lights
    const l1 = chunk.getObjectByName('crossing_light_left');
    const l2 = chunk.getObjectByName('crossing_light_right');
    if (l1 && l2) {
      const flash = Math.sin(elapsed * 6) > 0;
      l1.visible = flash;
      l2.visible = !flash;
    }
  },
};
