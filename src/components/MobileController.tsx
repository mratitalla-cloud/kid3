/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { PeerService, ConnectionState } from '../services/peerService';
import { GameEvent, MotionPacket } from '../types/game';
import { BUILTIN_VEHICLES, VehicleItem } from '../vehicles/roster';
import { mobileAudio } from '../services/audioService';
import { HapticsService } from '../services/hapticsService';
import {
  Volume2,
  VolumeX,
  Car,
  Sparkles,
  WifiOff,
  Compass,
  AlertCircle,
  ArrowUpCircle,
  CheckCircle,
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

  // 3D Top-Down Viewport Refs
  const vehicle3DGroupRef = useRef<THREE.Group>(new THREE.Group());
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
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

  // Handle incoming events from host (collisions, forced permissions, vehicle swap)
  const handleHostEvent = useCallback((event: GameEvent) => {
    if (event.type === 'COLLISION_TRIGGER') {
      HapticsService.trigger(event.severity, true, 1.2);
      if (event.severity !== 'landing') {
        mobileAudio.playCrash(event.severity);
      }
    } else if (event.type === 'SWAP_VEHICLE') {
      const idx = vehicles.findIndex((v) => v.id === event.vehicleId);
      if (idx !== -1) {
        setCurrentVehicleIndex(idx);
        mountVehicle3D(vehicles[idx]);
      }
    } else if (event.type === 'FORCE_REQUEST_PERMISSIONS') {
      // Parent forced permission prompt from PC
      setShowForcePermissionModal(true);
      mobileAudio.playJump();
    }
  }, [vehicles, mountVehicle3D]);

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

  // Tap-to-Start Permission Handshake
  const handleTapToStart = async () => {
    // 1. Synchronously trigger permission prompt!
    triggerPermissionsRequest();

    // 2. Audio Activation & unlock
    await mobileAudio.resume();
    mobileAudio.startEngine();
    mobileAudio.startBgm();

    // 3. Fullscreen Lock
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

    // 4. Orientation & Wake Lock
    try {
      if (screen.orientation && 'lock' in screen.orientation) {
        await screen.orientation.lock('portrait');
      }
    } catch {
      // Ignore
    }
    await requestWakeLock();

    // 5. Start 60Hz data channel stream
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

      const speedEstimate = 1.0 + Math.max(0, Math.abs(packet.accelY) * 0.8);
      mobileAudio.updateEngineSpeed(speedEstimate);
    }, 1000 / 60);

    setHasStarted(true);
  };

  // 3D Top-Down Viewport Setup on Phone
  useEffect(() => {
    if (!hasStarted) return;
    const container = canvasMountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x38bdf8); // Sky blue
    sceneRef.current = scene;

    // Top-Down Camera: positioned 16m directly above the vehicle looking straight down (90 degrees)
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 100);
    camera.position.set(0, 16, 0);
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
    sunLight.position.set(5, 20, 5);
    scene.add(sunLight);
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));

    // Rolling Grass Ground with Dirt Country Road
    const groundGeo = new THREE.PlaneGeometry(35, 65);
    groundGeo.rotateX(-Math.PI / 2);
    const grass = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.8 }));
    grass.position.y = -0.1;

    const roadGeo = new THREE.PlaneGeometry(8, 65);
    roadGeo.rotateX(-Math.PI / 2);
    const road = new THREE.Mesh(roadGeo, new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.9 }));
    road.position.y = 0.01;
    scene.add(grass, road);

    // Add Vehicle Group
    const vGroup = vehicle3DGroupRef.current;
    scene.add(vGroup);
    mountVehicle3D(currentVehicleRef.current);

    // Animation Loop for Phone Top-Down View
    let frameId = 0;
    const clock = new THREE.Clock();
    let roadScroll = 0;

    const tick = () => {
      const delta = Math.min(0.05, clock.getDelta());

      // Scroll road texture backward to create authentic top-down driving motion sensation!
      roadScroll += delta * 14.0;
      road.position.z = (roadScroll % 10) - 5;

      // Rotate vehicle smoothly to match physical steering yaw
      const alphaDeg = motionPacketRef.current.alpha;
      vGroup.rotation.y = (-alphaDeg * Math.PI) / 180;

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
    if (e.touches.length > 0) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };
      // Resume audio context if asleep
      mobileAudio.resume();
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

  const handleManualJump = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    motionPacketRef.current.accelZ = 12.0;
    mobileAudio.playJump();
    HapticsService.trigger('landing', true, 1.0);
    setTimeout(() => {
      motionPacketRef.current.accelZ = 0;
    }, 120);
  };

  const toggleAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAudioMuted) {
      mobileAudio.setVolume(0.85);
      setIsAudioMuted(false);
    } else {
      mobileAudio.setVolume(0);
      setIsAudioMuted(true);
    }
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

  // Phase 1.1: Mobile Tap-to-Start Permission Screen
  if (!hasStarted) {
    return (
      <div
        onClick={handleTapToStart}
        className="fixed inset-0 bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 flex flex-col items-center justify-between p-8 text-white select-none cursor-pointer overflow-hidden touch-none"
      >
        <div className="pt-8 text-center space-y-2">
          <div className="inline-flex p-4 bg-white/20 backdrop-blur-md rounded-3xl shadow-lg animate-bounce">
            <Car className="w-16 h-16 text-white" />
          </div>
          <h1 className="text-3xl font-black tracking-tight drop-shadow-md">
            TODDLER DRIVE
          </h1>
          <p className="text-sm font-medium text-white/90 max-w-xs mx-auto">
            Turn your phone into a real steering toy for the big screen!
          </p>
        </div>

        <div className="w-full max-w-xs py-8 px-6 bg-white text-slate-900 rounded-3xl shadow-2xl flex flex-col items-center text-center transform active:scale-95 transition-transform">
          <Sparkles className="w-8 h-8 text-amber-500 mb-2 animate-spin" />
          <span className="text-2xl font-black tracking-wide text-orange-600">
            TAP TO DRIVE!
          </span>
          <span className="text-xs text-slate-500 mt-1">
            Enables motion steering, sounds & haptics
          </span>
        </div>

        <div className="pb-4 text-center text-xs text-white/80 space-y-1">
          <p>Lay flat on table face-up after tapping</p>
          <div className="flex items-center justify-center gap-1.5 font-mono text-[11px]">
            <span>Session:</span>
            <span className="bg-black/20 px-2 py-0.5 rounded">{sessionId}</span>
          </div>
        </div>
      </div>
    );
  }

  // Phase 2: Real-Time Top-Down 3D Game View on Phone
  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-between select-none overflow-hidden touch-none"
    >
      {/* 3D Top-Down WebGL Viewport Container (Fills phone screen!) */}
      <div ref={canvasMountRef} className="absolute inset-0 w-full h-full" />

      {/* Top Status Bar with Sensor Diagnostics */}
      <div className="w-full px-4 pt-3 flex items-center justify-between z-20 pointer-events-none">
        <div className="flex items-center gap-2">
          {connectionState === 'connected' ? (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/30 border border-emerald-400/50 rounded-full text-emerald-200 text-xs font-semibold backdrop-blur-sm shadow-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>DRIVING LIVE</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/30 border border-amber-400/50 rounded-full text-amber-200 text-xs font-semibold backdrop-blur-sm shadow-md">
              <WifiOff className="w-3.5 h-3.5" />
              <span>RECONNECTING...</span>
            </div>
          )}

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
              <span>Tap to Allow Sensors</span>
            </button>
          )}
        </div>

        {/* Quiet Sound Mute Toggle */}
        <button
          onClick={toggleAudio}
          className="pointer-events-auto p-2 bg-slate-900/60 backdrop-blur-sm hover:bg-slate-900/80 rounded-full text-white shadow-md transition-colors"
        >
          {isAudioMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Floating Tactical Jump Button (Always easily reachable by toddler) */}
      <button
        onClick={handleManualJump}
        onTouchStart={handleManualJump}
        className="absolute bottom-6 right-6 z-30 pointer-events-auto flex items-center gap-1.5 px-5 py-3 bg-indigo-600 active:bg-indigo-500 text-white rounded-full shadow-2xl border-2 border-indigo-400/60 text-sm font-black active:scale-95 transition-all"
      >
        <ArrowUpCircle className="w-5 h-5 text-amber-300" />
        <span>JUMP!</span>
      </button>

      {/* Bottom Subtitle Indicator */}
      <div className="w-full pb-4 px-6 text-center z-20 pointer-events-none">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-900/70 backdrop-blur-md rounded-full text-white/80 text-xs font-semibold shadow-lg">
          <span>Twist phone flat to steer • Slide for speed boost • Swipe to swap vehicle</span>
        </div>
      </div>

      {/* Parent Forced Permission Modal (Popup when PC Parent clicks Force Request) */}
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
    </div>
  );
};
