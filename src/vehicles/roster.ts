/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { VehicleDefinition } from '../types/game';

export interface VehicleMeshBundle {
  root: THREE.Group;
  wheels?: THREE.Object3D[];
  propeller?: THREE.Object3D;
  smokeEmitter?: THREE.Object3D;
}

export interface VehicleItem extends VehicleDefinition {
  create3D: () => VehicleMeshBundle;
  renderTopDownSvg: (primaryColor: string, accentColor: string) => string;
}

/**
 * 1. Sunny Roadster (Toy Convertible)
 * Designed with an unmistakable racing sports car silhouette,
 * forward wedge nose, glowing headlights, and rear spoiler.
 */
function createRoadsterMesh(): VehicleMeshBundle {
  const root = new THREE.Group();
  root.name = 'SunnyRoadster';

  const carGroup = new THREE.Group();
  // Rotate 180 degrees so front aligns with forward travel direction
  carGroup.rotation.y = Math.PI;
  root.add(carGroup);

  const redMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    roughness: 0.25,
    metalness: 0.3,
  });
  const darkRedMat = new THREE.MeshStandardMaterial({
    color: 0xb91c1c,
    roughness: 0.3,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.1,
    metalness: 0.9,
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.8,
    metalness: 0.1,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    roughness: 0.1,
    metalness: 0.2,
    transparent: true,
    opacity: 0.65,
  });
  const lightMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfef08a,
    emissiveIntensity: 0.8,
  });
  const tailLightMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 0.8,
  });
  const seatMat = new THREE.MeshStandardMaterial({
    color: 0xfde047,
    roughness: 0.6,
  });

  // Main chassis body
  const bodyGeo = new THREE.BoxGeometry(2.2, 0.7, 4.0);
  const body = new THREE.Mesh(bodyGeo, redMat);
  body.position.set(0, 0.65, 0);
  body.castShadow = true;
  body.receiveShadow = true;
  carGroup.add(body);

  // Rounded front hood wedge
  const hoodGeo = new THREE.CylinderGeometry(1.1, 1.1, 2.2, 16, 1, false, 0, Math.PI);
  const hood = new THREE.Mesh(hoodGeo, darkRedMat);
  hood.rotation.z = Math.PI / 2;
  hood.rotation.y = Math.PI / 2;
  hood.position.set(0, 1.0, -0.6);
  hood.castShadow = true;
  carGroup.add(hood);

  // Windshield
  const shieldGeo = new THREE.BoxGeometry(2.0, 0.8, 0.1);
  const shield = new THREE.Mesh(shieldGeo, glassMat);
  shield.position.set(0, 1.35, -0.3);
  shield.rotation.x = 0.3;
  carGroup.add(shield);

  // Seats
  const seatGeo = new THREE.BoxGeometry(0.7, 0.6, 0.6);
  const seatL = new THREE.Mesh(seatGeo, seatMat);
  seatL.position.set(-0.5, 0.9, 0.5);
  const seatR = new THREE.Mesh(seatGeo, seatMat);
  seatR.position.set(0.5, 0.9, 0.5);
  carGroup.add(seatL, seatR);

  // Steering wheel
  const wheelTorus = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 8, 16), chromeMat);
  wheelTorus.position.set(-0.5, 1.15, -0.1);
  wheelTorus.rotation.x = 0.5;
  carGroup.add(wheelTorus);

  // Front Headlights
  const headL = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.15, 16), lightMat);
  headL.rotation.x = Math.PI / 2;
  headL.position.set(-0.7, 0.7, -2.05);
  const headR = headL.clone();
  headR.position.x = 0.7;
  carGroup.add(headL, headR);

  // Rear Taillights
  const tailL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), tailLightMat);
  tailL.position.set(-0.7, 0.75, 2.05);
  const tailR = tailL.clone();
  tailR.position.x = 0.7;
  carGroup.add(tailL, tailR);

  // Rear Racing Spoiler
  const spoilerWing = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.1, 0.5), darkRedMat);
  spoilerWing.position.set(0, 1.45, 1.8);
  const postGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8);
  const postL = new THREE.Mesh(postGeo, chromeMat);
  postL.position.set(-0.8, 1.2, 1.8);
  const postR = postL.clone();
  postR.position.x = 0.8;
  carGroup.add(spoilerWing, postL, postR);

  // Dual chrome exhausts
  const exhaustGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.4, 12);
  const exhaustL = new THREE.Mesh(exhaustGeo, chromeMat);
  exhaustL.rotation.x = Math.PI / 2;
  exhaustL.position.set(-0.6, 0.4, 2.1);
  const exhaustR = exhaustL.clone();
  exhaustR.position.x = 0.6;
  carGroup.add(exhaustL, exhaustR);

  // 4 Wheels
  const wheels: THREE.Object3D[] = [];
  const wheelGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.35, 16);
  const hubGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.38, 16);

  const wheelPositions = [
    [-1.2, 0.48, -1.2],
    [1.2, 0.48, -1.2],
    [-1.2, 0.48, 1.2],
    [1.2, 0.48, 1.2],
  ];

  wheelPositions.forEach(([x, y, z]) => {
    const wGroup = new THREE.Group();
    wGroup.position.set(x, y, z);

    const tire = new THREE.Mesh(wheelGeo, tireMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;

    const hub = new THREE.Mesh(hubGeo, chromeMat);
    hub.rotation.z = Math.PI / 2;

    wGroup.add(tire, hub);
    carGroup.add(wGroup);
    wheels.push(wGroup);
  });

  return { root, wheels };
}

