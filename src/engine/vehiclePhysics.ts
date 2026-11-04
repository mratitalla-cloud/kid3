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
  public targetPitch = 0;       // Target pitch angle (full 360° range for loops/backflips)
  public targetRoll = 0;        // Target roll angle (full 360° range for barrel rolls)

  // LERP Targets from network packets
  private targetYaw = 0;
  private targetSpeed = 0;
  private jumpCooldown = 0;

  // Wheel and propeller references for visual animation
  public wheels: THREE.Object3D[] = [];
  public propeller: THREE.Object3D | null = null;
  public smokeEmitter: THREE.Object3D | null = null;

  // Interactive Power-Ups & Booster State
  public powerUpActive: 'giant' | 'rainbow' | 'coins' | null = null;
  public powerUpEndTime = 0;
  public currentScale = 1.0;
  public turboTrailActive = false;
  public turboTrailEndTime = 0;

  public triggerTurboBoost(boostSpeed = 24.0, duration = 2.5): void {
    this.temporaryBoost = Math.max(this.temporaryBoost, boostSpeed);
    this.turboTrailActive = true;
    this.turboTrailEndTime = performance.now() + duration * 1000;
  }

  public triggerSuperBounce(bounceVelocity = 22.0): void {
    if (!this.isAirVehicle) {
      this.verticalSpeed = bounceVelocity;
      this.isGrounded = false;
    } else {
      this.targetAltitude = Math.min(32.0, this.targetAltitude + 12.0);
    }
  }

  public triggerPowerUp(powerUp: 'giant' | 'rainbow' | 'coins', durationSeconds = 7.0): void {
    this.powerUpActive = powerUp;
    this.powerUpEndTime = performance.now() + durationSeconds * 1000;
    if (powerUp === 'rainbow') {
      this.triggerTurboBoost(18.0, durationSeconds);
    }
  }

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
    this.powerUpActive = null;
    this.powerUpEndTime = 0;
    this.currentScale = 1.0;
    this.turboTrailActive = false;
    this.altitude = this.isAirVehicle ? 14.0 : 0;
    this.targetAltitude = this.altitude;
    this.pitchAngle = 0;
    this.rollAngle = 0;
  }

  public roofHeight = 2.8; // Resting roof clearance when flipped upside down

  public setVehicleModel(vehicleId: string): void {
    if (vehicleId === 'steam_train') {
      this.roofHeight = 3.6;
    } else if (vehicleId === 'digger' || vehicleId === 'fire_truck') {
      this.roofHeight = 3.4;
    } else if (vehicleId === 'monster_truck' || vehicleId === 'pickup') {
      this.roofHeight = 3.2;
    } else {
      this.roofHeight = 2.8;
    }
  }

  public setVehicleType(type: 'ground' | 'air'): void {
    const wasAir = this.isAirVehicle;
    this.isAirVehicle = type === 'air';
    if (this.isAirVehicle) {
      if (!wasAir) {
        this.altitude = Math.max(12.0, this.position.y);
        this.targetAltitude = 14.0;
      }
      this.isGrounded = false;
    } else {
      // Swapping from air to ground: DO NOT snap instantly to ground!
      // Let it free-fall with gravity, plunging down and landing with a cartoon bounce!
      this.targetAltitude = 0;
      if (this.position.y > 0.5) {
        this.isGrounded = false;
        this.verticalSpeed = Math.min(-6.0, this.verticalSpeed);
      } else {
        this.position.y = 0;
        this.altitude = 0;
        this.isGrounded = true;
      }
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
    // 1. Tilt and Upside-Down Flip Detection
    const absBeta = Math.abs(packet.beta || 0);
    const absGamma = Math.abs(packet.gamma || 0);
    const isExtremeAngle = absBeta > 55 || absGamma > 55;
    const isFaceDown = absBeta > 125 || absGamma > 125;

    if (!this.isAirVehicle) {
      // Ground vehicles: if flipped upside down or tilted past wheel contact, STOP and roll on roof!
      if (isExtremeAngle || isFaceDown) {
        if (!this.isFlipped) {
          this.isFlipped = true;
          this.speed = 0;
          this.targetSpeed = 0;
          this.temporaryBoost = 0;
          if (onFlip) onFlip('flip');
        }
        return;
      } else if (absBeta < 35 && absGamma < 35 && this.isFlipped) {
        this.isFlipped = false;
      }

      if (this.isFlipped) return;
    } else {
      // Air vehicles (planes): Plane WORKS UPSIDE DOWN (inverted aerobatics flight)!
      this.isFlipped = false;
    }

    // 2. Tabletop Z-Axis Alignment (Steering Yaw)
    let deltaAngle = (packet.alpha - settings.baselineAlpha + 360) % 360;
    if (deltaAngle > 180) deltaAngle -= 360;

    if (Math.abs(deltaAngle) < settings.deadzoneAngle) {
      deltaAngle = 0;
    }
    this.targetYaw = (-deltaAngle * Math.PI) / 180;

    // 3. 3D Flight Control: Phone Pitch (Beta) and Roll (Gamma) for Biplane (Loops & Inverted Flight)
    if (this.isAirVehicle) {
      const rawBeta = packet.beta || 0;
      const rawGamma = packet.gamma || 0;

      // Positive beta (tilting phone front up) pitches nose UP (+pitch into the sky)
      // Negative beta (tilting phone front down) pitches nose DOWN (-pitch into a dive)
      this.targetPitch = (rawBeta * Math.PI) / 180;
      this.targetRoll = (-rawGamma * Math.PI) / 180;

      // Inverted flight: When phone is flipped upside down (face-down on table):
      // The biplane flies inverted (belly and wheels up), but NOSE STILL FLIES FORWARD!
      if (Math.abs(rawBeta) > 115 || Math.abs(rawGamma) > 115) {
        this.targetRoll = Math.PI; // Roll 180° around fuselage so nose stays pointing forward!
        const wrappedBeta = rawBeta > 0 ? (180 - rawBeta) : (-180 - rawBeta);
        this.targetPitch = (wrappedBeta * Math.PI) / 180;
      }
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
        // Up/down keys pitch plane nose UP (climb) and DOWN (dive)
        this.targetPitch += forward * 0.06;
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
        this.targetPitch -= Math.PI; // Instant half-loop / flip!
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

    // 4. Vertical Physics (Ground jumping vs True 3D Flight)
    if (this.isAirVehicle) {
      // Smoothly interpolate full 3D pitch and roll with wrap-around
      const pitchDiff = (this.targetPitch - this.pitchAngle + Math.PI * 3) % (Math.PI * 2) - Math.PI;
      this.pitchAngle += pitchDiff * Math.min(1.0, delta * 9.0);

      const rollDiff = (this.targetRoll - this.rollAngle + Math.PI * 3) % (Math.PI * 2) - Math.PI;
      this.rollAngle += rollDiff * Math.min(1.0, delta * 9.0);

      // 3D Aerodynamic Flight Trajectory:
      // Nose pointing UP (pitchAngle > 0): climbs rapidly into the sky!
      // Nose pointing DOWN (pitchAngle < 0): power dives!
      const climbSpeed = Math.sin(this.pitchAngle) * Math.cos(this.rollAngle) * Math.max(8.0, this.speed * 0.95);
      this.altitude += climbSpeed * delta;

      // Soft ground cushion to skim above grass without clipping
      if (this.altitude < 1.6) {
        this.altitude = 1.6;
        if (climbSpeed < -5.0 && onLanding) {
          onLanding();
        }
      } else if (this.altitude > 65.0) {
        this.altitude = 65.0;
      }
      this.position.y = this.altitude;

      // Full 360 degree 3-axis rotation (YXZ order prevents gimbal lock during backflips)
      rootGroup.rotation.order = 'YXZ';
      rootGroup.rotation.x = this.pitchAngle;
      rootGroup.rotation.z = this.rollAngle;
    } else {
      // Ground Vehicle Physics (Gravity & Jumping)
      rootGroup.rotation.x = 0;
      if (this.isFlipped) {
        // Roll completely upside down (180 deg / Math.PI) on its roof, and stop!
        rootGroup.rotation.z = THREE.MathUtils.damp(rootGroup.rotation.z, Math.PI, 14.0, delta);
        // Lift car by full roof height (2.8m - 3.6m) so roof rests strictly on top of ground with 0 clipping!
        const restY = Math.max(2.8, this.roofHeight * this.currentScale);
        this.position.y = THREE.MathUtils.damp(this.position.y, restY, 16.0, delta);
        // Absolute floor guard: instantly clamp so car NEVER dips underground for even a single frame
        if (this.position.y < restY) {
          this.position.y = restY;
        }
        this.verticalSpeed = 0;
        this.isGrounded = true;
      } else {
        if (!this.isGrounded) {
          this.verticalSpeed -= 28.0 * delta; // Realistic toy gravity
          this.position.y += this.verticalSpeed * delta;

          if (this.position.y <= 0) {
            this.position.y = 0;
            if (Math.abs(this.verticalSpeed) > 8.0) {
              // Cartoon elastic bounce on high drops!
              this.verticalSpeed = -this.verticalSpeed * 0.35;
              if (onLanding) onLanding();
            } else {
              this.verticalSpeed = 0;
              this.isGrounded = true;
              if (onLanding) onLanding();
            }
          }
        } else {
          this.position.y = THREE.MathUtils.damp(this.position.y, 0, 14.0, delta);
        }

        const turnRoll = -diff * Math.min(1.0, Math.abs(this.speed) / 12);
        rootGroup.rotation.z = THREE.MathUtils.damp(rootGroup.rotation.z, turnRoll, 10.0, delta);
      }
    }

    // Power-up duration check & dynamic model scaling
    const now = performance.now();
    if (this.powerUpActive && now > this.powerUpEndTime) {
      this.powerUpActive = null;
    }
    if (this.turboTrailActive && now > this.turboTrailEndTime) {
      this.turboTrailActive = false;
    }

    // Dynamic scale (Mega Giant power-up grows 2.2x!)
    const targetScale = this.powerUpActive === 'giant' ? 2.2 : 1.0;
    this.currentScale = THREE.MathUtils.damp(this.currentScale, targetScale, 6.0, delta);
    rootGroup.scale.setScalar(this.currentScale);

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
