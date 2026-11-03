/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { WorldModule } from './types';

const balloonColors = [0xef4444, 0x3b82f6, 0xfacc15, 0x10b981, 0xa855f7, 0xf43f5e];
const stringMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

function createBalloonCluster(): THREE.Group {
  const cluster = new THREE.Group();
  cluster.name = 'floating_balloon_cluster';

  for (let i = 0; i < 4; i++) {
    const balloonGroup = new THREE.Group();
    const col = balloonColors[i % balloonColors.length];
    const bMat = new THREE.MeshStandardMaterial({
      color: col,
      roughness: 0.2,
      metalness: 0.1,
    });

    // Tear-drop balloon shape
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 12), bMat);
    sphere.scale.set(1.0, 1.25, 1.0);
    sphere.castShadow = true;

    // Knot
    const knot = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.2, 6), bMat);
    knot.rotation.x = Math.PI;
    knot.position.y = -0.9;

    // Hanging string
    const str = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.8, 4), stringMat);
    str.position.y = -1.8;

    balloonGroup.add(sphere, knot, str);

    const angle = (i * Math.PI * 2) / 4;
    const rad = 0.8;
    balloonGroup.position.set(
      Math.cos(angle) * rad,
      1.8 + (i % 2) * 0.6,
      Math.sin(angle) * rad
    );
    cluster.add(balloonGroup);
  }

  return cluster;
}

export const balloonParadeModule: WorldModule = {
  id: 'balloon_parade',
  name: 'Floating Balloon Carnival',
  subtitle: 'Clusters of popping party balloons',
  description: 'Spawns colorful floating helium balloon clusters along trails and in the air. Pop them with your car or plane to release festive confetti bursts!',
  icon: 'PartyPopper',
  category: 'carnival',
  defaultEnabled: true,
  aiPromptIdea: 'Generate carnival balloon arches, confetti cannons, and prize wheels.',

  spawnChunk: (chunk, cx, cz, originX, originZ, chunkSize, density, rand, registerCollidable) => {
    if (rand(160) > 0.5) {
      const bx = chunkSize / 2 + (rand(161) - 0.5) * 5.0;
      const bz = 10 + rand(162) * (chunkSize - 20);
      const isAir = rand(163) > 0.6;
      const height = isAir ? 12.0 + rand(164) * 8.0 : 0.8;

      const cluster = createBalloonCluster();
      cluster.position.set(bx, height, bz);
      chunk.add(cluster);

      registerCollidable(
        `balloon_${cx}_${cz}`,
        'balloon_cluster',
        new THREE.Vector3(originX + bx, height + 1.8, originZ + bz),
        2.2,
        cluster,
        'minor',
        isAir,
        undefined,
        { sound: 'pop' }
      );
    }
  },

  tickModule: (delta, elapsed, carPos, chunk) => {
    // Gently bob balloons in the breeze
    chunk.traverse((child) => {
      if (child.name === 'floating_balloon_cluster') {
        child.position.y += Math.sin(elapsed * 2.5 + child.position.x) * delta * 0.6;
        child.rotation.y += delta * 0.3;
      }
    });
  },
};