/**
 * 2. Choo-Choo Express (Articulated Steam Train with Tender and Passenger Cars)
 */
function createSteamTrainMesh(): VehicleMeshBundle {
  const root = new THREE.Group();
  root.name = 'ChooChooExpress';

  const blueMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.2 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.2, metalness: 0.8 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
  const redMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.3 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.6 });

  // Locomotive Group
  const loco = new THREE.Group();
  loco.position.set(0, 0, -1.5);

  // Boiler
  const boilerGeo = new THREE.CylinderGeometry(0.7, 0.7, 2.5, 16);
  const boiler = new THREE.Mesh(boilerGeo, blueMat);
  boiler.rotation.x = Math.PI / 2;
  boiler.position.set(0, 1.2, -0.4);
  boiler.castShadow = true;
  loco.add(boiler);

  // Cab
  const cabGeo = new THREE.BoxGeometry(1.6, 1.6, 1.5);
  const cab = new THREE.Mesh(cabGeo, redMat);
  cab.position.set(0, 1.4, 1.1);
  cab.castShadow = true;
  loco.add(cab);

  // Cab curved roof
  const roofGeo = new THREE.CylinderGeometry(0.9, 0.9, 1.65, 16, 1, false, 0, Math.PI);
  const roof = new THREE.Mesh(roofGeo, darkMat);
  roof.rotation.z = Math.PI / 2;
  roof.position.set(0, 2.2, 1.1);
  loco.add(roof);

  // Smokestack & Golden Bell
  const stackGeo = new THREE.CylinderGeometry(0.28, 0.18, 0.8, 12);
  const stack = new THREE.Mesh(stackGeo, darkMat);
  stack.position.set(0, 2.1, -1.2);
  loco.add(stack);

  const bellGeo = new THREE.SphereGeometry(0.2, 12, 12);
  const bell = new THREE.Mesh(bellGeo, goldMat);
  bell.position.set(0, 2.0, -0.4);
  loco.add(bell);

  // Red Cowcatcher (front wedge)
  const cowGeo = new THREE.ConeGeometry(0.8, 0.8, 4);
  const cow = new THREE.Mesh(cowGeo, redMat);
  cow.rotation.x = -Math.PI / 2;
  cow.rotation.y = Math.PI / 4;
  cow.position.set(0, 0.5, -1.8);
  loco.add(cow);

  // Coal Tender Car
  const tender = new THREE.Group();
  tender.position.set(0, 0, 1.2);
  const tenderBody = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 1.8), darkMat);
  tenderBody.position.set(0, 0.9, 0);
  tenderBody.castShadow = true;
  tender.add(tenderBody);

  const coalGeo = new THREE.DodecahedronGeometry(0.5, 1);
  const coal = new THREE.Mesh(coalGeo, new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.9 }));
  coal.scale.set(1.2, 0.6, 1.5);
  coal.position.set(0, 1.4, 0);
  tender.add(coal);

  // Passenger Car 1
  const pass1 = new THREE.Group();
  pass1.position.set(0, 0, 3.8);
  const coachGeo = new THREE.BoxGeometry(1.4, 1.2, 2.2);
  const coach1 = new THREE.Mesh(coachGeo, woodMat);
  coach1.position.set(0, 1.1, 0);
  coach1.castShadow = true;
  pass1.add(coach1);
  const coachRoof1 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.2, 2.3), goldMat);
  coachRoof1.position.set(0, 1.75, 0);
  pass1.add(coachRoof1);

  // Passenger Car 2 (Caboose)
  const pass2 = new THREE.Group();
  pass2.position.set(0, 0, 6.8);
  const coach2 = new THREE.Mesh(coachGeo, redMat);
  coach2.position.set(0, 1.1, 0);
  coach2.castShadow = true;
  pass2.add(coach2);
  const coachRoof2 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.2, 2.3), darkMat);
  coachRoof2.position.set(0, 1.75, 0);
  pass2.add(coachRoof2);

  root.add(loco, tender, pass1, pass2);

  // Wheels on train
  const wheels: THREE.Object3D[] = [];
  const tWheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.15, 16);

  const trainAxles = [
    [-1.2, -0.8], [-1.2, 0.2], [-1.2, 1.1],
    [1.2, -0.5], [1.2, 0.5],
    [3.8, -0.6], [3.8, 0.6],
    [6.8, -0.6], [6.8, 0.6],
  ];

  trainAxles.forEach(([zCenter, zOffset]) => {
    const z = zCenter + zOffset;
    [-0.8, 0.8].forEach((x) => {
      const w = new THREE.Mesh(tWheelGeo, darkMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, 0.38, z);
      w.castShadow = true;
      root.add(w);
      wheels.push(w);
    });
  });

  return { root, wheels, smokeEmitter: stack };
}

