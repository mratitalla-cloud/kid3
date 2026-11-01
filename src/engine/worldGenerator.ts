/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { CollisionSeverity } from '../types/game';
import { WorldDefinition } from '../worlds/types';
import { sunnyCountrysideWorld, getAllAvailableWorldIds } from '../worlds';

export interface DebrisPiece {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  life: number;
}

export type CollidableType =
  | 'barn'
  | 'windmill'
  | 'fence'
  | 'hay'
  | 'tree'
  | 'cow'
  | 'star_ring'
  | 'rainbow_cloud'
  | 'balloon'
  | 'candy'
  | 'dino'
  | 'crystal'
  | 'portal';

export interface CollidableObject {
  id: string;
  type: CollidableType;
  position: THREE.Vector3;
  radius: number;
  mesh: THREE.Object3D;
  severity: CollisionSeverity;
  isAirObject: boolean;
  hitTimestamp: number;
  originalScale: THREE.Vector3;
  isDestroyed: boolean;
  respawnTime: number;
  portalTargetWorldId?: string;
}

export class WorldGenerator {
  public scene: THREE.Scene;
  public currentWorld: WorldDefinition;
  private chunkSize = 70;
  private activeChunks = new Map<string, THREE.Group>();
  private collidables: CollidableObject[] = [];
  private activeDebris: DebrisPiece[] = [];
  private animatedProps: THREE.Object3D[] = [];
  private animatedAirObjects: { mesh: THREE.Object3D; startY: number; speed: number; offset: number }[] = [];

  // Confetti Particle Pool
  private confettiParticles: {
    mesh: THREE.InstancedMesh;
    velocities: THREE.Vector3[];
    rotations: THREE.Vector3[];
    life: number[];
  } | null = null;
  private maxConfetti = 240;

