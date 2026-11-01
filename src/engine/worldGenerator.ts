/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { CollisionSeverity } from '../types/game';

export interface DebrisPiece {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  life: number;
}

export interface CollidableObject {
  id: string;
  type: 'barn' | 'windmill' | 'fence' | 'hay' | 'tree' | 'cow' | 'star_ring' | 'rainbow_cloud' | 'balloon';
  position: THREE.Vector3;
  radius: number;
  mesh: THREE.Object3D;
  severity: CollisionSeverity;
  isAirObject: boolean;
  hitTimestamp: number;
  originalScale: THREE.Vector3;
  isDestroyed: boolean;
  respawnTime: number;
}

export class WorldGenerator {
  public scene: THREE.Scene;
  private chunkSize = 70;
  private activeChunks = new Map<string, THREE.Group>();
  private collidables: CollidableObject[] = [];
  private activeDebris: DebrisPiece[] = [];
  private animatedWindmills: THREE.Object3D[] = [];
  private animatedAirObjects: { mesh: THREE.Object3D; startY: number; speed: number; offset: number }[] = [];

  // Confetti Particle Pool
  private confettiParticles: {
    mesh: THREE.InstancedMesh;
    velocities: THREE.Vector3[];
    rotations: THREE.Vector3[];
    life: number[];
  } | null = null;
  private maxConfetti = 240;

