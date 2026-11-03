/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { WorldModule } from './types';

const rampWoodMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.6 });
const flameYellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xfacc15, emissiveIntensity: 0.5 });
const ringGoldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.8, roughness: 0.2 });

function createStuntRamp(): THREE.Group {
  const rampGroup = new THREE.Group();
  rampGroup.name = 'stunt_ramp_structure';

  // Curved inclined ramp wedge
  const rampGeo = new THREE.BoxGeometry(4.8, 1.6, 5.0);
  rampGeo.rotateX(-Math.PI / 8);
  const ramp = new THREE.Mesh(rampGeo, rampWoodMat);
  ramp.position.set(0, 0.7, 0);
  ramp.castShadow = true;
  rampGroup.add(ramp);

  // Flame deco strips on side
  [-2.42, 2.42].forEach((fx) => {
    const flameGeo = new THREE.PlaneGeometry(3.5, 0.6);
    const flame = new THREE.Mesh(flameGeo, flameYellowMat);
    flame.rotation.y = fx > 0 ? Math.PI / 2 : -Math.PI / 2;
    flame.rotation.z = -Math.PI / 8;
    flame.position.set(fx, 0.7, 0);
    rampGroup.add(flame);
  });

  // Floating Stunt Target Ring above the ramp
  const ringGeo = new THREE.TorusGeometry(2.2, 0.22, 12, 24);
  const ring = new THREE.Mesh(ringGeo, ringGoldMat);
  ring.name = 'stunt_target_ring';
  ring.position.set(0, 5.5, 5.0);
  rampGroup.add(ring);

  return rampGroup;
}

export const stuntRampsModule: WorldModule = {
  id: 'stunt_ramps',
  name: 'Mega Stunt Ramps',
  subtitle: 'Daredevil launch ramps with flame decals',
  description: 'Spawns wooden launch ramps with blazing flame decals and hovering golden target rings that launch your car high into the clouds!',
  icon: 'Flame',
  category: 'stunts',
  defaultEnabled: true,
  aiPromptIdea: 'Generate extreme stunt jump ramps with loop-de-loops and fiery target rings.',

  spawnChunk: (chunk, cx, cz, originX, originZ, chunkSize, density, rand, registerCollidable) => {
    if (rand(150) > 0.6) {
      const rampZ = 14 + rand(151) * (chunkSize - 28);
      const rampX = chunkSize / 2 + (rand(152) > 0.5 ? 4.2 : -4.2);

      const ramp = createStuntRamp();
      ramp.position.set(rampX, 0, rampZ);
      ramp.rotation.y = rand(153) > 0.5 ? 0 : Math.PI;
      chunk.add(ramp);

      registerCollidable(
        `stunt_ramp_${cx}_${cz}`,
        'stunt_ramp',
        new THREE.Vector3(originX + rampX, 1.2, originZ + rampZ),
        3.0,
        ramp,
        'minor',
        false,
        undefined,
        { sound: 'whoosh' }
      );
    }
  },

  tickModule: (delta, elapsed, carPos, chunk) => {
    // Spin floating stunt target rings
    chunk.traverse((child) => {
      if (child.name === 'stunt_target_ring') {
        child.rotation.z += delta * 2.0;
        child.scale.setScalar(1.0 + Math.sin(elapsed * 4) * 0.08);
      }
    });
  },
};