/**
 * 3. Barnstormer (Playful Cartoon Biplane with Full 3D Flight)
 */
function createBiplaneMesh(): VehicleMeshBundle {
  const root = new THREE.Group();
  root.name = 'BarnstormerBiplane';

  const yellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3, metalness: 0.2 });
  const blueMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.25, metalness: 0.3 });
  const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.1, metalness: 0.9 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });

  // Aerodynamic Fuselage
  const fuseGeo = new THREE.CylinderGeometry(0.55, 0.25, 4.2, 16);
  const fuselage = new THREE.Mesh(fuseGeo, yellowMat);
  fuselage.rotation.x = Math.PI / 2;
  fuselage.position.set(0, 1.2, 0);
  fuselage.castShadow = true;
  root.add(fuselage);

  // Lower Wing
  const lowerWing = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.12, 1.1), blueMat);
  lowerWing.position.set(0, 0.9, -0.2);
  lowerWing.castShadow = true;
  root.add(lowerWing);

  // Upper Wing
  const upperWing = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.12, 1.1), blueMat);
  upperWing.position.set(0, 2.0, -0.2);
  upperWing.castShadow = true;
  root.add(upperWing);

  // Wing Struts
  const strutGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.1, 8);
  [-2.5, -1.0, 1.0, 2.5].forEach((x) => {
    const strut = new THREE.Mesh(strutGeo, metalMat);
    strut.position.set(x, 1.45, -0.2);
    root.add(strut);
  });

  // Cockpit
  const windshield = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.35, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.6 })
  );
  windshield.position.set(0, 1.8, -0.5);
  windshield.rotation.x = 0.3;
  root.add(windshield);

  // Tail vertical rudder and horizontal elevators
  const rudder = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.9), redMat);
  rudder.position.set(0, 1.8, 1.9);
  const elevator = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 0.7), blueMat);
  elevator.position.set(0, 1.4, 1.9);
  root.add(rudder, elevator);

  // Front spinning propeller
  const propGroup = new THREE.Group();
  propGroup.position.set(0, 1.2, -2.15);

  const noseCone = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.45, 16), redMat);
  noseCone.rotation.x = -Math.PI / 2;
  propGroup.add(noseCone);

  const bladeGeo = new THREE.BoxGeometry(1.8, 0.18, 0.04);
  const blade = new THREE.Mesh(bladeGeo, darkMat);
  propGroup.add(blade);
  root.add(propGroup);

  // Landing Gear Wheels
  const wheels: THREE.Object3D[] = [];
  const pWheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.2, 16);
  [-0.9, 0.9].forEach((x) => {
    const w = new THREE.Mesh(pWheelGeo, darkMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.35, -0.7);
    w.castShadow = true;
    root.add(w);
    wheels.push(w);

    const leg = new THREE.Mesh(strutGeo, metalMat);
    leg.position.set(x * 0.7, 0.7, -0.7);
    leg.rotation.z = x > 0 ? -0.3 : 0.3;
    root.add(leg);
  });

  return { root, wheels, propeller: propGroup };
}

