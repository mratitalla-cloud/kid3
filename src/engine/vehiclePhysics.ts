/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { MotionPacket, ParentSettings, CollisionSeverity } from '../types/game';

export class VehiclePhysics {
  public position = new THREE.Vector3(0, 0, 0);
  public velocity = new THREE.Vector3(0, 0, 0);
  public headingAngle = 0; // Target yaw in radians
  public currentYaw = 0;   // Smoothed yaw in radians
  public speed = 0;        // Forward speed
  public verticalSpeed = 0;
  public isGrounded = true;
  public isFlipped = false;

  // LERP Targets from network packets
  private targetYaw = 0;
  private targetSpeed = 0;
  private lastPacketTimestamp = 0;
  private jumpCooldown = 0;

  // Wheel and propeller references for visual animation
  public wheels: THREE.Object3D[] = [];
  public propeller: THREE.Object3D | null = null;
  public smokeEmitter: THREE.Object3D | null = null;

  public reset(spawnPos = new THREE.Vector3(0, 0, 0)): void {
    this.position.copy(spawnPos);
    this.velocity.set(0, 0, 0);
    this.speed = 0;
    this.verticalSpeed = 0;
    this.isGrounded = true;
    this.isFlipped = false;
    this.targetSpeed = 0;
  }

  /**
   * Process 60Hz incoming motion packet from mobile controller
   */
  public processMotionPacket(
    packet: MotionPacket,
    settings: ParentSettings,
    onJump?: () => void,
    onFlip?: (severity: CollisionSeverity) => void
  ): void {
    this.lastPacketTimestamp = performance.now();

    // 1. Flip Detection (Tilt > 80 degrees)
    const tiltMag = Math.max(Math.abs(packet.beta), Math.abs(packet.gamma));
    if (tiltMag > 80) {
      if (!this.isFlipped) {
        this.isFlipped = true;
        this.speed = 0;
        this.targetSpeed = 0;
        if (onFlip) onFlip('flip');
      }
      return;
    } else if (tiltMag < 35 && this.isFlipped) {
      this.isFlipped = false; // Recovered flat on table
    }

    if (this.isFlipped) return;

    // 2. Tabletop Z-Axis Alignment (Steering Yaw)
    // Angle relative to parent-calibrated baseline forward
    let deltaAngle = (packet.alpha - settings.baselineAlpha + 360) % 360;
    if (deltaAngle > 180) deltaAngle -= 360;

    // Deadzone application
    if (Math.abs(deltaAngle) < settings.deadzoneAngle) {
      deltaAngle = 0;
    }

    // Convert degrees to radians (negative for Three.js coordinate system where -Z is forward)
    this.targetYaw = (-deltaAngle * Math.PI) / 180;

    // 3. Longitudinal Push/Pull Acceleration (Sliding phone across table)
    // Positive accelY pushes forward, negative pulls back
    const pushY = packet.accelY || 0;
    const accelThreshold = 0.4;

    if (Math.abs(pushY) > accelThreshold) {
      const pushMagnitude = (pushY - Math.sign(pushY) * accelThreshold) * settings.sensitivity;
      this.targetSpeed += pushMagnitude * 0.4;
    } else {
      // Gentle decay when not actively pushed
      this.targetSpeed *= 0.95;
    }

    // Clamp speed based on vehicle limits
    this.targetSpeed = THREE.MathUtils.clamp(this.targetSpeed, -8, 28);

    // 4. Momentum-Preserving Jump System (Upward lift/tap Z-axis impulse)
    const liftZ = packet.accelZ || 0;
    const now = performance.now();

    if (liftZ > 5.5 && this.isGrounded && now - this.jumpCooldown > 800) {
      this.verticalSpeed = 12.0; // Jump impulse
      this.isGrounded = false;
      this.jumpCooldown = now;
      if (onJump) onJump();
    }
  }

  /**
   * 60 FPS physics tick with exponential LERP smoothing
   */
  public tick(
    delta: number,
    rootGroup: THREE.Group,
    onLanding?: () => void
  ): void {
    // 1. Smooth yaw with angle wrap handling
    const diff = (this.targetYaw - this.currentYaw + Math.PI * 3) % (Math.PI * 2) - Math.PI;
    this.currentYaw += diff * Math.min(1.0, delta * 12.0); // Silky exponential LERP

    // 2. Smooth forward speed LERP
    this.speed = THREE.MathUtils.damp(this.speed, this.targetSpeed, 7.0, delta);

    // Natural friction
    this.targetSpeed *= Math.exp(-0.6 * delta);

    // 3. Position update along current heading
    const forwardX = -Math.sin(this.currentYaw);
    const forwardZ = -Math.cos(this.currentYaw);

    this.position.x += forwardX * this.speed * delta;
    this.position.z += forwardZ * this.speed * delta;

    // 4. Vertical physics & Jump handling (Zero forward speed loss)
    if (!this.isGrounded) {
      this.verticalSpeed -= 28.0 * delta; // Gravity
      this.position.y += this.verticalSpeed * delta;

      if (this.position.y <= 0) {
        this.position.y = 0;
        this.verticalSpeed = 0;
        this.isGrounded = true;
        if (onLanding) onLanding();
      }
    }

    // 5. Apply transforms to 3D root mesh
    rootGroup.position.copy(this.position);
    rootGroup.rotation.y = this.currentYaw;

    // Visual side-tilt / flip animation
    if (this.isFlipped) {
      rootGroup.rotation.z = THREE.MathUtils.damp(rootGroup.rotation.z, 1.4, 8.0, delta);
    } else {
      // Subtle cartoon chassis roll into turns
      const turnRoll = -diff * (this.speed / 15);
      rootGroup.rotation.z = THREE.MathUtils.damp(rootGroup.rotation.z, turnRoll, 10.0, delta);
    }

    // 6. Animate Wheels roll
    if (this.wheels.length > 0 && Math.abs(this.speed) > 0.05) {
      const wheelRoll = (this.speed / 0.5) * delta;
      for (let i = 0; i < this.wheels.length; i++) {
        this.wheels[i].rotation.x += wheelRoll;
      }
    }

    // 7. Animate Spinning Propeller
    if (this.propeller) {
      this.propeller.rotation.z += (20 + Math.abs(this.speed) * 2) * delta;
    }
  }
}
