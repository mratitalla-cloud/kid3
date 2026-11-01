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
  public speed = 0;        // Current forward speed (m/s)
  public verticalSpeed = 0;
  public isGrounded = true;
  public isFlipped = false;
  public temporaryBoost = 0; // Temporary boost (+/-) from physical sliding on table

  // LERP Targets from network packets
  private targetYaw = 0;
  private targetSpeed = 0;
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
    this.targetYaw = 0;
    this.currentYaw = 0;
    this.temporaryBoost = 0;
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
    // 1. Flip Detection (Tilt > 80 degrees)
    const tiltMag = Math.max(Math.abs(packet.beta), Math.abs(packet.gamma));
    if (tiltMag > 80) {
      if (!this.isFlipped) {
        this.isFlipped = true;
        this.speed = 0;
        this.targetSpeed = 0;
        this.temporaryBoost = 0;
        if (onFlip) onFlip('flip');
      }
      return;
    } else if (tiltMag < 35 && this.isFlipped) {
      this.isFlipped = false; // Recovered flat on table
    }

    if (this.isFlipped) return;

    // 2. Tabletop Z-Axis Alignment (Steering Yaw)
    // Relative to parent-calibrated baseline forward
    let deltaAngle = (packet.alpha - settings.baselineAlpha + 360) % 360;
    if (deltaAngle > 180) deltaAngle -= 360;

    // Deadzone application
    if (Math.abs(deltaAngle) < settings.deadzoneAngle) {
      deltaAngle = 0;
    }

    // Convert degrees to radians (negative for Three.js coordinate system where -Z is forward)
    this.targetYaw = (-deltaAngle * Math.PI) / 180;

    // 3. Longitudinal Acceleration & Auto-Cruise Dynamics
    const pushY = packet.accelY || 0;

    // Physical push forward gives instant temporary boost
    if (pushY > 0.2) {
      const impulse = (pushY - 0.2) * 4.0 * settings.sensitivity;
      this.temporaryBoost = Math.min(14.0, this.temporaryBoost + impulse);
    } else if (pushY < -0.2) {
      // Physical pull backward slows down
      const brakeImpulse = (pushY + 0.2) * 3.5 * settings.sensitivity;
      this.temporaryBoost = Math.max(-8.0, this.temporaryBoost + brakeImpulse);
    }

    // Touch drive or forward tilt adds extra propulsion
    if (packet.isDriving || (packet.throttle && packet.throttle > 0.1)) {
      this.temporaryBoost = Math.max(this.temporaryBoost, 6.0 * settings.sensitivity);
    } else if (packet.beta > 8 && packet.beta < 65) {
      const tiltDrive = ((packet.beta - 8) / 30) * 8.0 * settings.sensitivity;
      this.temporaryBoost = Math.max(this.temporaryBoost, tiltDrive);
    }

    if (settings.autoCruise) {
      // Auto-cruise maintains stable base speed without toddler needing to touch screen
      const cruiseBase = settings.cruiseSpeed;
      this.targetSpeed = Math.max(2.0, cruiseBase + this.temporaryBoost);
    } else {
      // Manual mode: car coasts unless pushed or throttled
      if (packet.throttle !== undefined && Math.abs(packet.throttle) > 0.05) {
        this.targetSpeed = packet.throttle * 16.0 * settings.sensitivity;
      } else if (packet.isDriving) {
        this.targetSpeed = 14.0 * settings.sensitivity;
      } else {
        this.targetSpeed = Math.max(0, this.temporaryBoost);
      }
    }

    // Clamp speed between reverse and top speed
    this.targetSpeed = THREE.MathUtils.clamp(this.targetSpeed, -8, 30);

    // 4. Momentum-Preserving Jump System (Upward lift/tap Z-axis impulse)
    const liftZ = packet.accelZ || 0;
    const now = performance.now();

    // Detect upward lift off table (> 3.5 m/s^2)
    if (liftZ > 3.5 && this.isGrounded && now - this.jumpCooldown > 800) {
      this.verticalSpeed = 12.0; // Jump impulse
      this.isGrounded = false;
      this.jumpCooldown = now;
      if (onJump) onJump();
    }
  }

  /**
   * Keyboard controls fallback for desktop testing / parents
   */
  public applyKeyboardInput(
    forward: number, // -1 (back) to +1 (forward)
    steer: number,   // -1 (left) to +1 (right)
    jump: boolean,
    settings: ParentSettings,
    onJump?: () => void
  ): void {
    if (steer !== 0) {
      this.targetYaw += -steer * 0.045 * settings.sensitivity;
    }

    if (forward !== 0) {
      if (forward > 0) {
        this.temporaryBoost = Math.min(14.0, this.temporaryBoost + 8.0);
      } else {
        this.temporaryBoost = Math.max(-8.0, this.temporaryBoost - 8.0);
      }
    }

    if (jump && this.isGrounded && performance.now() - this.jumpCooldown > 700) {
      this.verticalSpeed = 12.0;
      this.isGrounded = false;
      this.jumpCooldown = performance.now();
      if (onJump) onJump();
    }
  }

  /**
   * 60 FPS physics tick with exponential LERP smoothing & rolling toy friction
   */
  public tick(
    delta: number,
    rootGroup: THREE.Group,
    autoCruise = true,
    cruiseSpeed = 10,
    onLanding?: () => void
  ): void {
    // 1. Smooth yaw with angle wrap handling
    const diff = (this.targetYaw - this.currentYaw + Math.PI * 3) % (Math.PI * 2) - Math.PI;
    this.currentYaw += diff * Math.min(1.0, delta * 14.0); // Responsive, smooth heading

    // 2. Decay temporary boost back to 0 over 2-3 seconds
    this.temporaryBoost = THREE.MathUtils.damp(this.temporaryBoost, 0, 1.8, delta);

    // If auto-cruise is active and not manually throttled, target speed reflects base + boost
    if (autoCruise) {
      const target = Math.max(2.0, cruiseSpeed + this.temporaryBoost);
      this.speed = THREE.MathUtils.damp(this.speed, target, 5.0, delta);
    } else {
      this.speed = THREE.MathUtils.damp(this.speed, this.targetSpeed, 5.0, delta);
      this.targetSpeed *= Math.exp(-0.45 * delta);
    }

    // 3. Position update along current heading
    // In Three.js -Z is forward
    const forwardX = -Math.sin(this.currentYaw);
    const forwardZ = -Math.cos(this.currentYaw);

    this.position.x += forwardX * this.speed * delta;
    this.position.z += forwardZ * this.speed * delta;

    // 4. Vertical physics & Jump handling (Zero forward speed loss)
    if (!this.isGrounded) {
      this.verticalSpeed -= 26.0 * delta; // Gravity
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
      const turnRoll = -diff * Math.min(1.0, Math.abs(this.speed) / 12);
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
      this.propeller.rotation.z += (20 + Math.abs(this.speed) * 3) * delta;
    }
  }
}