/**
 * 4. Rusty Digger (Construction Excavator / Backhoe)
 */
function createDiggerMesh(): VehicleMeshBundle {
  const root = new THREE.Group();
  root.name = 'RustyDigger';

  const yellowMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.35, metalness: 0.1 });
  const darkYellowMat = new THREE.MeshStandardMaterial({ color: 0xca8a04, roughness: 0.4 });
  const trackMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.85, metalness: 0.1 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x71717a, roughness: 0.3, metalness: 0.7 });
  const lightMat = new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xf97316, emissiveIntensity: 0.6 });

  // Dual Rubber Tracks
  [-1.0, 1.0].forEach((x) => {
    const track = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.65, 3.2), trackMat);
    track.position.set(x, 0.35, 0);
    track.castShadow = true;
    track.receiveShadow = true;
    root.add(track);

    [-1.1, 0, 1.1].forEach((z) => {
      const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.52, 12), metalMat);
      roller.rotation.z = Math.PI / 2;
      roller.position.set(x, 0.35, z);
      root.add(roller);
    });
  });

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 2.2), darkYellowMat);
  chassis.position.set(0, 0.75, 0);
  root.add(chassis);

  const cabGroup = new THREE.Group();
  cabGroup.position.set(0, 0.95, 0);

  const cabBody = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.2, 1.8), yellowMat);
  cabBody.position.set(0, 0.6, 0.2);
  cabBody.castShadow = true;
  cabGroup.add(cabBody);

  const cabWindow = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 0.6, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, transparent: true, opacity: 0.7 })
  );
  cabWindow.position.set(0, 0.8, -0.71);
  cabGroup.add(cabWindow);

  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.2, 12), lightMat);
  beacon.position.set(0, 1.3, 0.2);
  cabGroup.add(beacon);

  const boom1 = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.4, 2.0), darkYellowMat);
  boom1.position.set(0, 1.1, -1.2);
  boom1.rotation.x = -0.55;
  cabGroup.add(boom1);

  const boom2 = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.32, 1.8), darkYellowMat);
  boom2.position.set(0, 1.8, -2.3);
  boom2.rotation.x = 0.65;
  cabGroup.add(boom2);

  const bucket = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.8), metalMat);
  bucket.position.set(0, 0.9, -3.1);
  bucket.rotation.x = 0.2;
  bucket.castShadow = true;
  cabGroup.add(bucket);

  root.add(cabGroup);

  return { root };
}

/**
 * Top-Down SVGs for Mobile Screen (~80% size)
 */
function renderRoadsterSvg(pri: string, acc: string): string {
  return `
    <svg viewBox="0 0 200 320" class="w-full h-full drop-shadow-2xl">
      <ellipse cx="100" cy="165" rx="75" ry="120" fill="rgba(0,0,0,0.15)" />
      <rect x="18" y="45" width="22" height="48" rx="6" fill="#1e293b" />
      <rect x="160" y="45" width="22" height="48" rx="6" fill="#1e293b" />
      <rect x="18" y="215" width="22" height="48" rx="6" fill="#1e293b" />
      <rect x="160" y="215" width="22" height="48" rx="6" fill="#1e293b" />
      <rect x="36" y="30" width="128" height="250" rx="36" fill="${pri}" />
      <rect x="90" y="35" width="20" height="90" rx="4" fill="${acc}" />
      <path d="M 46 115 Q 100 95 154 115 L 148 140 Q 100 125 52 140 Z" fill="#93c5fd" opacity="0.85" />
      <rect x="52" y="145" width="96" height="70" rx="14" fill="#0f172a" opacity="0.8" />
      <circle cx="75" cy="160" r="14" stroke="#f1f5f9" stroke-width="4" fill="none" />
      <rect x="62" y="175" width="28" height="34" rx="8" fill="#fde047" />
      <rect x="110" y="175" width="28" height="34" rx="8" fill="#fde047" />
      <circle cx="58" cy="40" r="10" fill="#fef08a" />
      <circle cx="142" cy="40" r="10" fill="#fef08a" />
    </svg>
  `;
}

