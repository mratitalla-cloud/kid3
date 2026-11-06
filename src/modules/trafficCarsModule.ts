/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { WorldModule } from './types';

// Materials for NPC Traffic Cars
const yellowCabMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3, metalness: 0.1 });
const redDeliveryMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.35 });
const cyanBeetleMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.3 });
const glassMat = new THREE.MeshStandardMaterial({ color: 0x93c5fd, roughness: 0.1, transparent: true, opacity: 0.7 });
const bumperMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8, roughness: 0.2 });
const tireMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
const wheelRimMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
const headlightMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfde047, emissiveIntensity: 0.6 });

function createNpcToyCar(typeIndex: number): THREE.Group {
  const car = new THREE.Group();
  car.name = 'npc_traffic_car';

  const bodyMat = typeIndex === 0 ? yellowCabMat : typeIndex === 1 ? redDeliveryMat : cyanBeetleMat;

  // Main chassis
  const chassisGeo = new THREE.BoxGeometry(2.1, 0.75, 3.8);
  const chassis = new THREE.Mesh(chassisGeo, bodyMat);
  chassis.position.y = 0.65;
  chassis.castShadow = true;
  car.add(chassis);

  // Cabin
  const cabinGeo = new THREE.BoxGeometry(1.8, 0.75, 2.0);
  const cabin = new THREE.Mesh(cabinGeo, bodyMat);
  cabin.position.set(0, 1.35, -0.2);
  cabin.castShadow = true;
  car.add(cabin);

  // Windshield & windows
  const frontWindshieldGeo = new THREE.PlaneGeometry(1.6, 0.65);
  frontWindshieldGeo.rotateX(-Math.PI / 6);
  const frontWindshield = new THREE.Mesh(frontWindshieldGeo, glassMat);
  frontWindshield.position.set(0, 1.35, -1.22);
  car.add(frontWindshield);

  // Bumpers
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.25, 0.3), bumperMat);
  frontBumper.position.set(0, 0.45, -1.95);
  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.25, 0.3), bumperMat);
  rearBumper.position.set(0, 0.45, 1.95);
  car.add(frontBumper, rearBumper);

  // Headlights
  [-0.65, 0.65].forEach((hx) => {
    const light = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.1, 10), headlightMat);
    light.rotation.x = Math.PI / 2;
    light.position.set(hx, 0.7, -1.92);
    car.add(light);
  });

  // Taxi sign for yellow cab
  if (typeIndex === 0) {
    const taxiSign = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.22, 0.35),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfef08a, emissiveIntensity: 0.5 })
    );
    taxiSign.position.set(0, 1.82, -0.2);
    car.add(taxiSign);
  }

  // 4 Rolling wheels
  const wheelsGroup = new THREE.Group();
  wheelsGroup.name = 'npc_car_wheels';
  const tireGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.35, 12);
  tireGeo.rotateZ(Math.PI / 2);

  const wheelPositions = [
    [-1.05, 0.38, -1.1],
    [1.05, 0.38, -1.1],
    [-1.05, 0.38, 1.1],
    [1.05, 0.38, 1.1],
  ];

  wheelPositions.forEach(([wx, wy, wz]) => {
    const wheel = new THREE.Group();
    const tire = new THREE.Mesh(tireGeo, tireMat);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.37, 8), wheelRimMat);
    rim.rotateZ(Math.PI / 2);
    wheel.add(tire, rim);
    wheel.position.set(wx, wy, wz);
    wheelsGroup.add(wheel);
  });
  car.add(wheelsGroup);

  return car;
}

import { BUILTIN_VEHICLES } from '../vehicles/roster';

export const trafficCarsModule: WorldModule = {
  id: 'traffic_cars',
  name: 'Toy City Traffic',
  subtitle: 'Smashable NPC cars that shatter into parts or become drivable!',
  description: 'Spawns friendly NPC vehicles (Police, Fire Truck, Ice Cream Van, Monster Truck, Digger, Roadsters) cruising along lanes. Ram into them to start driving them!',
  icon: 'Car',
  category: 'traffic',
  defaultEnabled: true,
  aiPromptIdea: 'Generate toy town traffic with smart lane routing and colorful cartoon models.',

  spawnChunk: (chunk, cx, cz, originX, originZ, chunkSize, density, rand, registerCollidable) => {
    // Spawn 1-2 NPC cars per chunk near road lanes
    if (rand(110) > 0.3) {
      const numCars = rand(111) > 0.6 ? 2 : 1;
      const rosterGround = BUILTIN_VEHICLES.filter(v => v.type === 'ground');

      for (let i = 0; i < numCars; i++) {
        const vehicleIdx = Math.floor(rand(112 + i) * rosterGround.length);
        const chosenVehicle = rosterGround[vehicleIdx] || rosterGround[0];

        const laneOffset = (i === 0 ? -1.8 : 1.8) + (rand(113 + i) - 0.5) * 0.4;
        const carZ = 8 + rand(114 + i) * (chunkSize - 16);

        // Instantiate the vehicle 3D model
        const bundle = chosenVehicle.create3D();
        const carGroup = bundle.root;
        carGroup.name = 'npc_traffic_car';

        // Alternate directions
        const headingDirection = i === 0 ? 1 : -1;
        carGroup.rotation.y = headingDirection === 1 ? 0 : Math.PI;
        carGroup.position.set(chunkSize / 2 + laneOffset, 0, carZ);
        carGroup.userData = {
          speed: (6 + rand(115 + i) * 5) * headingDirection,
          laneOffset,
          chunkSize,
          minZ: 2,
          maxZ: chunkSize - 2,
          type: 'traffic_car',
          vehicleId: chosenVehicle.id,
          wheels: bundle.wheels,
        };

        chunk.add(carGroup);

        registerCollidable(
          `traffic_car_${cx}_${cz}_${i}`,
          'traffic_car',
          new THREE.Vector3(originX + chunkSize / 2 + laneOffset, 0.7, originZ + carZ),
          2.6,
          carGroup,
          'major',
          false,
          undefined,
          { sound: 'honk', speed: 8, vehicleId: chosenVehicle.id }
        );
      }
    }
  },

  tickModule: (delta, elapsed, carPos, chunk) => {
    // Animate NPC traffic cars driving forward along chunks
    chunk.traverse((child) => {
      if (child.name === 'npc_traffic_car' && child.userData.speed !== undefined) {
        const spd = child.userData.speed;
        child.position.z += spd * delta;

        // Loop within chunk bounds
        const maxZ = child.userData.maxZ || 68;
        const minZ = child.userData.minZ || 2;
        if (child.position.z > maxZ) {
          child.position.z = minZ;
        } else if (child.position.z < minZ) {
          child.position.z = maxZ;
        }

        // Spin wheels
        const roll = (spd / 0.4) * delta;
        if (child.userData.wheels && Array.isArray(child.userData.wheels)) {
          child.userData.wheels.forEach((w: THREE.Object3D) => {
            w.rotation.x += roll;
          });
        } else {
          const wheels = child.getObjectByName('npc_car_wheels');
          if (wheels) {
            wheels.children.forEach((w) => {
              w.rotation.x += roll;
            });
          }
        }
      }
    });
  },
};
