/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { PeerService, ConnectionState } from '../services/peerService';
import { GameEvent, MotionPacket, ParentSettings, DEFAULT_PARENT_SETTINGS } from '../types/game';
import { BUILTIN_VEHICLES, VehicleItem } from '../vehicles/roster';
import { mobileAudio } from '../services/audioService';
import { HapticsService } from '../services/hapticsService';
import { WorldGenerator } from '../engine/worldGenerator';
import { getWorldById } from '../worlds';
import { ParentPanel } from './ParentPanel';
import {
  Volume2,
  VolumeX,
  Car,
  Sparkles,
  WifiOff,
  Compass,
  AlertCircle,
  CheckCircle,
  Vibrate,
  Globe,
  Lock,
  Unlock,
} from 'lucide-react';

interface MobileControllerProps {
  sessionId: string;
}

export const MobileController: React.FC<MobileControllerProps> = ({ sessionId }) => {
  const [hasStarted, setHasStarted] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [vehicles] = useState<VehicleItem[]>(BUILTIN_VEHICLES);
  const [currentVehicleIndex, setCurrentVehicleIndex] = useState(0);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [hasMotionSensor, setHasMotionSensor] = useState(false);
  const [showForcePermissionModal, setShowForcePermissionModal] = useState(false);
  const [currentAngleDisplay, setCurrentAngleDisplay] = useState(0);

  // Active World and Warp state on Phone
  const [activeWorldName, setActiveWorldName] = useState('Sunny Countryside');
  const [activeWorldId, setActiveWorldId] = useState('sunny_countryside');
  const [isWarpingMobile, setIsWarpingMobile] = useState(false);
  const [testChimeActive, setTestChimeActive] = useState(false);

  // Parent settings on phone & Toddler lock state (3s hold to unlock)
  const [parentSettings, setParentSettings] = useState<ParentSettings>(DEFAULT_PARENT_SETTINGS);
  const [isParentPanelOpen, setIsParentPanelOpen] = useState(false);
  const [lockProgress, setLockProgress] = useState(0);
  const lockTimerRef = useRef<number | null>(null);
  const lockStartTimeRef = useRef<number>(0);

  const canvasMountRef = useRef<HTMLDivElement>(null);
  const peerServiceRef = useRef<PeerService | null>(null);
  const motionPacketRef = useRef<MotionPacket>({
    alpha: 0,
    beta: 0,
    gamma: 0,
    accelX: 0,
    accelY: 0,
    accelZ: 0,
    throttle: 0,
    isDriving: false,
    timestamp: 0,
  });

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const streamIntervalRef = useRef<number | null>(null);
  const lastAccelZRef = useRef(0);

  // Server state tracking for vehicle & camera synchronization
  const serverVehiclePosRef = useRef({ x: 0, y: 0, z: 0, yaw: 0, speed: 0 });

  // 3D Top-Down Viewport Refs
  const vehicle3DGroupRef = useRef<THREE.Group>(new THREE.Group());
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const worldGenRef = useRef<WorldGenerator | null>(null);
  const currentVehicleRef = useRef<VehicleItem>(vehicles[0]);
  currentVehicleRef.current = vehicles[currentVehicleIndex] || vehicles[0];

  // Toddler-proof input lock
  useEffect(() => {
    const preventDefault = (e: Event) => e.preventDefault();
    window.addEventListener('contextmenu', preventDefault);
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('contextmenu', preventDefault);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Mount 3D model for current vehicle inside phone top-down viewport
  const mountVehicle3D = useCallback((vehicle: VehicleItem) => {
    const group = vehicle3DGroupRef.current;
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }
    const bundle = vehicle.create3D();
    group.add(bundle.root);
  }, []);

  // Handle incoming events from host (collisions, forced permissions, world warp, live game state, interactive triggers)
  const handleHostEvent = useCallback((event: GameEvent) => {
    if (event.type === 'GAME_STATE') {
      serverVehiclePosRef.current = {
        x: event.x,
        y: event.y,
        z: event.z,
        yaw: event.yaw,
        speed: event.speed,
      };
      if (!isAudioMuted) {
        mobileAudio.updateEngineSpeed(Math.abs(event.speed) / 8);
      }
      if (event.powerUp === 'giant') {
        vehicle3DGroupRef.current.scale.set(2.2, 2.2, 2.2);
      } else {
        vehicle3DGroupRef.current.scale.set(1.0, 1.0, 1.0);
      }
    } else if (event.type === 'INTERACTIVE_TRIGGER') {
      if (event.action === 'boost') {
        mobileAudio.playTurboBoost();
        HapticsService.trigger('major', true, 1.4);
      } else if (event.action === 'spring') {
        mobileAudio.playSpringBounce();
        HapticsService.trigger('major', true, 1.5);
      } else if (event.action === 'coin') {
        mobileAudio.playCoinNote(event.noteIndex ?? 0);
        HapticsService.trigger('minor', true, 0.7);
      } else if (event.action === 'mystery') {
        mobileAudio.playMysteryFanfare();
        HapticsService.trigger('major', true, 1.5);
      } else if (event.action === 'creature') {
        if (event.powerUp === 'moo') mobileAudio.playMoo();
        else if (event.powerUp === 'squawk') mobileAudio.playSquawk();
        else if (event.powerUp === 'dino_roar') mobileAudio.playDinoRoar();
        else if (event.powerUp === 'ufo') mobileAudio.playUfoHum();
        else if (event.powerUp === 'honk') mobileAudio.playHonk();
        else if (event.powerUp === 'train_whistle') mobileAudio.playTrainWhistle();
        else if (event.powerUp === 'whoosh') mobileAudio.playWhoosh();
        else if (event.powerUp === 'pop') mobileAudio.playPop();
        else mobileAudio.playCrash('minor');
        HapticsService.trigger('minor', true, 1.1);
      }
    } else if (event.type === 'WORLD_WARP') {
      const world = getWorldById(event.worldId);
      if (world) {
        setActiveWorldName(world.name);
        setActiveWorldId(world.id);
        setIsWarpingMobile(true);
        mobileAudio.playPortalWarp();
        HapticsService.trigger('major', true, 1.3);
        if (worldGenRef.current) {
          worldGenRef.current.setWorld(world);
        }
        setTimeout(() => setIsWarpingMobile(false), 1200);
      }
    } else if (event.type === 'DESTRUCTION_EVENT') {
      // Shatter obstacles into physical tumbling 3D debris directly on the phone screen!
      if (worldGenRef.current) {
        worldGenRef.current.triggerDebris(
          event.objType,
          new THREE.Vector3(event.pos.x, event.pos.y, event.pos.z),
          event.severity
        );
      }
    } else if (event.type === 'UPDATE_SETTINGS') {
      setParentSettings((prev) => {
        const merged = { ...prev, ...event.settings };
        if (worldGenRef.current && event.settings.enabledModules) {
          worldGenRef.current.setEnabledModules(event.settings.enabledModules);
        }
        return merged;
      });
    } else if (event.type === 'COLLISION_TRIGGER') {
      HapticsService.trigger(event.severity, true, 1.2);
      if (event.isAirItem) {
        mobileAudio.playStarCollect();
      } else if (event.severity !== 'landing') {
        mobileAudio.playCrash(event.severity);
      }
      if (worldGenRef.current) {
        worldGenRef.current.triggerConfetti(
          new THREE.Vector3(
            serverVehiclePosRef.current.x,
            serverVehiclePosRef.current.y,
            serverVehiclePosRef.current.z
          ),
          35
        );
      }
    } else if (event.type === 'SWAP_VEHICLE') {
      const idx = vehicles.findIndex((v) => v.id === event.vehicleId);
      if (idx !== -1) {
        setCurrentVehicleIndex(idx);
        mountVehicle3D(vehicles[idx]);
      }
    } else if (event.type === 'FORCE_REQUEST_PERMISSIONS') {
      setShowForcePermissionModal(true);
      mobileAudio.playJump();
    }
  }, [vehicles, mountVehicle3D, isAudioMuted]);

  // Initialize WebRTC client
  useEffect(() => {
    if (!sessionId) return;

    const peer = new PeerService();
    peerServiceRef.current = peer;

    peer.initClient(
      sessionId,
      handleHostEvent,
      (state) => setConnectionState(state)
    );

    return () => {
      peer.destroy();
    };
  }, [sessionId, handleHostEvent]);

  // Request Wake Lock
  const requestWakeLock = async () => {
    if ('wakeLock' in navigator && !wakeLockRef.current) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      } catch (err) {
        console.warn('Wake Lock error:', err);
      }
    }
  };

  const handleDeviceOrientation = useCallback((e: DeviceOrientationEvent) => {
    setHasMotionSensor(true);
    setShowForcePermissionModal(false);

    let alpha = e.alpha ?? 0;
    const iosEvent = e as unknown as { webkitCompassHeading?: number };
    if (iosEvent.webkitCompassHeading !== undefined) {
      alpha = iosEvent.webkitCompassHeading;
    }

    const beta = e.beta ?? 0;
    const gamma = e.gamma ?? 0;

    motionPacketRef.current.alpha = alpha;
    motionPacketRef.current.beta = beta;
    motionPacketRef.current.gamma = gamma;

    setCurrentAngleDisplay(Math.round(alpha));
  }, []);

  const handleDeviceMotion = useCallback((e: DeviceMotionEvent) => {
    setHasMotionSensor(true);

    let ax = e.acceleration?.x;
    let ay = e.acceleration?.y;
    let az = e.acceleration?.z;

    const hasAcc = ax !== null && ax !== undefined && ay !== null && ay !== undefined;
    if (!hasAcc || (ax === 0 && ay === 0 && az === 0)) {
      const g = e.accelerationIncludingGravity;
      if (g && g.x !== null && g.y !== null) {
        ax = g.x ?? 0;
        ay = g.y ?? 0;
        az = (g.z ?? 9.8) - 9.8;
      }
    }

    const rawZ = az ?? 0;
    const deltaZ = Math.abs(rawZ - lastAccelZRef.current);
    lastAccelZRef.current = rawZ;

    motionPacketRef.current.accelX = ax ?? 0;
    motionPacketRef.current.accelY = ay ?? 0;
    motionPacketRef.current.accelZ = Math.max(rawZ, deltaZ);
  }, []);

  // Request motion permissions explicitly
  const triggerPermissionsRequest = () => {
    const DeviceOrientation = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    const DeviceMotion = window.DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };

    if (typeof DeviceOrientation?.requestPermission === 'function') {
      DeviceOrientation.requestPermission()
        .then((perm) => {
          if (perm === 'granted') {
            window.addEventListener('deviceorientation', handleDeviceOrientation, true);
            window.addEventListener('deviceorientationabsolute', handleDeviceOrientation, true);
            setHasMotionSensor(true);
            setShowForcePermissionModal(false);
            mobileAudio.playJump();
          }
        })
        .catch(() => {});
    } else {
      window.addEventListener('deviceorientation', handleDeviceOrientation, true);
      window.addEventListener('deviceorientationabsolute', handleDeviceOrientation, true);
      setHasMotionSensor(true);
      setShowForcePermissionModal(false);
    }

    if (typeof DeviceMotion?.requestPermission === 'function') {
      DeviceMotion.requestPermission()
        .then((perm) => {
          if (perm === 'granted') {
            window.addEventListener('devicemotion', handleDeviceMotion, true);
          }
        })
        .catch(() => {});
    } else {
      window.addEventListener('devicemotion', handleDeviceMotion, true);
    }
  };

  // Test sound and rumble on demand
  const handleTestAudioAndVibrate = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    mobileAudio.unlockSynchronously();
    mobileAudio.playTestChime();
    HapticsService.trigger('major', true, 1.3);
    setTestChimeActive(true);
    setTimeout(() => setTestChimeActive(false), 900);
  };

  // Tap-to-Start Permission Handshake
  const handleTapToStart = async () => {
    // 1. Immediately and synchronously unlock Web Audio on direct user tap
    mobileAudio.unlockSynchronously();

    // 2. Trigger motion permissions
    triggerPermissionsRequest();

    // 3. Audio Activation & unlock
    mobileAudio.setVolume(0.9);
    mobileAudio.startEngine();
    mobileAudio.startBgm();
    HapticsService.trigger('major', true, 1.2);

    // 4. Fullscreen Lock
    try {
      const docEl = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void>;
      };
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen();
      }
    } catch {
      // Ignore
    }

    // 5. Orientation & Wake Lock
    try {
      if (screen.orientation && 'lock' in screen.orientation) {
        await screen.orientation.lock('portrait');
      }
    } catch {
      // Ignore
    }
    await requestWakeLock();

    // 6. Start 60Hz data channel stream
    if (streamIntervalRef.current) {
      window.clearInterval(streamIntervalRef.current);
    }
    streamIntervalRef.current = window.setInterval(() => {
      const packet: MotionPacket = {
        ...motionPacketRef.current,
        timestamp: performance.now(),
      };

      if (peerServiceRef.current?.isConnected()) {
        peerServiceRef.current.send({
          type: 'MOTION',
          data: packet,
        });
      }
    }, 1000 / 60);

    setHasStarted(true);
  };

  // 3D Top-Down Viewport Setup on Phone (With real procedural map!)
  useEffect(() => {
    if (!hasStarted) return;
    const container = canvasMountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const initialWorld = getWorldById('sunny_countryside');
    scene.background = new THREE.Color(initialWorld.skyColor);
    scene.fog = new THREE.FogExp2(initialWorld.fogColor, 0.012);

    // Top-Down Camera: positioned 26m directly above the vehicle looking straight down (90 degrees)
    const camera = new THREE.PerspectiveCamera(48, width / height, 0.5, 150);
    camera.position.set(0, 26, 0);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // Warm sun light directly from above
    const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.8);
    sunLight.position.set(15, 35, 15);
    scene.add(sunLight);
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));

    // Add Vehicle Group
    const vGroup = vehicle3DGroupRef.current;
    scene.add(vGroup);
    mountVehicle3D(currentVehicleRef.current);

    // Attach full procedural WorldGenerator on phone!
    const worldGen = new WorldGenerator(scene, initialWorld);
    worldGenRef.current = worldGen;

    // Animation Loop for Phone Top-Down Map View
    let frameId = 0;
    const clock = new THREE.Clock();

    const tick = () => {
      const delta = Math.min(0.05, clock.getDelta());
      const elapsed = clock.getElapsedTime();

      // Read real-time position from host or estimate smoothly
      const s = serverVehiclePosRef.current;
      vGroup.position.set(s.x, s.y, s.z);

      // Rotate vehicle: use server yaw if available, fallback to local gyro
      if (s.yaw !== 0) {
        vGroup.rotation.y = s.yaw;
      } else {
        const alphaDeg = motionPacketRef.current.alpha;
        vGroup.rotation.y = (-alphaDeg * Math.PI) / 180;
      }

      // Camera stays directly overhead following the vehicle
      camera.position.set(s.x, s.y + 26, s.z);
      camera.lookAt(s.x, s.y, s.z);

      // Sun tracks vehicle
      sunLight.position.set(s.x + 15, s.y + 35, s.z + 15);
      sunLight.target.position.copy(vGroup.position);
      sunLight.target.updateMatrixWorld();

      // Update procedural world chunks around vehicle on phone!
      worldGen.updateChunks(vGroup.position, 0.9);
      worldGen.tick(delta, elapsed, vGroup.position);

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [hasStarted, mountVehicle3D]);

  // Touch Swipe to Swap Vehicles
  const handleTouchStart = (e: React.TouchEvent) => {
    mobileAudio.unlockSynchronously();
    if (e.touches.length > 0) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.changedTouches.length === 0) return;

    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
    const duration = Date.now() - touchStartRef.current.time;
    touchStartRef.current = null;

    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3 && duration < 600) {
      const step = deltaX > 0 ? -1 : 1;
      const nextIndex = (currentVehicleIndex + step + vehicles.length) % vehicles.length;
      setCurrentVehicleIndex(nextIndex);
      const newVehicle = vehicles[nextIndex];

      mountVehicle3D(newVehicle);
      mobileAudio.playVehicleSwap();
      HapticsService.trigger('minor', true, 0.8);

      peerServiceRef.current?.send({
        type: 'SWAP_VEHICLE',
        vehicleId: newVehicle.id,
      });
    }
  };

  // Toddler-Proof Lock: 3-second hold to unlock parent menu
  const handleLockPointerDown = (e: React.PointerEvent | React.TouchEvent) => {
    e.stopPropagation();
    mobileAudio.unlockSynchronously();
    lockStartTimeRef.current = performance.now();
    if (lockTimerRef.current) cancelAnimationFrame(lockTimerRef.current);

    const HOLD_MS = 3000;
    const checkHold = () => {
      const elapsed = performance.now() - lockStartTimeRef.current;
      const progress = Math.min(100, (elapsed / HOLD_MS) * 100);
      setLockProgress(progress);

      if (progress >= 100) {
        setIsParentPanelOpen(true);
        setLockProgress(0);
        mobileAudio.playMysteryFanfare();
        HapticsService.trigger('major', true, 1.5);
      } else {
        lockTimerRef.current = requestAnimationFrame(checkHold);
      }
    };
    lockTimerRef.current = requestAnimationFrame(checkHold);
  };

  const handleLockPointerUp = (e: React.PointerEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (lockTimerRef.current) {
      cancelAnimationFrame(lockTimerRef.current);
      lockTimerRef.current = null;
    }
    setLockProgress(0);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.removeEventListener('deviceorientation', handleDeviceOrientation);
      window.removeEventListener('deviceorientationabsolute', handleDeviceOrientation);
      window.removeEventListener('devicemotion', handleDeviceMotion);
      if (streamIntervalRef.current) {
        window.clearInterval(streamIntervalRef.current);
      }
      mobileAudio.stopEngine();
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
    };
  }, [handleDeviceOrientation, handleDeviceMotion]);

  // Phase 1: Mobile Tap-to-Start Screen with Audio & Vibration Test Button
  if (!hasStarted) {
    return (
      <div
        onClick={handleTapToStart}
        className="fixed inset-0 bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 flex flex-col items-center justify-between p-6 text-white select-none cursor-pointer overflow-hidden touch-none"
      >
        <div className="pt-6 text-center space-y-2">
          <div className="inline-flex p-4 bg-white/20 backdrop-blur-md rounded-3xl shadow-lg animate-bounce">
            <Car className="w-14 h-14 text-white" />
          </div>
          <h1 className="text-3xl font-black tracking-tight drop-shadow-md">
            TODDLER DRIVE
          </h1>
          <p className="text-xs font-medium text-white/90 max-w-xs mx-auto">
            Turn your phone into a physical steering controller for the big screen!
          </p>
        </div>

        <div className="w-full max-w-xs space-y-3">
          <div className="py-7 px-6 bg-white text-slate-900 rounded-3xl shadow-2xl flex flex-col items-center text-center transform active:scale-95 transition-transform">
            <Sparkles className="w-8 h-8 text-amber-500 mb-2 animate-spin" />
            <span className="text-2xl font-black tracking-wide text-orange-600">
              TAP TO DRIVE!
            </span>
            <span className="text-xs text-slate-500 mt-1">
              Activates 3D map, steering gyro & sounds
            </span>
          </div>

          {/* Test Sound & Buzz button before driving */}
          <button
            onClick={handleTestAudioAndVibrate}
            className="w-full py-3 px-4 bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/40 rounded-2xl flex items-center justify-center gap-2 text-white font-bold text-xs shadow-lg transition-all active:scale-95"
          >
            <Vibrate className="w-4 h-4 text-amber-300" />
            <span>{testChimeActive ? '🔊 BUZZING & PLAYING!' : '🔊 Test Sound & Vibration'}</span>
          </button>
        </div>

        <div className="pb-4 text-center text-xs text-white/80 space-y-1">
          <p>Lay phone flat on table face-up after tapping</p>
          <div className="flex items-center justify-center gap-1.5 font-mono text-[11px]">
            <span>Session:</span>
            <span className="bg-black/20 px-2 py-0.5 rounded">{sessionId}</span>
          </div>
        </div>
      </div>
    );
  }

  // Phase 2: Real-Time Top-Down 3D Game View on Phone (Full Map + Obstacles + Portals)
  return (
    <div
      onPointerDown={() => mobileAudio.unlockSynchronously()}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-between select-none overflow-hidden touch-none"
    >
      {/* 3D Top-Down WebGL Viewport Container with Full World Map */}
      <div ref={canvasMountRef} className="absolute inset-0 w-full h-full" />

      {/* Top Status Bar with Sensor Diagnostics & World Name */}
      <div className="w-full px-4 pt-3 flex items-center justify-between z-20 pointer-events-none">
        <div className="flex items-center gap-2">
          {connectionState === 'connected' ? (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/30 border border-emerald-400/50 rounded-full text-emerald-200 text-xs font-semibold backdrop-blur-sm shadow-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>LIVE</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/30 border border-amber-400/50 rounded-full text-amber-200 text-xs font-semibold backdrop-blur-sm shadow-md">
              <WifiOff className="w-3.5 h-3.5" />
              <span>CONNECTING...</span>
            </div>
          )}

          {/* Active World Badge */}
          <div className="flex items-center gap-1 px-2.5 py-1 bg-purple-900/60 backdrop-blur-sm border border-purple-400/40 rounded-full text-purple-200 text-[11px] font-bold shadow-md">
            <Globe className="w-3 h-3 text-purple-300" />
            <span className="truncate max-w-[120px]">{activeWorldName}</span>
          </div>

          {hasMotionSensor ? (
            <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-900/60 backdrop-blur-sm border border-white/20 rounded-full text-white text-[11px] font-mono shadow-md">
              <Compass className="w-3 h-3 text-indigo-300" />
              <span>{currentAngleDisplay}°</span>
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerPermissionsRequest();
              }}
              className="pointer-events-auto flex items-center gap-1.5 px-3 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-full text-xs font-bold shadow-lg animate-pulse"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Allow Sensors</span>
            </button>
          )}
        </div>

        {/* Toddler-Proof Parent Lock Button (Hold 3 seconds to unlock full menu) */}
        <div
          onPointerDown={handleLockPointerDown}
          onPointerUp={handleLockPointerUp}
          onPointerCancel={handleLockPointerUp}
          onPointerLeave={handleLockPointerUp}
          onTouchStart={handleLockPointerDown}
          onTouchEnd={handleLockPointerUp}
          onTouchCancel={handleLockPointerUp}
          className="pointer-events-auto relative cursor-pointer select-none touch-none px-3 py-1.5 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-white/20 shadow-xl flex items-center gap-2 transition-transform active:scale-95"
        >
          <div className="relative w-8 h-8 flex items-center justify-center">
            {/* Circular Progress Ring */}
            <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-white/20"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-emerald-400 transition-all duration-75"
                strokeDasharray={`${lockProgress}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              {lockProgress > 0 ? (
                <span className="text-[10px] font-black text-emerald-300">
                  {Math.round(lockProgress)}%
                </span>
              ) : (
                <Lock className="w-4 h-4 text-white/80" />
              )}
            </div>
          </div>

          <div className="flex flex-col text-left pr-1 pointer-events-none">
            <span className="text-[10px] font-bold text-white tracking-wide uppercase">
              {lockProgress > 0 ? 'Hold 3s...' : 'Parents'}
            </span>
            <span className="text-[9px] text-white/60">
              {lockProgress > 0 ? 'Keep holding' : 'Hold to unlock'}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Subtitle Indicator */}
      <div className="w-full pb-4 px-6 text-center z-20 pointer-events-none">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-900/70 backdrop-blur-md rounded-full text-white/80 text-xs font-semibold shadow-lg">
          <span>Twist phone to steer • Drive into glowing portals to warp</span>
        </div>
      </div>

      {/* Cosmic Warp Overlay on Mobile */}
      {isWarpingMobile && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center bg-purple-600/40 backdrop-blur-sm animate-pulse">
          <div className="p-6 bg-slate-900/90 rounded-3xl shadow-2xl border-2 border-purple-400 text-center animate-bounce">
            <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-2 animate-spin" />
            <div className="text-[11px] font-black text-purple-300 uppercase tracking-widest">
              WARPING WORLD!
            </div>
            <div className="text-xl font-black text-white mt-1">
              {activeWorldName}
            </div>
          </div>
        </div>
      )}

      {/* Parent Forced Permission Modal */}
      {showForcePermissionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-2xl border-2 border-indigo-500 text-slate-900 dark:text-slate-100 space-y-4 animate-bounce">
            <Compass className="w-12 h-12 text-indigo-600 mx-auto" />
            <h2 className="text-xl font-black">
              Unlock Steering Sensors
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Parent requested steering sensor activation. Tap the button below to allow motion!
            </p>
            <button
              onClick={triggerPermissionsRequest}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-base rounded-2xl shadow-xl flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5 text-emerald-300" />
              <span>TAP TO ALLOW SENSORS</span>
            </button>
          </div>
        </div>
      )}

      {/* Embedded Full Parent Settings Panel on Phone */}
      {isParentPanelOpen && (
        <ParentPanel
          isOpen={isParentPanelOpen}
          onClose={() => setIsParentPanelOpen(false)}
          settings={parentSettings}
          onUpdateSettings={(newSettings) => {
            setParentSettings(newSettings);
            peerServiceRef.current?.send({
              type: 'UPDATE_SETTINGS',
              settings: newSettings,
            });
            if (worldGenRef.current && newSettings.enabledModules) {
              worldGenRef.current.setEnabledModules(newSettings.enabledModules);
            }
          }}
          latestMotion={motionPacketRef.current}
          onLockBaseline={() => {
            peerServiceRef.current?.send({
              type: 'CALIBRATE_BASELINE',
              baselineAlpha: motionPacketRef.current.alpha,
            });
            setParentSettings((prev) => ({ ...prev, baselineAlpha: motionPacketRef.current.alpha }));
          }}
          onResetSpawn={() => {
            peerServiceRef.current?.send({ type: 'RESET_SPAWN' });
          }}
          onAddCustomVehicle={() => {}}
          activeVehicles={vehicles}
          onForceRequestPermissions={triggerPermissionsRequest}
          currentWorldId={activeWorldId}
          onSelectWorld={(worldId) => {
            peerServiceRef.current?.send({ type: 'WORLD_WARP', worldId });
            handleHostEvent({ type: 'WORLD_WARP', worldId });
          }}
        />
      )}
    </div>
  );
};