function renderSteamTrainSvg(pri: string, acc: string): string {
  return `
    <svg viewBox="0 0 200 360" class="w-full h-full drop-shadow-2xl">
      <ellipse cx="100" cy="180" rx="65" ry="140" fill="rgba(0,0,0,0.15)" />
      <polygon points="100,20 45,65 155,65" fill="#e11d48" />
      <rect x="55" y="60" width="90" height="150" rx="18" fill="${pri}" />
      <rect x="55" y="90" width="90" height="8" fill="${acc}" />
      <rect x="55" y="135" width="90" height="8" fill="${acc}" />
      <circle cx="100" cy="80" r="16" fill="#1e293b" />
      <circle cx="100" cy="80" r="10" fill="#475569" />
      <rect x="42" y="195" width="116" height="75" rx="12" fill="#e11d48" />
      <rect x="48" y="200" width="104" height="65" rx="8" fill="#1e293b" />
      <rect x="88" y="270" width="24" height="20" fill="#475569" />
      <rect x="50" y="285" width="100" height="60" rx="8" fill="#1e293b" />
      <circle cx="100" cy="315" r="16" fill="#09090b" />
    </svg>
  `;
}

function renderBiplaneSvg(pri: string, acc: string): string {
  return `
    <svg viewBox="0 0 260 260" class="w-full h-full drop-shadow-2xl">
      <ellipse cx="130" cy="140" rx="100" ry="80" fill="rgba(0,0,0,0.15)" />
      <rect x="15" y="95" width="230" height="50" rx="14" fill="${acc}" />
      <rect x="25" y="105" width="210" height="10" rx="4" fill="#1d4ed8" />
      <rect x="105" y="30" width="50" height="190" rx="22" fill="${pri}" />
      <ellipse cx="130" cy="115" rx="16" ry="24" fill="#1e293b" />
      <circle cx="130" cy="120" r="9" fill="#fde047" />
      <polygon points="130,220 100,245 160,245" fill="#dc2626" />
      <rect x="75" y="26" width="110" height="10" rx="4" fill="#334155" opacity="0.8" />
      <circle cx="130" cy="31" r="10" fill="#dc2626" />
    </svg>
  `;
}

function renderDiggerSvg(pri: string, acc: string): string {
  return `
    <svg viewBox="0 0 220 320" class="w-full h-full drop-shadow-2xl">
      <ellipse cx="110" cy="165" rx="70" ry="110" fill="rgba(0,0,0,0.15)" />
      <rect x="25" y="60" width="35" height="180" rx="10" fill="#27272a" />
      <rect x="160" y="60" width="35" height="180" rx="10" fill="#27272a" />
      <line x1="25" y1="90" x2="60" y2="90" stroke="#52525b" stroke-width="3" />
      <line x1="25" y1="130" x2="60" y2="130" stroke="#52525b" stroke-width="3" />
      <line x1="25" y1="170" x2="60" y2="170" stroke="#52525b" stroke-width="3" />
      <line x1="25" y1="210" x2="60" y2="210" stroke="#52525b" stroke-width="3" />
      <line x1="160" y1="90" x2="195" y2="90" stroke="#52525b" stroke-width="3" />
      <line x1="160" y1="130" x2="195" y2="130" stroke="#52525b" stroke-width="3" />
      <line x1="160" y1="170" x2="195" y2="170" stroke="#52525b" stroke-width="3" />
      <line x1="160" y1="210" x2="195" y2="210" stroke="#52525b" stroke-width="3" />
      <rect x="58" y="90" width="104" height="120" rx="16" fill="${pri}" />
      <rect x="70" y="105" width="80" height="75" rx="8" fill="#ca8a04" />
      <rect x="75" y="110" width="70" height="25" rx="4" fill="#38bdf8" opacity="0.8" />
      <circle cx="110" cy="155" r="8" fill="#f97316" />
      <rect x="98" y="20" width="24" height="75" rx="6" fill="${acc}" />
      <path d="M 85 10 L 135 10 L 125 35 L 95 35 Z" fill="#71717a" />
      <polygon points="90,10 95,0 100,10" fill="#52525b" />
      <polygon points="105,10 110,0 115,10" fill="#52525b" />
      <polygon points="120,10 125,0 130,10" fill="#52525b" />
    </svg>
  `;
}

