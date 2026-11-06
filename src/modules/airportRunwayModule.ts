/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { WorldModule } from './types';

// Materials
const runwayAsphaltMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85, metalness: 0.1 });
const runwayMarkingMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
const runwayYellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
const towerWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
const towerGlassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.2, metalness: 0.8, transparent: true, opacity: 0.8 });
const radarMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.6 });
const hangarMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.6 });
const windsockOrangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.5 });
const windsockWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
const planeRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 });
const planeYellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
const planeDarkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
const planePropellerMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.3 });
const lightGreenMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.8 });
const lightBlueMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 0.8 });

/**
 * Builds a detailed, cartoon 3D parked biplane resting on its landing wheels
 */
export function createLandedBiplane(): THREE.Group {
  const plane = new THREE.Group();
  plane.name = 'landed_biplane';

  // Fuselage (main red body)
  const bodyGeo = new THREE.BoxGeometry(1.6, 1.4, 4.4);
  const body = new THREE.Mesh(bodyGeo, planeRedMat);
  body.position.set(0, 1.4, 0);
  body.castShadow = true;
  plane.add(body);

  // Rounded nose cone
  const noseGeo = new THREE.ConeGeometry(0.75, 1.2, 12);
  noseGeo.rotateX(-Math.PI / 2);
  const nose = new THREE.Mesh(noseGeo, planeYellowMat);
  nose.position.set(0, 1.4, -2.6);
  plane.add(nose);

  // Spinning Propeller
  const propGroup = new THREE.Group();
  propGroup.name = 'landed_plane_propeller';
  propGroup.position.set(0, 1.4, -3.25);
  const hubGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.25, 8);
  hubGeo.rotateX(Math.PI / 2);
  const hub = new THREE.Mesh(hubGeo, planeYellowMat);
  propGroup.add(hub);

  const bladeGeo = new THREE.BoxGeometry(0.25, 2.4, 0.05);
  const blade1 = new THREE.Mesh(bladeGeo, planePropellerMat);
  propGroup.add(blade1);
  const blade2 = blade1.clone();
  blade2.rotation.z = Math.PI / 2;
  propGroup.add(blade2);
  plane.add(propGroup);

  // Lower Wing
  const lowerWingGeo = new THREE.BoxGeometry(6.4, 0.15, 1.5);
  const lowerWing = new THREE.Mesh(lowerWingGeo, planeYellowMat);
  lowerWing.position.set(0, 1.1, -0.4);
  lowerWing.castShadow = true;
  plane.add(lowerWing);

  // Upper Wing
  const upperWingGeo = new THREE.BoxGeometry(6.8, 0.15, 1.5);
  const upperWing = new THREE.Mesh(upperWingGeo, planeYellowMat);
  upperWing.position.set(0, 2.5, -0.4);
  upperWing.castShadow = true;
  plane.add(upperWing);

  // Wing Struts
  [-2.6, 2.6].forEach((sx) => {
    const strutGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.4, 6);
    const strut1 = new THREE.Mesh(strutGeo, planeRedMat);
    strut1.position.set(sx, 1.8, -0.7);
    plane.add(strut1);
    const strut2 = new THREE.Mesh(strutGeo, planeRedMat);
    strut2.position.set(sx, 1.8, -0.1);
    plane.add(strut2);
  });

  // Cockpit Windshield
  const shieldGeo = new THREE.BoxGeometry(0.9, 0.6, 0.5);
  const shield = new THREE.Mesh(shieldGeo, towerGlassMat);
  shield.position.set(0, 2.2, -0.8);
  plane.add(shield);

  // Tailfin and Horizontal Stabilizers
  const tailGeo = new THREE.BoxGeometry(0.15, 1.3, 1.0);
  const tail = new THREE.Mesh(tailGeo, planeRedMat);
  tail.position.set(0, 2.3, 2.0);
  plane.add(tail);

  const horizTailGeo = new THREE.BoxGeometry(2.4, 0.1, 0.8);
  const horizTail = new THREE.Mesh(horizTailGeo, planeYellowMat);
  horizTail.position.set(0, 1.8, 2.0);
  plane.add(horizTail);

  // Landing Gear Wheels (sitting cleanly on the tarmac)
  [-1.1, 1.1].forEach((wx) => {
    const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.9, 6);
    const leg = new THREE.Mesh(legGeo, planeDarkMat);
    leg.position.set(wx, 0.8, -1.0);
    leg.rotation.z = wx > 0 ? -0.2 : 0.2;
    plane.add(leg);

    const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.25, 12);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheel = new THREE.Mesh(wheelGeo, planeDarkMat);
    wheel.position.set(wx * 1.15, 0.38, -1.0);
    wheel.castShadow = true;
    plane.add(wheel);
  });

  // Tail Skid / Small Rear Wheel
  const rearWheelGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.15, 10);
  rearWheelGeo.rotateZ(Math.PI / 2);
  const rearWheel = new THREE.Mesh(rearWheelGeo, planeDarkMat);
  rearWheel.position.set(0, 0.25, 1.9);
  plane.add(rearWheel);

  return plane;
}