  // Shared procedural materials
  private grassMat = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.8 });
  private dirtRoadMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.9 });
  private barnMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 });
  private roofMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.3 });
  private woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 });
  private whiteTrimMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
  private hayMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.9 });
  private treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.8 });
  private foliageMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.5 });
  private appleMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 });
  private goldStarMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xf59e0b, emissiveIntensity: 0.7, roughness: 0.2, metalness: 0.8 });
  private rainbowCloudMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.3, transparent: true, opacity: 0.9 });
  private cowWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
  private cowBlackMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initConfettiSystem();
  }

  private initConfettiSystem(): void {
    const geo = new THREE.PlaneGeometry(0.4, 0.4);
    const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    const mesh = new THREE.InstancedMesh(geo, mat, this.maxConfetti);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const dummy = new THREE.Matrix4();
    const colors = [
      new THREE.Color(0xef4444),
      new THREE.Color(0xf59e0b),
      new THREE.Color(0x10b981),
      new THREE.Color(0x3b82f6),
      new THREE.Color(0xec4899),
      new THREE.Color(0xa855f7),
      new THREE.Color(0xfacc15),
      new THREE.Color(0x06b6d4),
    ];

    const velocities: THREE.Vector3[] = [];
    const rotations: THREE.Vector3[] = [];
    const life: number[] = [];

    for (let i = 0; i < this.maxConfetti; i++) {
      dummy.setPosition(0, -999, 0);
      mesh.setMatrixAt(i, dummy);
      mesh.setColorAt(i, colors[i % colors.length]);
      velocities.push(new THREE.Vector3());
      rotations.push(new THREE.Vector3());
      life.push(0);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    this.scene.add(mesh);
    this.confettiParticles = { mesh, velocities, rotations, life };
  }

  public triggerConfetti(center: THREE.Vector3, count = 35): void {
    if (!this.confettiParticles) return;

    const { velocities, rotations, life, mesh } = this.confettiParticles;
    const dummy = new THREE.Matrix4();
    let spawned = 0;

    for (let i = 0; i < this.maxConfetti && spawned < count; i++) {
      if (life[i] <= 0) {
        dummy.setPosition(
          center.x + (Math.random() - 0.5) * 1.2,
          center.y + 0.8 + Math.random() * 1.2,
          center.z + (Math.random() - 0.5) * 1.2
        );
        mesh.setMatrixAt(i, dummy);

        velocities[i].set(
          (Math.random() - 0.5) * 12,
          6 + Math.random() * 8,
          (Math.random() - 0.5) * 12
        );
        rotations[i].set(
          Math.random() * 0.4,
          Math.random() * 0.4,
          Math.random() * 0.4
        );
        life[i] = 1.2 + Math.random() * 0.8;
        spawned++;
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Cartoon Destruction Engine:
   * Shatters hit objects into tumbling 3D debris pieces with physics!
   */
  public destroyObject(obj: CollidableObject): void {
    obj.isDestroyed = true;
    obj.respawnTime = performance.now() + 8500; // Respawns after 8.5 seconds
    obj.mesh.visible = false; // Hide main structure

    this.triggerConfetti(obj.position, obj.severity === 'major' ? 50 : 25);

    const pos = obj.position;

    // Spawn specialized debris based on object type
    switch (obj.type) {
      case 'fence': {
        // Splinter into 4 tumbling wooden planks
        const plankGeo = new THREE.BoxGeometry(0.18, 0.22, 1.8);
        for (let i = 0; i < 4; i++) {
          const plank = new THREE.Mesh(plankGeo, this.woodMat);
          plank.position.set(pos.x + (Math.random() - 0.5), pos.y + 0.6, pos.z + (Math.random() - 0.5));
          this.scene.add(plank);
          this.activeDebris.push({
            mesh: plank,
            velocity: new THREE.Vector3((Math.random() - 0.5) * 8, 4 + Math.random() * 5, (Math.random() - 0.5) * 8),
            angularVelocity: new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8),
            life: 2.5,
          });
        }
        break;
      }

      case 'tree': {
        // Foliage pops into 5 green puffs + 4 bouncing apples
        const puffGeo = new THREE.DodecahedronGeometry(0.9, 1);
        for (let i = 0; i < 5; i++) {
          const puff = new THREE.Mesh(puffGeo, this.foliageMat);
          puff.position.set(pos.x + (Math.random() - 0.5) * 1.5, pos.y + 2.5, pos.z + (Math.random() - 0.5) * 1.5);
          this.scene.add(puff);
          this.activeDebris.push({
            mesh: puff,
            velocity: new THREE.Vector3((Math.random() - 0.5) * 9, 5 + Math.random() * 7, (Math.random() - 0.5) * 9),
            angularVelocity: new THREE.Vector3(Math.random() * 6, Math.random() * 6, Math.random() * 6),
            life: 3.0,
          });
        }
        // Rolling red apples
        const appleGeo = new THREE.SphereGeometry(0.22, 8, 8);
        for (let i = 0; i < 4; i++) {
          const apple = new THREE.Mesh(appleGeo, this.appleMat);
          apple.position.set(pos.x + (Math.random() - 0.5), pos.y + 1.2, pos.z + (Math.random() - 0.5));
          this.scene.add(apple);
          this.activeDebris.push({
            mesh: apple,
            velocity: new THREE.Vector3((Math.random() - 0.5) * 6, 2 + Math.random() * 4, (Math.random() - 0.5) * 6),
            angularVelocity: new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10),
            life: 2.8,
          });
        }
        break;
      }

      case 'hay': {
        // Golden straw cubes burst outward
        const strawGeo = new THREE.BoxGeometry(0.45, 0.45, 0.45);
        for (let i = 0; i < 6; i++) {
          const straw = new THREE.Mesh(strawGeo, this.hayMat);
          straw.position.set(pos.x + (Math.random() - 0.5), pos.y + 0.8, pos.z + (Math.random() - 0.5));
          this.scene.add(straw);
          this.activeDebris.push({
            mesh: straw,
            velocity: new THREE.Vector3((Math.random() - 0.5) * 7, 4 + Math.random() * 5, (Math.random() - 0.5) * 7),
            angularVelocity: new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8),
            life: 2.2,
          });
        }
        break;
      }

      case 'barn': {
        // Barn blows roof and red wall panels
        const wallChunkGeo = new THREE.BoxGeometry(1.6, 1.2, 0.3);
        for (let i = 0; i < 6; i++) {
          const chunk = new THREE.Mesh(wallChunkGeo, this.barnMat);
          chunk.position.set(pos.x + (Math.random() - 0.5) * 3, pos.y + 2.0, pos.z + (Math.random() - 0.5) * 3);
          this.scene.add(chunk);
          this.activeDebris.push({
            mesh: chunk,
            velocity: new THREE.Vector3((Math.random() - 0.5) * 11, 7 + Math.random() * 8, (Math.random() - 0.5) * 11),
            angularVelocity: new THREE.Vector3(Math.random() * 5, Math.random() * 5, Math.random() * 5),
            life: 3.2,
          });
        }
        break;
      }

      case 'cow': {
        // Cow flips high into the air with comical spin
        obj.mesh.visible = true; // Keep visible for backflip
        obj.mesh.position.y += 2.0;
        break;
      }

      case 'star_ring':
      case 'rainbow_cloud':
      case 'balloon': {
        // Air collectibles burst with huge rings of confetti
        this.triggerConfetti(pos, 45);
        break;
      }
    }
  }

  public updateChunks(vehiclePos: THREE.Vector3, density = 1.0): void {
    const currentChunkX = Math.floor(vehiclePos.x / this.chunkSize);
    const currentChunkZ = Math.floor(vehiclePos.z / this.chunkSize);

    const neededKeys = new Set<string>();

    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const cx = currentChunkX + dx;
        const cz = currentChunkZ + dz;
        const key = `${cx},${cz}`;
        neededKeys.add(key);

        if (!this.activeChunks.has(key)) {
          const chunkGroup = this.generateChunk(cx, cz, density);
          this.activeChunks.set(key, chunkGroup);
          this.scene.add(chunkGroup);
        }
      }
    }

    // Cleanup distant chunks
    for (const [key, chunkGroup] of this.activeChunks.entries()) {
      if (!neededKeys.has(key)) {
        this.scene.remove(chunkGroup);
        this.activeChunks.delete(key);
      }
    }
  }

  private generateChunk(cx: number, cz: number, density: number): THREE.Group {
    const chunk = new THREE.Group();
    const originX = cx * this.chunkSize;
    const originZ = cz * this.chunkSize;
    chunk.position.set(originX, 0, originZ);

    // Ground Plane
    const groundGeo = new THREE.PlaneGeometry(this.chunkSize, this.chunkSize, 8, 8);
    groundGeo.rotateX(-Math.PI / 2);
    const ground = new THREE.Mesh(groundGeo, this.grassMat);
    ground.position.set(this.chunkSize / 2, -0.05, this.chunkSize / 2);
    ground.receiveShadow = true;
    chunk.add(ground);

    // Dirt country path
    const pathGeo = new THREE.PlaneGeometry(7.0, this.chunkSize + 1);
    pathGeo.rotateX(-Math.PI / 2);
    const path = new THREE.Mesh(pathGeo, this.dirtRoadMat);
    path.position.set(this.chunkSize / 2, 0.02, this.chunkSize / 2);
    path.receiveShadow = true;
    chunk.add(path);

    const seed = Math.sin(cx * 12.9898 + cz * 78.233) * 43758.5453;
    const rand = (offset: number) => {
      const x = Math.sin(seed + offset) * 10000;
      return x - Math.floor(x);
    };

    // 1. Red Barn
    if (rand(1) > 0.45) {
      const barnX = rand(2) > 0.5 ? 14 : this.chunkSize - 14;
      const barnZ = 15 + rand(3) * (this.chunkSize - 30);
      const barn = this.createBarn();
      barn.position.set(barnX, 0, barnZ);
      chunk.add(barn);

      this.registerCollidable(
        `barn_${cx}_${cz}`,
        'barn',
        new THREE.Vector3(originX + barnX, 0, originZ + barnZ),
        5.5,
        barn,
        'major',
        false
      );
    }

    // 2. Windmill
    if (rand(4) > 0.6) {
      const millX = rand(5) > 0.5 ? 16 : this.chunkSize - 16;
      const millZ = 12 + rand(6) * (this.chunkSize - 24);
      const { group: windmill, blades } = this.createWindmill();
      windmill.position.set(millX, 0, millZ);
      chunk.add(windmill);
      this.animatedWindmills.push(blades);

      this.registerCollidable(
        `windmill_${cx}_${cz}`,
        'windmill',
        new THREE.Vector3(originX + millX, 0, originZ + millZ),
        3.5,
        windmill,
        'major',
        false
      );
    }

    // 3. Fences along path
    const fenceStep = 9;
    for (let fz = 4; fz < this.chunkSize - 4; fz += fenceStep) {
      const fenceL = this.createFence();
      fenceL.position.set(this.chunkSize / 2 - 5.5, 0, fz);
      chunk.add(fenceL);
      this.registerCollidable(
        `fenceL_${cx}_${cz}_${fz}`,
        'fence',
        new THREE.Vector3(originX + this.chunkSize / 2 - 5.5, 0, originZ + fz),
        2.0,
        fenceL,
        'minor',
        false
      );

      const fenceR = this.createFence();
      fenceR.position.set(this.chunkSize / 2 + 5.5, 0, fz);
      chunk.add(fenceR);
      this.registerCollidable(
        `fenceR_${cx}_${cz}_${fz}`,
        'fence',
        new THREE.Vector3(originX + this.chunkSize / 2 + 5.5, 0, originZ + fz),
        2.0,
        fenceR,
        'minor',
        false
      );
    }

    // 4. Hay Bales
    const numHay = Math.floor(4 * density);
    for (let i = 0; i < numHay; i++) {
      const hx = 6 + rand(10 + i) * (this.chunkSize - 12);
      if (Math.abs(hx - this.chunkSize / 2) > 6) {
        const hz = 6 + rand(20 + i) * (this.chunkSize - 12);
        const hay = this.createHayBale();
        hay.position.set(hx, 0, hz);
        chunk.add(hay);

        this.registerCollidable(
          `hay_${cx}_${cz}_${i}`,
          'hay',
          new THREE.Vector3(originX + hx, 0, originZ + hz),
          2.0,
          hay,
          'minor',
          false
        );
      }
    }

    // 5. Apple Trees
    const numTrees = Math.floor(7 * density);
    for (let i = 0; i < numTrees; i++) {
      const tx = 5 + rand(30 + i) * (this.chunkSize - 10);
      if (Math.abs(tx - this.chunkSize / 2) > 7) {
        const tz = 5 + rand(40 + i) * (this.chunkSize - 10);
        const tree = this.createAppleTree();
        tree.position.set(tx, 0, tz);
        chunk.add(tree);

        this.registerCollidable(
          `tree_${cx}_${cz}_${i}`,
          'tree',
          new THREE.Vector3(originX + tx, 0, originZ + tz),
          2.4,
          tree,
          'minor',
          false
        );
      }
    }

    // 6. Grazing Cow
    if (rand(50) > 0.4) {
      const cowX = rand(51) > 0.5 ? 20 : this.chunkSize - 20;
      const cowZ = 10 + rand(52) * (this.chunkSize - 20);
      const cow = this.createCow();
      cow.position.set(cowX, 0, cowZ);
      chunk.add(cow);
      this.registerCollidable(
        `cow_${cx}_${cz}`,
        'cow',
        new THREE.Vector3(originX + cowX, 0, originZ + cowZ),
        2.2,
        cow,
        'minor',
        false
      );
    }

    // 7. AIR OBJECTS: Golden Star Rings to fly through!
    for (let r = 0; r < 2; r++) {
      const ringX = 8 + rand(60 + r) * (this.chunkSize - 16);
      const ringZ = 8 + rand(70 + r) * (this.chunkSize - 16);
      const ringY = 12 + rand(80 + r) * 14; // Hovering between 12m and 26m
      const ring = this.createStarRing();
      ring.position.set(ringX, ringY, ringZ);
      chunk.add(ring);

      this.registerCollidable(
        `star_ring_${cx}_${cz}_${r}`,
        'star_ring',
        new THREE.Vector3(originX + ringX, ringY, originZ + ringZ),
        3.2,
        ring,
        'minor',
        true
      );
      this.animatedAirObjects.push({ mesh: ring, startY: ringY, speed: 0.6, offset: rand(85 + r) });
    }

    // 8. AIR OBJECTS: Rainbow Clouds & Floating Balloons
    if (rand(90) > 0.3) {
      const cloudX = rand(91) * this.chunkSize;
      const cloudZ = rand(92) * this.chunkSize;
      const cloudY = 16 + rand(93) * 12;
      const rainbowCloud = this.createRainbowCloud();
      rainbowCloud.position.set(cloudX, cloudY, cloudZ);
      chunk.add(rainbowCloud);

      this.registerCollidable(
        `rainbow_cloud_${cx}_${cz}`,
        'rainbow_cloud',
        new THREE.Vector3(originX + cloudX, cloudY, originZ + cloudZ),
        3.5,
        rainbowCloud,
        'minor',
        true
      );
    }

    return chunk;
  }

  private registerCollidable(
    id: string,
    type: CollidableObject['type'],
    pos: THREE.Vector3,
    radius: number,
    mesh: THREE.Object3D,
    severity: CollisionSeverity,
    isAirObject: boolean
  ): void {
    if (this.collidables.length > 300) {
      this.collidables.shift();
    }
    this.collidables.push({
      id,
      type,
      position: pos,
      radius,
      mesh,
      severity,
      isAirObject,
      hitTimestamp: 0,
      originalScale: mesh.scale.clone(),
      isDestroyed: false,
      respawnTime: 0,
    });
  }

  /**
   * Check vehicle collisions in full 3D (X, Y, Z)
   */
  public checkCollisions(
    carPos: THREE.Vector3,
    carRadius = 2.2,
    isAirVehicle = false,
    onCollision: (severity: CollisionSeverity, isAirItem?: boolean) => void
  ): void {
    const now = performance.now();

    for (let i = 0; i < this.collidables.length; i++) {
      const obj = this.collidables[i];
      if (obj.isDestroyed || now - obj.hitTimestamp < 1500) continue;

      // Height check: if grounded car, ignore high air rings; if flying plane, check 3D distance
      const dy = carPos.y - obj.position.y;
      if (!isAirVehicle && obj.isAirObject) continue;
      if (Math.abs(dy) > (carRadius + obj.radius + 1.5)) continue;

      const distSq =
        Math.pow(carPos.x - obj.position.x, 2) +
        Math.pow(carPos.y - obj.position.y, 2) +
        Math.pow(carPos.z - obj.position.z, 2);
      const totalR = carRadius + obj.radius;

      if (distSq < totalR * totalR) {
        obj.hitTimestamp = now;
        this.destroyObject(obj);
        onCollision(obj.severity, obj.isAirObject);
      }
    }
  }

  public tick(delta: number, elapsed: number): void {
    const now = performance.now();

    // 1. Respawn destroyed objects after countdown
    for (let i = 0; i < this.collidables.length; i++) {
      const obj = this.collidables[i];
      if (obj.isDestroyed && now > obj.respawnTime) {
        obj.isDestroyed = false;
        obj.mesh.visible = true;
        obj.mesh.scale.set(0.01, 0.01, 0.01); // Pop back up
      } else if (!obj.isDestroyed && obj.mesh.scale.x < obj.originalScale.x * 0.98) {
        obj.mesh.scale.lerp(obj.originalScale, delta * 6.0);
      }
    }

    // 2. Animate tumbling debris pieces with gravity & rotation
    for (let i = this.activeDebris.length - 1; i >= 0; i--) {
      const d = this.activeDebris[i];
      d.life -= delta;

      d.mesh.position.addScaledVector(d.velocity, delta);
      d.velocity.y -= 14.0 * delta; // Gravity

      // Bounce on ground
      if (d.mesh.position.y < 0.2) {
        d.mesh.position.y = 0.2;
        d.velocity.y = -d.velocity.y * 0.4;
        d.velocity.x *= 0.8;
        d.velocity.z *= 0.8;
      }

      d.mesh.rotation.x += d.angularVelocity.x * delta;
      d.mesh.rotation.y += d.angularVelocity.y * delta;
      d.mesh.rotation.z += d.angularVelocity.z * delta;

      if (d.life <= 0) {
        this.scene.remove(d.mesh);
        d.mesh.geometry.dispose();
        this.activeDebris.splice(i, 1);
      }
    }

    // 3. Spin windmills
    for (let i = 0; i < this.animatedWindmills.length; i++) {
      this.animatedWindmills[i].rotation.z += delta * 1.5;
    }

    // 4. Bob and spin air objects (star rings and rainbow clouds)
    for (let i = 0; i < this.animatedAirObjects.length; i++) {
      const o = this.animatedAirObjects[i];
      o.mesh.position.y = o.startY + Math.sin(elapsed * o.speed + o.offset) * 1.8;
      o.mesh.rotation.y += delta * 1.2;
    }

    // 5. Update confetti particles
    if (this.confettiParticles) {
      const { velocities, rotations, life, mesh } = this.confettiParticles;
      const dummy = new THREE.Matrix4();
      const pos = new THREE.Vector3();
      const rot = new THREE.Euler();
      const scale = new THREE.Vector3();
      const quat = new THREE.Quaternion();
      let needsUpdate = false;

      for (let i = 0; i < this.maxConfetti; i++) {
        if (life[i] > 0) {
          life[i] -= delta * 1.1;
          needsUpdate = true;

          mesh.getMatrixAt(i, dummy);
          dummy.decompose(pos, quat, scale);

          pos.addScaledVector(velocities[i], delta);
          velocities[i].y -= 9.8 * delta;

          rot.set(rotations[i].x * life[i] * 12, rotations[i].y * life[i] * 12, rotations[i].z * life[i] * 12);
          quat.setFromEuler(rot);
          scale.setScalar(Math.max(0.01, life[i]));
          dummy.compose(pos, quat, scale);
          mesh.setMatrixAt(i, dummy);
        } else if (life[i] <= 0 && life[i] > -1) {
          life[i] = -2;
          dummy.setPosition(0, -999, 0);
          mesh.setMatrixAt(i, dummy);
          needsUpdate = true;
        }
      }
      if (needsUpdate) {
        mesh.instanceMatrix.needsUpdate = true;
      }
    }
  }

  // --- Procedural Mesh Builders ---

  private createStarRing(): THREE.Group {
    const group = new THREE.Group();
    // Glowing golden torus
    const ringGeo = new THREE.TorusGeometry(2.4, 0.35, 12, 24);
    const ring = new THREE.Mesh(ringGeo, this.goldStarMat);
    group.add(ring);

    // Star in center
    const starGeo = new THREE.OctahedronGeometry(0.8);
    const star = new THREE.Mesh(starGeo, this.goldStarMat);
    group.add(star);
    return group;
  }

  private createRainbowCloud(): THREE.Group {
    const group = new THREE.Group();
    const puffGeo = new THREE.SphereGeometry(2.0, 8, 8);
    const p1 = new THREE.Mesh(puffGeo, this.rainbowCloudMat);
    const p2 = new THREE.Mesh(puffGeo, this.rainbowCloudMat);
    p2.position.set(1.8, 0, 0);
    p2.scale.set(0.85, 0.85, 0.85);
    const p3 = new THREE.Mesh(puffGeo, this.rainbowCloudMat);
    p3.position.set(-1.8, 0, 0);
    p3.scale.set(0.8, 0.8, 0.8);
    group.add(p1, p2, p3);
    return group;
  }

  private createBarn(): THREE.Group {
    const group = new THREE.Group();
    const barn = new THREE.Mesh(new THREE.BoxGeometry(7, 4.5, 6), this.barnMat);
    barn.position.set(0, 2.25, 0);
    barn.castShadow = true;
    barn.receiveShadow = true;
    group.add(barn);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(5.2, 3.2, 4), this.roofMat);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.1, 1, 0.9);
    roof.position.set(0, 5.8, 0);
    roof.castShadow = true;
    group.add(roof);

    const door = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.2, 0.2), this.whiteTrimMat);
    door.position.set(0, 1.6, 3.05);
    group.add(door);
    return group;
  }

  private createWindmill(): { group: THREE.Group; blades: THREE.Object3D } {
    const group = new THREE.Group();
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2.6, 8, 8), this.whiteTrimMat);
    tower.position.set(0, 4, 0);
    tower.castShadow = true;
    group.add(tower);

    const cap = new THREE.Mesh(new THREE.ConeGeometry(1.9, 2.0, 8), this.roofMat);
    cap.position.set(0, 9.0, 0);
    group.add(cap);

    const bladesGroup = new THREE.Group();
    bladesGroup.position.set(0, 8.2, 1.6);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.4, 12), this.woodMat);
    hub.rotation.x = Math.PI / 2;
    bladesGroup.add(hub);

    const bladeGeo = new THREE.BoxGeometry(0.6, 3.6, 0.08);
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Mesh(bladeGeo, this.woodMat);
      blade.position.y = 1.8;
      const bladePivot = new THREE.Group();
      bladePivot.rotation.z = (i * Math.PI) / 2;
      bladePivot.add(blade);
      bladesGroup.add(bladePivot);
    }
    group.add(bladesGroup);
    return { group, blades: bladesGroup };
  }

  private createFence(): THREE.Group {
    const group = new THREE.Group();
    const postGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.3, 8);
    const post1 = new THREE.Mesh(postGeo, this.woodMat);
    post1.position.set(0, 0.65, -3.5);
    post1.castShadow = true;
    const post2 = new THREE.Mesh(postGeo, this.woodMat);
    post2.position.set(0, 0.65, 3.5);
    post2.castShadow = true;
    group.add(post1, post2);

    const railGeo = new THREE.BoxGeometry(0.1, 0.18, 7.2);
    const rail1 = new THREE.Mesh(railGeo, this.woodMat);
    rail1.position.set(0, 0.5, 0);
    const rail2 = new THREE.Mesh(railGeo, this.woodMat);
    rail2.position.set(0, 0.95, 0);
    group.add(rail1, rail2);
    return group;
  }

  private createHayBale(): THREE.Group {
    const group = new THREE.Group();
    const bale = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.6, 12), this.hayMat);
    bale.rotation.z = Math.PI / 2;
    bale.position.set(0, 0.9, 0);
    bale.castShadow = true;
    group.add(bale);
    return group;
  }

  private createAppleTree(): THREE.Group {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 2.5, 8), this.treeTrunkMat);
    trunk.position.set(0, 1.25, 0);
    trunk.castShadow = true;
    group.add(trunk);

    const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(1.6, 1), this.foliageMat);
    crown.position.set(0, 3.2, 0);
    crown.castShadow = true;
    group.add(crown);

    const appleGeo = new THREE.SphereGeometry(0.18, 8, 8);
    [[-0.8, 3.2, 0.9], [0.9, 3.0, 0.7], [-0.4, 2.7, -1.0], [0.7, 3.4, -0.6]].forEach(([x, y, z]) => {
      const apple = new THREE.Mesh(appleGeo, this.appleMat);
      apple.position.set(x, y, z);
      group.add(apple);
    });
    return group;
  }

  private createCow(): THREE.Group {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, 2.0), this.cowWhiteMat);
    body.position.set(0, 1.3, 0);
    body.castShadow = true;
    group.add(body);

    const spot = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.8), this.cowBlackMat);
    spot.position.set(0.45, 1.35, 0.2);
    group.add(spot);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.9), this.cowWhiteMat);
    head.position.set(0, 1.9, -1.1);
    group.add(head);

    const muzzle = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.4, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.5 })
    );
    muzzle.position.set(0, 1.7, -1.5);
    group.add(muzzle);

    const legGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.8, 8);
    [[-0.5, -0.7], [0.5, -0.7], [-0.5, 0.7], [0.5, 0.7]].forEach(([x, z]) => {
      const leg = new THREE.Mesh(legGeo, this.cowWhiteMat);
      leg.position.set(x, 0.4, z);
      group.add(leg);
    });
    return group;
  }
}
