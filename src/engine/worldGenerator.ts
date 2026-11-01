/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { CollisionSeverity } from '../types/game';

export interface CollidableObject {
  position: THREE.Vector3;
  radius: number;
  mesh: THREE.Object3D;
  severity: CollisionSeverity;
  hitTimestamp: number;
  originalScale: THREE.Vector3;
}

export class WorldGenerator {
  public scene: THREE.Scene;
  private chunkSize = 70;
  private activeChunks = new Map<string, THREE.Group>();
  private collidables: CollidableObject[] = [];
  private animatedWindmills: THREE.Object3D[] = [];
  private animatedBalloons: { mesh: THREE.Object3D; startY: number; speed: number; offset: number }[] = [];
  private confettiParticles: {
    mesh: THREE.InstancedMesh;
    velocities: THREE.Vector3[];
    rotations: THREE.Vector3[];
    life: number[];
  } | null = null;
  private maxConfetti = 200;

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
  private cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, transparent: true, opacity: 0.88 });
  private cowWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
  private cowBlackMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initConfettiSystem();
  }

  private initConfettiSystem(): void {
    const geo = new THREE.PlaneGeometry(0.35, 0.35);
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

  /**
   * Explode burst of joyful confetti when vehicle bumps an object
   */
  public triggerConfetti(center: THREE.Vector3, count = 25): void {
    if (!this.confettiParticles) return;

    const { velocities, rotations, life, mesh } = this.confettiParticles;
    const dummy = new THREE.Matrix4();
    let spawned = 0;

    for (let i = 0; i < this.maxConfetti && spawned < count; i++) {
      if (life[i] <= 0) {
        dummy.setPosition(
          center.x + (Math.random() - 0.5) * 0.8,
          center.y + 0.8 + Math.random() * 0.6,
          center.z + (Math.random() - 0.5) * 0.8
        );
        mesh.setMatrixAt(i, dummy);

        velocities[i].set(
          (Math.random() - 0.5) * 8,
          4 + Math.random() * 6,
          (Math.random() - 0.5) * 8
        );
        rotations[i].set(
          Math.random() * 0.3,
          Math.random() * 0.3,
          Math.random() * 0.3
        );
        life[i] = 1.0 + Math.random() * 0.5;
        spawned++;
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Update chunk loading around vehicle position
   */
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

    // Ground Plane with subtle rolling terrain
    const groundGeo = new THREE.PlaneGeometry(this.chunkSize, this.chunkSize, 8, 8);
    groundGeo.rotateX(-Math.PI / 2);
    const ground = new THREE.Mesh(groundGeo, this.grassMat);
    ground.position.set(this.chunkSize / 2, -0.05, this.chunkSize / 2);
    ground.receiveShadow = true;
    chunk.add(ground);

    // Dirt country path cutting through chunk
    const pathGeo = new THREE.PlaneGeometry(7.0, this.chunkSize + 1);
    pathGeo.rotateX(-Math.PI / 2);
    const path = new THREE.Mesh(pathGeo, this.dirtRoadMat);
    path.position.set(this.chunkSize / 2, 0.02, this.chunkSize / 2);
    path.receiveShadow = true;
    chunk.add(path);

    // Deterministic pseudo-random seed based on chunk coordinate
    const seed = Math.sin(cx * 12.9898 + cz * 78.233) * 43758.5453;
    const rand = (offset: number) => {
      const x = Math.sin(seed + offset) * 10000;
      return x - Math.floor(x);
    };

    // 1. Red Farm Barn with Silo (on some chunks)
    if (rand(1) > 0.45) {
      const barnX = rand(2) > 0.5 ? 14 : this.chunkSize - 14;
      const barnZ = 15 + rand(3) * (this.chunkSize - 30);
      const barn = this.createBarn();
      barn.position.set(barnX, 0, barnZ);
      chunk.add(barn);

      this.registerCollidable(
        new THREE.Vector3(originX + barnX, 0, originZ + barnZ),
        5.5,
        barn,
        'major'
      );
    }

    // 2. Spinning Country Windmill
    if (rand(4) > 0.6) {
      const millX = rand(5) > 0.5 ? 16 : this.chunkSize - 16;
      const millZ = 12 + rand(6) * (this.chunkSize - 24);
      const { group: windmill, blades } = this.createWindmill();
      windmill.position.set(millX, 0, millZ);
      chunk.add(windmill);
      this.animatedWindmills.push(blades);

      this.registerCollidable(
        new THREE.Vector3(originX + millX, 0, originZ + millZ),
        3.5,
        windmill,
        'major'
      );
    }

    // 3. Wooden Split-Rail Fences along road
    const fenceStep = 8;
    for (let fz = 4; fz < this.chunkSize - 4; fz += fenceStep) {
      // Left side fence
      const fenceL = this.createFence();
      fenceL.position.set(this.chunkSize / 2 - 5.5, 0, fz);
      chunk.add(fenceL);
      this.registerCollidable(
        new THREE.Vector3(originX + this.chunkSize / 2 - 5.5, 0, originZ + fz),
        1.8,
        fenceL,
        'minor'
      );

      // Right side fence
      const fenceR = this.createFence();
      fenceR.position.set(this.chunkSize / 2 + 5.5, 0, fz);
      chunk.add(fenceR);
      this.registerCollidable(
        new THREE.Vector3(originX + this.chunkSize / 2 + 5.5, 0, originZ + fz),
        1.8,
        fenceR,
        'minor'
      );
    }

    // 4. Hay Bales & Golden Stacks
    const numHay = Math.floor(4 * density);
    for (let i = 0; i < numHay; i++) {
      const hx = 6 + rand(10 + i) * (this.chunkSize - 12);
      // Keep off center road
      if (Math.abs(hx - this.chunkSize / 2) > 6) {
        const hz = 6 + rand(20 + i) * (this.chunkSize - 12);
        const hay = this.createHayBale();
        hay.position.set(hx, 0, hz);
        chunk.add(hay);

        this.registerCollidable(
          new THREE.Vector3(originX + hx, 0, originZ + hz),
          2.0,
          hay,
          'minor'
        );
      }
    }

    // 5. Apple Trees & Lush Countryside Foliage
    const numTrees = Math.floor(7 * density);
    for (let i = 0; i < numTrees; i++) {
      const tx = 5 + rand(30 + i) * (this.chunkSize - 10);
      if (Math.abs(tx - this.chunkSize / 2) > 7) {
        const tz = 5 + rand(40 + i) * (this.chunkSize - 10);
        const tree = this.createAppleTree();
        tree.position.set(tx, 0, tz);
        chunk.add(tree);

        this.registerCollidable(
          new THREE.Vector3(originX + tx, 0, originZ + tz),
          2.2,
          tree,
          'minor'
        );
      }
    }

    // 6. Cute Grazing Cows & Sheep
    if (rand(50) > 0.35) {
      const cowX = rand(51) > 0.5 ? 20 : this.chunkSize - 20;
      const cowZ = 10 + rand(52) * (this.chunkSize - 20);
      const cow = this.createCow();
      cow.position.set(cowX, 0, cowZ);
      chunk.add(cow);
      this.registerCollidable(
        new THREE.Vector3(originX + cowX, 0, originZ + cowZ),
        2.0,
        cow,
        'minor'
      );
    }

    // 7. Sky Objects: Puffy Cartoon Clouds & Hot Air Balloon
    for (let c = 0; c < 3; c++) {
      const cloud = this.createCloud();
      cloud.position.set(
        rand(60 + c) * this.chunkSize,
        18 + rand(70 + c) * 12,
        rand(80 + c) * this.chunkSize
      );
      chunk.add(cloud);
    }

    if (rand(90) > 0.5) {
      const balloon = this.createHotAirBalloon();
      const bx = rand(91) * this.chunkSize;
      const bz = rand(92) * this.chunkSize;
      const by = 22 + rand(93) * 10;
      balloon.position.set(bx, by, bz);
      chunk.add(balloon);
      this.animatedBalloons.push({
        mesh: balloon,
        startY: by,
        speed: 0.8 + rand(94) * 0.8,
        offset: rand(95) * Math.PI * 2,
      });
    }

    return chunk;
  }

  private registerCollidable(
    pos: THREE.Vector3,
    radius: number,
    mesh: THREE.Object3D,
    severity: CollisionSeverity
  ): void {
    // Keep max 250 collidables
    if (this.collidables.length > 250) {
      this.collidables.shift();
    }
    this.collidables.push({
      position: pos,
      radius,
      mesh,
      severity,
      hitTimestamp: 0,
      originalScale: mesh.scale.clone(),
    });
  }

  /**
   * Check vehicle collision against nearby objects
   */
  public checkCollisions(
    carPos: THREE.Vector3,
    carRadius = 2.0,
    onCollision: (severity: CollisionSeverity) => void
  ): void {
    const now = performance.now();

    for (let i = 0; i < this.collidables.length; i++) {
      const obj = this.collidables[i];
      if (now - obj.hitTimestamp < 1200) continue; // Cooldown per object

      const distSq =
        Math.pow(carPos.x - obj.position.x, 2) + Math.pow(carPos.z - obj.position.z, 2);
      const totalR = carRadius + obj.radius;

      if (distSq < totalR * totalR) {
        obj.hitTimestamp = now;
        this.triggerConfetti(obj.position, obj.severity === 'major' ? 35 : 18);
        onCollision(obj.severity);

        // Cartoon bounce/squash animation
        obj.mesh.scale.set(
          obj.originalScale.x * 1.35,
          obj.originalScale.y * 0.7,
          obj.originalScale.z * 1.35
        );
      }
    }
  }

  /**
   * Update animation loop for windmills, clouds, and squashed objects
   */
  public tick(delta: number, elapsed: number): void {
    // Spin windmills
    for (let i = 0; i < this.animatedWindmills.length; i++) {
      this.animatedWindmills[i].rotation.z += delta * 1.4;
    }

    // Bob hot air balloons
    for (let i = 0; i < this.animatedBalloons.length; i++) {
      const b = this.animatedBalloons[i];
      b.mesh.position.y = b.startY + Math.sin(elapsed * b.speed + b.offset) * 2.5;
      b.mesh.rotation.y += delta * 0.2;
    }

    // Spring back squashed collidable meshes
    for (let i = 0; i < this.collidables.length; i++) {
      const obj = this.collidables[i];
      if (obj.mesh.scale.y < obj.originalScale.y * 0.99) {
        obj.mesh.scale.lerp(obj.originalScale, delta * 8.0);
      }
    }

    // Update confetti particles
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
          life[i] -= delta * 1.2;
          needsUpdate = true;

          mesh.getMatrixAt(i, dummy);
          dummy.decompose(pos, quat, scale);

          pos.addScaledVector(velocities[i], delta);
          velocities[i].y -= 9.8 * delta; // gravity

          rot.set(
            rotations[i].x * life[i] * 10,
            rotations[i].y * life[i] * 10,
            rotations[i].z * life[i] * 10
          );
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

  private createBarn(): THREE.Group {
    const group = new THREE.Group();

    // Main Barn Body
    const barnGeo = new THREE.BoxGeometry(7, 4.5, 6);
    const barn = new THREE.Mesh(barnGeo, this.barnMat);
    barn.position.set(0, 2.25, 0);
    barn.castShadow = true;
    barn.receiveShadow = true;
    group.add(barn);

    // Barn Gambrel Roof
    const roofGeo = new THREE.ConeGeometry(5.2, 3.2, 4);
    const roof = new THREE.Mesh(roofGeo, this.roofMat);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.1, 1, 0.9);
    roof.position.set(0, 5.8, 0);
    roof.castShadow = true;
    group.add(roof);

    // White Cross Doors
    const doorGeo = new THREE.BoxGeometry(2.4, 3.2, 0.2);
    const door = new THREE.Mesh(doorGeo, this.whiteTrimMat);
    door.position.set(0, 1.6, 3.05);
    group.add(door);

    // Silver Silo
    const siloMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.2, metalness: 0.8 });
    const siloBody = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 6.5, 16), siloMat);
    siloBody.position.set(4.8, 3.25, 0);
    siloBody.castShadow = true;
    const siloDome = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2), siloMat);
    siloDome.position.set(4.8, 6.5, 0);
    group.add(siloBody, siloDome);

    return group;
  }

  private createWindmill(): { group: THREE.Group; blades: THREE.Object3D } {
    const group = new THREE.Group();

    // Tower base
    const towerGeo = new THREE.CylinderGeometry(1.5, 2.6, 8, 8);
    const tower = new THREE.Mesh(towerGeo, this.whiteTrimMat);
    tower.position.set(0, 4, 0);
    tower.castShadow = true;
    group.add(tower);

    // Cap
    const cap = new THREE.Mesh(new THREE.ConeGeometry(1.9, 2.0, 8), this.roofMat);
    cap.position.set(0, 9.0, 0);
    group.add(cap);

    // Blades assembly
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

    // 2 Vertical posts
    const postGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.3, 8);
    const post1 = new THREE.Mesh(postGeo, this.woodMat);
    post1.position.set(0, 0.65, -3.5);
    post1.castShadow = true;
    const post2 = new THREE.Mesh(postGeo, this.woodMat);
    post2.position.set(0, 0.65, 3.5);
    post2.castShadow = true;
    group.add(post1, post2);

    // 2 Horizontal rails
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
    const baleGeo = new THREE.CylinderGeometry(0.9, 0.9, 1.6, 12);
    const bale = new THREE.Mesh(baleGeo, this.hayMat);
    bale.rotation.z = Math.PI / 2;
    bale.position.set(0, 0.9, 0);
    bale.castShadow = true;
    group.add(bale);
    return group;
  }

  private createAppleTree(): THREE.Group {
    const group = new THREE.Group();

    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.35, 0.5, 2.5, 8);
    const trunk = new THREE.Mesh(trunkGeo, this.treeTrunkMat);
    trunk.position.set(0, 1.25, 0);
    trunk.castShadow = true;
    group.add(trunk);

    // Foliage Puffs
    const puffGeo = new THREE.DodecahedronGeometry(1.6, 1);
    const crown = new THREE.Mesh(puffGeo, this.foliageMat);
    crown.position.set(0, 3.2, 0);
    crown.castShadow = true;
    group.add(crown);

    // Red Apples
    const appleGeo = new THREE.SphereGeometry(0.18, 8, 8);
    const applePositions = [
      [-0.8, 3.2, 0.9],
      [0.9, 3.0, 0.7],
      [-0.4, 2.7, -1.0],
      [0.7, 3.4, -0.6],
    ];
    applePositions.forEach(([x, y, z]) => {
      const apple = new THREE.Mesh(appleGeo, this.appleMat);
      apple.position.set(x, y, z);
      group.add(apple);
    });

    return group;
  }

  private createCow(): THREE.Group {
    const group = new THREE.Group();

    // Cow body
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, 2.0), this.cowWhiteMat);
    body.position.set(0, 1.3, 0);
    body.castShadow = true;
    group.add(body);

    // Black spots
    const spot = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.8), this.cowBlackMat);
    spot.position.set(0.45, 1.35, 0.2);
    group.add(spot);

    // Cow head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.9), this.cowWhiteMat);
    head.position.set(0, 1.9, -1.1);
    group.add(head);

    // Pink muzzle
    const muzzle = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.4, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.5 })
    );
    muzzle.position.set(0, 1.7, -1.5);
    group.add(muzzle);

    // 4 Legs
    const legGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.8, 8);
    [
      [-0.5, -0.7],
      [0.5, -0.7],
      [-0.5, 0.7],
      [0.5, 0.7],
    ].forEach(([x, z]) => {
      const leg = new THREE.Mesh(legGeo, this.cowWhiteMat);
      leg.position.set(x, 0.4, z);
      group.add(leg);
    });

    return group;
  }

  private createCloud(): THREE.Group {
    const group = new THREE.Group();
    const puffGeo = new THREE.SphereGeometry(2.4, 8, 8);

    const p1 = new THREE.Mesh(puffGeo, this.cloudMat);
    const p2 = new THREE.Mesh(puffGeo, this.cloudMat);
    p2.position.set(2.2, -0.4, 0);
    p2.scale.set(0.8, 0.8, 0.8);
    const p3 = new THREE.Mesh(puffGeo, this.cloudMat);
    p3.position.set(-2.0, -0.3, 0);
    p3.scale.set(0.75, 0.75, 0.75);

    group.add(p1, p2, p3);
    return group;
  }

  private createHotAirBalloon(): THREE.Group {
    const group = new THREE.Group();

    // Striped Balloon Envelope
    const balloonMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 });
    const envelope = new THREE.Mesh(new THREE.SphereGeometry(3.5, 16, 16), balloonMat);
    envelope.scale.set(1, 1.3, 1);
    envelope.position.set(0, 4.5, 0);
    envelope.castShadow = true;
    group.add(envelope);

    // Wicker Basket
    const basket = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 1.2), this.woodMat);
    basket.position.set(0, -0.5, 0);
    basket.castShadow = true;
    group.add(basket);

    return group;
  }
}