/**
 * Builds an Air Traffic Control Tower with spinning radar
 */
function createControlTower(): THREE.Group {
  const tower = new THREE.Group();
  tower.name = 'airport_control_tower';

  // Tower Base Cylinder
  const baseGeo = new THREE.CylinderGeometry(2.2, 2.6, 9.0, 10);
  const base = new THREE.Mesh(baseGeo, towerWhiteMat);
  base.position.set(0, 4.5, 0);
  base.castShadow = true;
  tower.add(base);

  // Observation Deck Glass Cabin
  const deckGeo = new THREE.CylinderGeometry(3.2, 2.4, 2.2, 12);
  const deck = new THREE.Mesh(deckGeo, towerGlassMat);
  deck.position.set(0, 9.8, 0);
  tower.add(deck);

  // Roof Cap
  const roofGeo = new THREE.ConeGeometry(3.4, 1.2, 12);
  const roof = new THREE.Mesh(roofGeo, towerWhiteMat);
  roof.position.set(0, 11.2, 0);
  tower.add(roof);

  // Spinning Radar Dish on Top
  const radarGroup = new THREE.Group();
  radarGroup.name = 'airport_radar';
  radarGroup.position.set(0, 12.0, 0);

  const mastGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.2, 6);
  const mast = new THREE.Mesh(mastGeo, towerWhiteMat);
  mast.position.set(0, 0.6, 0);
  radarGroup.add(mast);

  const dishGeo = new THREE.CylinderGeometry(1.2, 0.8, 0.25, 12, 1, false, 0, Math.PI);
  dishGeo.rotateX(Math.PI / 2);
  dishGeo.rotateZ(Math.PI / 4);
  const dish = new THREE.Mesh(dishGeo, radarMat);
  dish.position.set(0, 1.4, 0);
  radarGroup.add(dish);

  tower.add(radarGroup);
  return tower;
}

/**
 * Builds an Airport Hangar with open arch door
 */
function createHangar(): THREE.Group {
  const hangar = new THREE.Group();
  hangar.name = 'airport_hangar';

  const archGeo = new THREE.CylinderGeometry(5.5, 5.5, 12.0, 16, 1, false, 0, Math.PI);
  archGeo.rotateZ(-Math.PI / 2);
  const arch = new THREE.Mesh(archGeo, hangarMat);
  arch.position.set(0, 0, 0);
  arch.castShadow = true;
  hangar.add(arch);

  return hangar;
}

/**
 * Builds a fluttery orange-and-white windsock
 */
function createWindsock(): THREE.Group {
  const sockGroup = new THREE.Group();
  sockGroup.name = 'airport_windsock';

  const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, 5.0, 8);
  const pole = new THREE.Mesh(poleGeo, towerWhiteMat);
  pole.position.set(0, 2.5, 0);
  sockGroup.add(pole);

  // Striped cone sock
  const sockGeo = new THREE.ConeGeometry(0.45, 2.2, 8);
  sockGeo.rotateX(-Math.PI / 2);
  const sock = new THREE.Mesh(sockGeo, windsockOrangeMat);
  sock.name = 'windsock_fabric';
  sock.position.set(0, 4.8, 1.0);
  sockGroup.add(sock);

  return sockGroup;
}