  // Cached materials for debris
  private woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 });
  private foliageMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.5 });
  private appleMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 });
  private hayMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.9 });
  private barnMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 });
  private candyMat = new THREE.MeshStandardMaterial({ color: 0xec4899, roughness: 0.3 });
  private boneMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.5 });
  private crystalMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, roughness: 0.2 });

  // Ground and road materials cached per world
  private groundMaterial: THREE.MeshStandardMaterial;
  private roadMaterial: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene, initialWorld: WorldDefinition = sunnyCountrysideWorld) {
    this.scene = scene;
    this.currentWorld = initialWorld;

    this.groundMaterial = new THREE.MeshStandardMaterial({
      color: initialWorld.groundColor,
      roughness: 0.8,
    });
    this.roadMaterial = new THREE.MeshStandardMaterial({
      color: initialWorld.roadColor,
      roughness: 0.85,
    });

    this.initConfettiSystem();
    this.applyWorldAtmosphere(initialWorld);
  }

  public setWorld(newWorld: WorldDefinition): void {
    this.currentWorld = newWorld;
    this.groundMaterial.color.setHex(newWorld.groundColor);
    this.roadMaterial.color.setHex(newWorld.roadColor);
    this.applyWorldAtmosphere(newWorld);
    this.clearAllChunks();
  }

  private applyWorldAtmosphere(world: WorldDefinition): void {
    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.setHex(world.skyColor);
    } else {
      this.scene.background = new THREE.Color(world.skyColor);
    }

    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.setHex(world.fogColor);
    } else {
      this.scene.fog = new THREE.FogExp2(world.fogColor, 0.012);
    }
  }

  public clearAllChunks(): void {
    for (const [, chunk] of this.activeChunks.entries()) {
      this.scene.remove(chunk);
    }
    this.activeChunks.clear();
    this.collidables = [];
    this.animatedProps = [];
    this.animatedAirObjects = [];
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
          center.x + (Math.random() - 0.5) * 1.5,
          center.y + 0.8 + Math.random() * 1.5,
          center.z + (Math.random() - 0.5) * 1.5
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
   * Shatters hit obstacles into tumbling 3D debris pieces with physics!
   */
  public destroyObject(obj: CollidableObject): void {
    obj.isDestroyed = true;
    obj.respawnTime = performance.now() + 8500; // Respawns after 8.5 seconds
    obj.mesh.visible = false; // Hide main structure

    this.triggerConfetti(obj.position, obj.severity === 'major' ? 50 : 30);
    const pos = obj.position;

    switch (obj.type) {
      case 'fence': {
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
        const wallGeo = new THREE.BoxGeometry(1.6, 1.2, 0.3);
        for (let i = 0; i < 6; i++) {
          const chunk = new THREE.Mesh(wallGeo, this.barnMat);
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

      case 'candy': {
        const candyGeo = new THREE.DodecahedronGeometry(0.6);
        for (let i = 0; i < 7; i++) {
          const candy = new THREE.Mesh(candyGeo, this.candyMat);
          candy.position.set(pos.x + (Math.random() - 0.5) * 2, pos.y + 1.8, pos.z + (Math.random() - 0.5) * 2);
          this.scene.add(candy);
          this.activeDebris.push({
            mesh: candy,
            velocity: new THREE.Vector3((Math.random() - 0.5) * 10, 6 + Math.random() * 6, (Math.random() - 0.5) * 10),
            angularVelocity: new THREE.Vector3(Math.random() * 9, Math.random() * 9, Math.random() * 9),
            life: 2.6,
          });
        }
        break;
      }

      case 'dino': {
        const boneGeo = new THREE.CylinderGeometry(0.2, 0.2, 1.2, 6);
        for (let i = 0; i < 5; i++) {
          const bone = new THREE.Mesh(boneGeo, this.boneMat);
          bone.position.set(pos.x + (Math.random() - 0.5) * 2, pos.y + 1.5, pos.z + (Math.random() - 0.5) * 2);
          this.scene.add(bone);
          this.activeDebris.push({
            mesh: bone,
            velocity: new THREE.Vector3((Math.random() - 0.5) * 9, 5 + Math.random() * 7, (Math.random() - 0.5) * 9),
            angularVelocity: new THREE.Vector3(Math.random() * 7, Math.random() * 7, Math.random() * 7),
            life: 2.8,
          });
        }
        break;
      }

      case 'crystal': {
        const shardGeo = new THREE.ConeGeometry(0.4, 1.4, 5);
        for (let i = 0; i < 6; i++) {
          const shard = new THREE.Mesh(shardGeo, this.crystalMat);
          shard.position.set(pos.x + (Math.random() - 0.5) * 2, pos.y + 2.0, pos.z + (Math.random() - 0.5) * 2);
          this.scene.add(shard);
          this.activeDebris.push({
            mesh: shard,
            velocity: new THREE.Vector3((Math.random() - 0.5) * 10, 6 + Math.random() * 6, (Math.random() - 0.5) * 10),
            angularVelocity: new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8),
            life: 3.0,
          });
        }
        break;
      }

      case 'portal': {
        // Portal vortex flashes and creates immense confetti ring
        this.triggerConfetti(pos, 60);
        break;
      }

      case 'cow': {
        obj.mesh.visible = true; // Comical backflip
        obj.mesh.position.y += 2.0;
        break;
      }

      case 'star_ring':
      case 'rainbow_cloud':
      case 'balloon': {
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

    // Ground Plane with current world theme
    const groundGeo = new THREE.PlaneGeometry(this.chunkSize, this.chunkSize, 6, 6);
    groundGeo.rotateX(-Math.PI / 2);
    const ground = new THREE.Mesh(groundGeo, this.groundMaterial);
    ground.position.set(this.chunkSize / 2, -0.05, this.chunkSize / 2);
    ground.receiveShadow = true;
    chunk.add(ground);

    // Country / Theme Dirt Road
    const pathGeo = new THREE.PlaneGeometry(7.0, this.chunkSize + 1);
    pathGeo.rotateX(-Math.PI / 2);
    const path = new THREE.Mesh(pathGeo, this.roadMaterial);
    path.position.set(this.chunkSize / 2, 0.02, this.chunkSize / 2);
    path.receiveShadow = true;
    chunk.add(path);

    const seed = Math.sin(cx * 12.9898 + cz * 78.233) * 43758.5453;
    const rand = (offset: number) => {
      const x = Math.sin(seed + offset) * 10000;
      return x - Math.floor(x);
    };

    const registerCollidable = (
      id: string,
      type: CollidableType,
      pos: THREE.Vector3,
      radius: number,
      mesh: THREE.Object3D,
      severity: CollisionSeverity,
      isAirObject: boolean,
      portalTargetWorldId?: string
    ) => {
      if (this.collidables.length > 350) {
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
        portalTargetWorldId,
      });

      if (isAirObject) {
        this.animatedAirObjects.push({
          mesh,
          startY: pos.y,
          speed: 0.6 + rand(1) * 0.4,
          offset: rand(2) * Math.PI,
        });
      }
    };

    // Spawn chunk objects using current world's procedural generator!
    const availableWorlds = getAllAvailableWorldIds();
    this.currentWorld.spawnChunkObjects(
      chunk,
      cx,
      cz,
      originX,
      originZ,
      this.chunkSize,
      density,
      rand,
      registerCollidable,
      availableWorlds
    );

    return chunk;
  }

  /**
   * Check vehicle collisions in full 3D (X, Y, Z), including portal warp detection!
   */
  public checkCollisions(
    carPos: THREE.Vector3,
    carRadius = 2.4,
    isAirVehicle = false,
    onCollision: (severity: CollisionSeverity, isAirItem?: boolean) => void,
    onPortalWarp?: (targetWorldId: string) => void
  ): void {
    const now = performance.now();

    for (let i = 0; i < this.collidables.length; i++) {
      const obj = this.collidables[i];
      if (obj.isDestroyed || now - obj.hitTimestamp < 1500) continue;

      // Check portal warp
      if (obj.type === 'portal') {
        const dx = carPos.x - obj.position.x;
        const dz = carPos.z - obj.position.z;
        const horizDist = Math.sqrt(dx * dx + dz * dz);
        if (horizDist < carRadius + obj.radius) {
          obj.hitTimestamp = now;
          this.destroyObject(obj);
          if (obj.portalTargetWorldId && onPortalWarp) {
            onPortalWarp(obj.portalTargetWorldId);
          }
          return;
        }
        continue;
      }

      // Height check: grounded cars ignore high air rings; flying planes check 3D distance
      const dy = carPos.y - obj.position.y;
      if (!isAirVehicle && obj.isAirObject) continue;
      if (Math.abs(dy) > carRadius + obj.radius + 1.5) continue;

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
        obj.mesh.scale.set(0.01, 0.01, 0.01);
      } else if (!obj.isDestroyed && obj.mesh.scale.x < obj.originalScale.x * 0.98) {
        obj.mesh.scale.lerp(obj.originalScale, delta * 6.0);
      }
    }

    // 2. Animate tumbling debris pieces with gravity & bounce
    for (let i = this.activeDebris.length - 1; i >= 0; i--) {
      const d = this.activeDebris[i];
      d.life -= delta;

      d.mesh.position.addScaledVector(d.velocity, delta);
      d.velocity.y -= 14.0 * delta; // Gravity

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

    // 3. Animated windmills & props
    for (let i = 0; i < this.animatedProps.length; i++) {
      this.animatedProps[i].rotation.z += delta * 1.5;
    }

    // 4. Bob and spin air objects
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
}
