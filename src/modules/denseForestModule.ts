/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { WorldModule } from './types';

const pineTrunkMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
const pineNeedlesDarkMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.7 });
const pineNeedlesLightMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.65 });
const fallenLogMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
const mossMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.6 });

function createPineTree(height = 8): THREE.Group {
  const tree = new THREE.Group();

  // Trunk
  const trunkGeo = new THREE.CylinderGeometry(0.35, 0.55, height * 0.45, 8);
  const trunk = new THREE.Mesh(trunkGeo, pineTrunkMat);
  trunk.position.y = (height * 0.45) / 2;
  trunk.castShadow = true;
  tree.add(trunk);

  // 3-tier conical pine canopy
  const tiers = [
    { radius: 2.4, h: 3.2, y: height * 0.35, mat: pineNeedlesDarkMat },
    { radius: 1.8, h: 2.8, y: height * 0.55, mat: pineNeedlesLightMat },
    { radius: 1.2, h: 2.2, y: height * 0.75, mat: pineNeedlesDarkMat },
  ];

  tiers.forEach((t) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(t.radius, t.h, 8), t.mat);
    cone.position.y = t.y;
    cone.castShadow = true;
    tree.add(cone);
  });

  return tree;
}

function createFallenLog(): THREE.Group {
  const logGroup = new THREE.Group();
  logGroup.name = 'destructible_fallen_log';

  // Hollowed / mossy log lying sideways
  const logGeo = new THREE.CylinderGeometry(0.55, 0.65, 5.2, 10);
  logGeo.rotateZ(Math.PI / 2);
  const log = new THREE.Mesh(logGeo, fallenLogMat);
  log.position.y = 0.55;
  log.castShadow = true;
  logGroup.add(log);

  // Patches of green moss
  const moss = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.15, 0.8), mossMat);
  moss.position.set(0, 1.15, 0);
  logGroup.add(moss);

  return logGroup;
}

export const denseForestModule: WorldModule = {
  id: 'dense_forest',
  name: 'Deep Pine Wilderness',
  subtitle: 'Smashable fallen logs & towering evergreens',
  description: 'Fills the landscape with dense clusters of evergreen pine trees and destructible fallen logs across trails that blast into wood planks and bark chips when rammed!',
  icon: 'Trees',
  category: 'nature',
  defaultEnabled: true,
  aiPromptIdea: 'Generate dense enchanted forests with glowing fairy mushrooms and fallen logs.',

  spawnChunk: (chunk, cx, cz, originX, originZ, chunkSize, density, rand, registerCollidable) => {
    // 1. Fallen Logs across side trails (Smashable hurdle!)
    if (rand(130) > 0.4) {
      const logSide = rand(131) > 0.5 ? 1 : -1;
      const logX = chunkSize / 2 + logSide * (4.5 + rand(132) * 2.5);
      const logZ = 10 + rand(133) * (chunkSize - 20);

      const log = createFallenLog();
      log.position.set(logX, 0, logZ);
      log.rotation.y = (rand(134) - 0.5) * 0.6;
      chunk.add(log);

      registerCollidable(
        `log_${cx}_${cz}`,
        'fallen_log',
        new THREE.Vector3(originX + logX, 0.6, originZ + logZ),
        2.5,
        log,
        'major',
        false
      );
    }

    // 2. Dense Pine Tree Groves
    const numPines = Math.floor(6 * density);
    for (let p = 0; p < numPines; p++) {
      const px = 5 + rand(135 + p) * (chunkSize - 10);
      // Keep main road clear
      if (Math.abs(px - chunkSize / 2) > 6.0) {
        const pz = 5 + rand(140 + p) * (chunkSize - 10);
        const height = 6.5 + rand(145 + p) * 4.0;
        const pine = createPineTree(height);
        pine.position.set(px, 0, pz);
        chunk.add(pine);

        registerCollidable(
          `pine_${cx}_${cz}_${p}`,
          'tree',
          new THREE.Vector3(originX + px, 0, originZ + pz),
          2.6,
          pine,
          'minor',
          false
        );
      }
    }
  },
};