export const airportRunwayModule: WorldModule = {
  id: 'airport_runway',
  name: 'Airport Runway & Landed Biplanes',
  subtitle: 'Tarmac airstrip, control tower, and parked biplanes',
  description:
    'A full airport airstrip with painted runway stripes, glowing edge lights, observation control tower, and real parked biplanes that toddlers can drive right into and take to the skies!',
  icon: 'Plane',
  category: 'traffic',
  defaultEnabled: true,
  aiPromptIdea: 'Airport runway with landing lights, hangars, windsocks, and landed biplanes parked on tarmac.',

  spawnChunk: (chunk, cx, cz, originX, originZ, chunkSize, density, rand, registerCollidable) => {
    // Spawn an airport facility periodically on designated runway sectors
    const isAirportChunk = (Math.abs(cx) + Math.abs(cz)) % 4 === 1;
    if (!isAirportChunk) return;

    const runwayX = chunkSize / 2 + 12.0;
    const runwayZ = chunkSize / 2;

    // 1. Asphalt Runway Slab
    const runwayWidth = 14.0;
    const runwayLength = chunkSize * 0.95;
    const runwayGeo = new THREE.PlaneGeometry(runwayWidth, runwayLength);
    runwayGeo.rotateX(-Math.PI / 2);
    const runway = new THREE.Mesh(runwayGeo, runwayAsphaltMat);
    runway.position.set(runwayX, 0.03, runwayZ);
    runway.receiveShadow = true;
    chunk.add(runway);

    // 2. White Centerline Dashes
    const dashCount = 8;
    const dashLength = runwayLength / (dashCount * 2);
    for (let i = 0; i < dashCount; i++) {
      const zOffset = -runwayLength / 2 + dashLength * (i * 2 + 1);
      const dashGeo = new THREE.PlaneGeometry(0.8, dashLength);
      dashGeo.rotateX(-Math.PI / 2);
      const dash = new THREE.Mesh(dashGeo, runwayMarkingMat);
      dash.position.set(runwayX, 0.04, runwayZ + zOffset);
      chunk.add(dash);
    }

    // 3. Touchdown Threshold Bars (Piano Keys)
    [-runwayLength / 2 + 3.0, runwayLength / 2 - 3.0].forEach((zEnd) => {
      for (let bar = -4; bar <= 4; bar++) {
        if (bar === 0) continue;
        const barGeo = new THREE.PlaneGeometry(0.6, 4.0);
        barGeo.rotateX(-Math.PI / 2);
        const barMesh = new THREE.Mesh(barGeo, runwayMarkingMat);
        barMesh.position.set(runwayX + bar * 1.3, 0.04, runwayZ + zEnd);
        chunk.add(barMesh);
      }
    });

    // 4. Runway Edge Lights (Green at threshold, Blue along taxiway)
    for (let i = 0; i < 6; i++) {
      const lz = -runwayLength / 2 + (i / 5) * runwayLength;
      [-runwayWidth / 2 - 0.4, runwayWidth / 2 + 0.4].forEach((lx) => {
        const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.4, 6);
        const post = new THREE.Mesh(postGeo, runwayYellowMat);
        post.position.set(runwayX + lx, 0.2, runwayZ + lz);
        chunk.add(post);

        const bulbGeo = new THREE.SphereGeometry(0.2, 8, 8);
        const bulbMat = (i === 0 || i === 5) ? lightGreenMat : lightBlueMat;
        const bulb = new THREE.Mesh(bulbGeo, bulbMat);
        bulb.position.set(runwayX + lx, 0.45, runwayZ + lz);
        chunk.add(bulb);
      });
    }

    // 5. Control Tower
    const tower = createControlTower();
    const towerX = runwayX - runwayWidth / 2 - 9.0;
    const towerZ = runwayZ - 12.0;
    tower.position.set(towerX, 0, towerZ);
    chunk.add(tower);

    // 6. Windsock
    const windsock = createWindsock();
    windsock.position.set(runwayX + runwayWidth / 2 + 4.5, 0, runwayZ + 10.0);
    chunk.add(windsock);

    // 7. LANDED BIPLANE PARKED ON THE RUNWAY / TAXIWAY!
    // Toddlers can clearly see it, drive right up to it, and crash into it to fly!
    const landedPlane = createLandedBiplane();
    const planeX = runwayX + (rand(190) > 0.5 ? 1.8 : -1.8);
    const planeZ = runwayZ + (rand(191) - 0.5) * (runwayLength * 0.4);
    landedPlane.position.set(planeX, 0, planeZ);
    landedPlane.rotation.y = rand(192) > 0.5 ? 0 : Math.PI;
    chunk.add(landedPlane);

    // Register landed biplane as a drivable vehicle collidable!
    registerCollidable(
      `landed_biplane_${cx}_${cz}`,
      'vehicle',
      new THREE.Vector3(originX + planeX, 1.2, originZ + planeZ),
      3.2,
      landedPlane,
      'minor',
      false, // On ground!
      undefined,
      { vehicleId: 'biplane', sound: 'whoosh' }
    );
  },

  tickModule: (delta, elapsed, carPos, chunk) => {
    // Spin control tower radar dish and landed plane propellers
    chunk.traverse((child) => {
      if (child.name === 'airport_radar') {
        child.rotation.y += delta * 2.4;
      } else if (child.name === 'landed_plane_propeller') {
        child.rotation.z += delta * 18.0; // Idling propeller ready for takeoff!
      } else if (child.name === 'airport_windsock') {
        const fabric = child.getObjectByName('windsock_fabric');
        if (fabric) {
          fabric.rotation.z = Math.sin(elapsed * 2.5) * 0.12;
          fabric.rotation.x = Math.cos(elapsed * 1.8) * 0.15;
        }
      }
    });
  },
};