export const BUILTIN_VEHICLES: VehicleItem[] = [
  {
    id: 'roadster',
    name: 'Sunny Roadster',
    subtitle: 'Classic Toy Convertible',
    type: 'ground',
    baseSpeed: 12,
    primaryColor: '#ef4444',
    accentColor: '#fde047',
    create3D: createRoadsterMesh,
    renderTopDownSvg: renderRoadsterSvg,
  },
  {
    id: 'steam_train',
    name: 'Choo-Choo Express',
    subtitle: 'Classic Steam Train',
    type: 'ground',
    baseSpeed: 8,
    primaryColor: '#0284c7',
    accentColor: '#f59e0b',
    create3D: createSteamTrainMesh,
    renderTopDownSvg: renderSteamTrainSvg,
  },
  {
    id: 'biplane',
    name: 'Barnstormer',
    subtitle: 'Flying Stunt Biplane',
    type: 'air',
    baseSpeed: 16,
    primaryColor: '#facc15',
    accentColor: '#2563eb',
    create3D: createBiplaneMesh,
    renderTopDownSvg: renderBiplaneSvg,
  },
  {
    id: 'digger',
    name: 'Rusty Digger',
    subtitle: 'Construction Backhoe',
    type: 'ground',
    baseSpeed: 7,
    primaryColor: '#eab308',
    accentColor: '#ca8a04',
    create3D: createDiggerMesh,
    renderTopDownSvg: renderDiggerSvg,
  },
];

/**
 * Dynamic ES Module loader for custom vehicle JS code (Section 8)
 */
export async function loadVehicleFromModule(codeString: string): Promise<VehicleItem> {
  const blob = new Blob([codeString], { type: 'application/javascript' });
  const blobUrl = URL.createObjectURL(blob);

  try {
    const module = await import(/* @vite-ignore */ blobUrl);
    const config = module.default;

    if (!config || typeof config.geometry !== 'function') {
      throw new Error('Vehicle module must export default object with a geometry(THREE) method');
    }

    const id = `custom_${Date.now()}`;
    const name = config.name || 'Custom Vehicle';
    const type = config.type === 'air' ? 'air' : 'ground';
    const baseSpeed = typeof config.baseSpeed === 'number' ? config.baseSpeed : 10;
    const primaryColor = config.primaryColor || '#10b981';
    const accentColor = config.accentColor || '#f59e0b';

    return {
      id,
      name,
      subtitle: config.type === 'air' ? 'Custom Flying Aircraft' : 'Custom Ground Vehicle',
      type,
      baseSpeed,
      primaryColor,
      accentColor,
      custom: true,
      create3D: () => {
        const root = config.geometry(THREE);
        return { root };
      },
      renderTopDownSvg: (pri, acc) => renderRoadsterSvg(pri, acc),
    };
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

/**
 * AI Vehicle Prompt Template generator with 3D Flight & Destruction support
 */
export function getAiVehiclePrompt(userPrompt: string): string {
  return `You are an expert Three.js 3D vehicle and aircraft generator for a toddler motion driving game.
Generate a complete, fully valid JavaScript ES Module file according to the specifications below.

RULES:
1. Return strictly valid JavaScript ES module code starting with \`export default {\`. Do not wrap code in markdown tags if saving directly to file.
2. Ground & Air Vehicles Supported:
   - For ground vehicles: \`type: "ground"\`, \`baseSpeed: 10\` (cars: 10, trains/excavators: 6). Attach wheels or tracks.
   - For flying aircraft: \`type: "air"\`, \`baseSpeed: 16\`. Include wings, tail rudder, and an animated propeller or jet nozzle. Phone pitch tilt climbs/dives altitude between 2m and 32m, and phone roll banks wings into turns!
3. Baseline Parameters:
   - name: "Vehicle Name"
   - baseSpeed: 10 (or 16 for jets/planes)
   - type: "ground" or "air"
   - primaryColor: "#ef4444"
   - accentColor: "#fde047"
4. Geometry Construction: Build the visual representation strictly inside \`geometry(THREE)\` using rich primitive compositions (BoxGeometry, CylinderGeometry, SphereGeometry, ConeGeometry, TorusGeometry, ExtrudeGeometry, etc.).
5. Forward Alignment: Crucial! Center the main group at ground level (Y = 0) facing forward along the -Z axis (front nose, headlights, or propeller at -Z, exhaust or tail at +Z).
6. Return a unified root \`THREE.Group()\` object containing all assembled sub-components.

USER REQUEST:
${userPrompt || 'A colorful cartoon jet airplane with swept wings, cockpit canopy, twin vertical tail fins, and spinning nose propeller.'}`;
}
