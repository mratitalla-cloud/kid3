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

  // Flight Mechanics for Aircraft (Plane / Jet)
  public isAirVehicle = false;
  public altitude = 14.0;       // Current flight altitude
  public targetAltitude = 14.0; // Target altitude based on phone tilt
  public pitchAngle = 0;        // Nose pitch up/down
  public rollAngle = 0;         // Wing bank roll

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
    this.isGrounded = !this.isAirVehicle;
    this.isFlipped = false;
    this.targetSpeed = 0;
    this.targetYaw = 0;
    this.currentYaw = 0;
    this.temporaryBoost = 0;
    this.altitude = this.isAirVehicle ? 14.0 : 0;
    this.targetAltitude = this.altitude;
    this.pitchAngle = 0;
    this.rollAngle = 0;
  }

  public setVehicleType(type: 'ground' | 'air'): void {
    this.isAirVehicle = type === 'air';
    if (this.isAirVehicle) {
      this.targetAltitude = 14.0;
      this.isGrounded = false;
    } else {
      this.targetAltitude = 0;
      this.altitude = 0;
      this.isGrounded = true;
      this.pitchAngle = 0;
      this.rollAngle = 0;
    }
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
    // 1. Flip Detection (Extreme tilt > 80 degrees)
    const tiltMag = Math.max(Math.abs(packet.beta), Math.abs(packet.gamma));
    if (tiltMag > 80 && !this.isAirVehicle) {
      if (!this.isFlipped) {
        this.isFlipped = true;
        this.speed = 0;
        this.targetSpeed = 0;
        this.temporaryBoost = 0;
        if (onFlip) onFlip('flip');
      }
      return;
    } else if (tiltMag < 35 && this.isFlipped) {
      this.isFlipped = false;
    }

    if (this.isFlipped) return;

    // 2. Tabletop Z-Axis Alignment (Steering Yaw)
    let deltaAngle = (packet.alpha - settings.baselineAlpha + 360) % 360;
    if (deltaAngle > 180) deltaAngle -= 360;

    if (Math.abs(deltaAngle) < settings.deadzoneAngle) {
      deltaAngle = 0;
    }
    this.targetYaw = (-deltaAngle * Math.PI) / 180;

    // 3. 3D Flight Control: Phone Pitch (Beta) controls Altitude & Nose angle for planes
    if (this.isAirVehicle) {
      // Tilting phone back / up (beta > 0) climbs; tilting forward / down (beta < 0) dives!
      const pitchInput = packet.beta || 0;
      // Normal flat is around 0. Pitch up: 10 to 45 deg -> altitude climbs up to 32m
      // Pitch down: -5 to -35 deg -> altitude dives toward 2m
      const normPitch = THREE.MathUtils.clamp(pitchInput / 30.0, -1.0, 1.0);
      this.targetAltitude = 14.0 + normPitch * 14.0; // Between 2m and 28m
      this.targetAltitude = THREE.MathUtils.clamp(this.targetAltitude, 2.0, 32.0);
    }

    // 4. Longitudinal Acceleration & Auto-Cruise Dynamics
    const pushY = packet.accelY || 0;

    if (pushY > 0.2) {
      const impulse = (pushY - 0.2) * 4.0 * settings.sensitivity;
      this.temporaryBoost = Math.min(14.0, this.temporaryBoost + impulse);
    } else if (pushY < -0.2) {
      const brakeImpulse = (pushY + 0.2) * 3.5 * settings.sensitivity;
      this.temporaryBoost = Math.max(-8.0, this.temporaryBoost + brakeImpulse);
    }

    if (packet.isDriving || (packet.throttle && packet.throttle > 0.1)) {
      this.temporaryBoost = Math.max(this.temporaryBoost, 6.0 * settings.sensitivity);
    }

    if (settings.autoCruise) {
      const cruiseBase = this.isAirVehicle ? settings.cruiseSpeed * 1.25 : settings.cruiseSpeed;
      this.targetSpeed = Math.max(3.0, cruiseBase + this.temporaryBoost);
    } else {
      if (packet.throttle !== undefined && Math.abs(packet.throttle) > 0.05) {
        this.targetSpeed = packet.throttle * 16.0 * settings.sensitivity;
      } else if (packet.isDriving) {
        this.targetSpeed = 14.0 * settings.sensitivity;
      } else {
        this.targetSpeed = Math.max(0, this.temporaryBoost);
      }
    }

    this.targetSpeed = THREE.MathUtils.clamp(this.targetSpeed, -8, 32);

    // 5. Jump Impulse (For ground vehicles, or rocket burst for planes)
    const liftZ = packet.accelZ || 0;
    const now = performance.now();

    if (liftZ > 3.5 && now - this.jumpCooldown > 800) {
      if (!this.isAirVehicle && this.isGrounded) {
        this.verticalSpeed = 12.0;
        this.isGrounded = false;
        this.jumpCooldown = now;
        if (onJump) onJump();
      } else if (this.isAirVehicle) {
        // Plane speed burst / loop-de-loop
        this.temporaryBoost = Math.min(18.0, this.temporaryBoost + 8.0);
        this.jumpCooldown = now;
        if (onJump) onJump();
      }
    }
  }

  /**
   * Keyboard controls fallback for desktop testing
   */
  public applyKeyboardInput(
    forward: number,
    steer: number,
    jump: boolean,
    settings: ParentSettings,
    onJump?: () => void
  ): void {
    if (steer !== 0) {
      this.targetYaw += -steer * 0.045 * settings.sensitivity;
    }

    if (forward !== 0) {
      if (this.isAirVehicle) {
        // Up/down arrow keys pitch plane altitude
        this.targetAltitude += forward * 0.6;
        this.targetAltitude = THREE.MathUtils.clamp(this.targetAltitude, 2.0, 32.0);
      } else {
        if (forward > 0) {
          this.temporaryBoost = Math.min(14.0, this.temporaryBoost + 8.0);
        } else {
          this.temporaryBoost = Math.max(-8.0, this.temporaryBoost - 8.0);
        }
      }
    }

    if (jump && performance.now() - this.jumpCooldown > 700) {
      if (!this.isAirVehicle && this.isGrounded) {
        this.verticalSpeed = 12.0;
        this.isGrounded = false;
      } else if (this.isAirVehicle) {
        this.targetAltitude = Math.min(30.0, this.targetAltitude + 8.0);
      }
      this.jumpCooldown = performance.now();
      if (onJump) onJump();
    }
  }

  /**
   * 60 FPS physics tick with true 3D flight & ground rolling
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
    this.currentYaw += diff * Math.min(1.0, delta * 14.0);

    // 2. Decay temporary boost back to 0
    this.temporaryBoost = THREE.MathUtils.damp(this.temporaryBoost, 0, 1.8, delta);

    // Speed target
    const base = this.isAirVehicle ? cruiseSpeed * 1.25 : cruiseSpeed;
    if (autoCruise) {
      const target = Math.max(3.0, base + this.temporaryBoost);
      this.speed = THREE.MathUtils.damp(this.speed, target, 5.0, delta);
    } else {
      this.speed = THREE.MathUtils.damp(this.speed, this.targetSpeed, 5.0, delta);
      this.targetSpeed *= Math.exp(-0.45 * delta);
    }

    // 3. Position update along current heading (-Z is forward)
    const forwardX = -Math.sin(this.currentYaw);
    const forwardZ = -Math.cos(this.currentYaw);

    this.position.x += forwardX * this.speed * delta;
    this.position.z += forwardZ * this.speed * delta;

    // 4. Vertical Physics (Ground jumping vs True Flight)
    if (this.isAirVehicle) {
      // 3D Flight altitude interpolation
      this.altitude = THREE.MathUtils.damp(this.altitude, this.targetAltitude, 3.5, delta);
      this.position.y = this.altitude;

      // Calculate pitch angle based on climb rate
      const altDelta = (this.targetAltitude - this.altitude);
      this.pitchAngle = THREE.MathUtils.damp(this.pitchAngle, altDelta * 0.08, 6.0, delta);
      rootGroup.rotation.x = this.pitchAngle;

      // Bank roll into turns
      this.rollAngle = THREE.MathUtils.damp(this.rollAngle, -diff * 1.8, 8.0, delta);
      rootGroup.rotation.z = this.rollAngle;
    } else {
      // Ground Vehicle Physics (Gravity & Jumping)
      rootGroup.rotation.x = 0;
      if (!this.isGrounded) {
        this.verticalSpeed -= 26.0 * delta;
        this.position.y += this.verticalSpeed * delta;

        if (this.position.y <= 0) {
          this.position.y = 0;
          this.verticalSpeed = 0;
          this.isGrounded = true;
          if (onLanding) onLanding();
        }
      }

      // Visual side-tilt / flip animation
      if (this.isFlipped) {
        rootGroup.rotation.z = THREE.MathUtils.damp(rootGroup.rotation.z, 1.4, 8.0, delta);
      } else {
        const turnRoll = -diff * Math.min(1.0, Math.abs(this.speed) / 12);
        rootGroup.rotation.z = THREE.MathUtils.damp(rootGroup.rotation.z, turnRoll, 10.0, delta);
      }
    }

    // Apply main transforms
    rootGroup.position.copy(this.position);
    rootGroup.rotation.y = this.currentYaw;

    // 5. Animate Wheels roll
    if (this.wheels.length > 0 && Math.abs(this.speed) > 0.05) {
      const wheelRoll = (this.speed / 0.5) * delta;
      for (let i = 0; i < this.wheels.length; i++) {
        this.wheels[i].rotation.x += wheelRoll;
      }
    }

    // 6. Animate Spinning Propeller
    if (this.propeller) {
      this.propeller.rotation.z += (35 + Math.abs(this.speed) * 3) * delta;
    }
  }
}
