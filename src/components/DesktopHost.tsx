/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { PeerService, ConnectionState } from '../services/peerService';
import {
  ParentSettings,
  DEFAULT_PARENT_SETTINGS,
  GameEvent,
  MotionPacket,
} from '../types/game';
import { BUILTIN_VEHICLES, VehicleItem, VehicleMeshBundle } from '../vehicles/roster';
import { WorldGenerator } from '../engine/worldGenerator';
import { VehiclePhysics } from '../engine/vehiclePhysics';
import { QRCodeOverlay } from './QRCodeOverlay';
import { ParentPanel } from './ParentPanel';
import { desktopAudio } from '../services/audioService';
import { getWorldById } from '../worlds';
import { Settings, RefreshCw, Car, Gauge, Wifi, Sparkles, Globe } from 'lucide-react';

const STORAGE_KEY = 'toddler_drive_parent_settings_v1';

export const DesktopHost: React.FC = () => {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [isParentPanelOpen, setIsParentPanelOpen] = useState(false);
  const [vehicles, setVehicles] = useState<VehicleItem[]>(BUILTIN_VEHICLES);
  const [activeVehicleId, setActiveVehicleId] = useState<string>('roadster');
  const [activeWorldId, setActiveWorldId] = useState<string>('sunny_countryside');
  const activeWorldIdRef = useRef<string>('sunny_countryside');
  const [isWarping, setIsWarping] = useState(false);
  const [warpTargetName, setWarpTargetName] = useState('');
  const [activePowerUpToast, setActivePowerUpToast] = useState<{ name: string; icon: string } | null>(null);
  const [parentPanelMotion, setParentPanelMotion] = useState<MotionPacket | null>(null);
  const [displaySpeed, setDisplaySpeed] = useState<number>(0);

  // Settings from localStorage with fallback to default
  const [settings, setSettings] = useState<ParentSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return { ...DEFAULT_PARENT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      // ignore
    }
    return DEFAULT_PARENT_SETTINGS;
  });

  const peerServiceRef = useRef<PeerService | null>(null);
  const physicsRef = useRef<VehiclePhysics>(new VehiclePhysics());
  const worldGenRef = useRef<WorldGenerator | null>(null);
  const activeVehicleGroupRef = useRef<THREE.Group>(new THREE.Group());
  const currentBundleRef = useRef<VehicleMeshBundle | null>(null);
  const settingsRef = useRef<ParentSettings>(settings);
  settingsRef.current = settings;

  const latestMotionRef = useRef<MotionPacket | null>(null);
  const clientEventRef = useRef<((event: GameEvent) => void) | null>(null);
  const keyboardStateRef = useRef({ forward: 0, steer: 0, jump: false });

  // Save settings on update
  const handleUpdateSettings = (newSettings: ParentSettings) => {
    setSettings(newSettings);
    settingsRef.current = newSettings;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    } catch {
      // ignore
    }
    desktopAudio.setVolume(newSettings.desktopVolume);
  };

  // Switch 3D vehicle model in-place without tearing down Three.js scene
  const switchVehicleModel = useCallback((vehicleId: string) => {
    const target = vehicles.find((v) => v.id === vehicleId) || vehicles[0];
    if (!target) return;

    setActiveVehicleId(target.id);

    // Clear previous mesh children
    const group = activeVehicleGroupRef.current;
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    const bundle = target.create3D();
    currentBundleRef.current = bundle;
    group.add(bundle.root);

    // Re-attach contact shadow
    const contactShadowGeo = new THREE.PlaneGeometry(3.6, 5.0);
    contactShadowGeo.rotateX(-Math.PI / 2);
    const contactShadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    const contactShadow = new THREE.Mesh(contactShadowGeo, contactShadowMat);
    contactShadow.position.y = 0.02;
    group.add(contactShadow);

    // Link animated parts to physics engine
    physicsRef.current.wheels = bundle.wheels || [];
    physicsRef.current.propeller = bundle.propeller || null;
    physicsRef.current.smokeEmitter = bundle.smokeEmitter || null;
    physicsRef.current.setVehicleType(target.type);
  }, [vehicles]);

  // World Switching & Portal Warp
  const handleSwitchWorld = useCallback((targetWorldId: string) => {
    const world = getWorldById(targetWorldId);
    if (!world) return;
    setActiveWorldId(world.id);
    activeWorldIdRef.current = world.id;
    setWarpTargetName(world.name);
    setIsWarping(true);
    desktopAudio.playPortalWarp();
    if (worldGenRef.current) {
      worldGenRef.current.setWorld(world);
    }
    peerServiceRef.current?.send({
      type: 'WORLD_WARP',
      worldId: world.id,
    });
    setTimeout(() => setIsWarping(false), 1200);
  }, []);

  const switchWorldRef = useRef(handleSwitchWorld);
  switchWorldRef.current = handleSwitchWorld;

  // Force Request Phone Permissions from Parent Panel
  const handleForceRequestPermissions = () => {
    peerServiceRef.current?.send({ type: 'FORCE_REQUEST_PERMISSIONS' });
    desktopAudio.playJump();
  };

  // Handle incoming game events from mobile controller
  clientEventRef.current = (event: GameEvent) => {
    if (event.type === 'MOTION') {
      latestMotionRef.current = event.data;
      physicsRef.current.processMotionPacket(
        event.data,
        settingsRef.current,
        () => {
          // Jump trigger
          desktopAudio.playJump();
        },
        (severity) => {
          // Flip trigger
          peerServiceRef.current?.send({
            type: 'COLLISION_TRIGGER',
            severity,
          });
        }
      );
    } else if (event.type === 'SWAP_VEHICLE') {
      switchVehicleModel(event.vehicleId);
      desktopAudio.playVehicleSwap();
    }
  };

  // Handle baseline zero orientation calibration (Section 3 & 4.2)
  const handleLockBaseline = () => {
    const motion = latestMotionRef.current;
    if (motion) {
      const newSettings = { ...settings, baselineAlpha: motion.alpha };
      handleUpdateSettings(newSettings);
      peerServiceRef.current?.send({
        type: 'CALIBRATE_BASELINE',
        baselineAlpha: motion.alpha,
      });
    }
  };

  // Recenter vehicle to spawn (Section 4.3)
  const handleResetSpawn = () => {
    physicsRef.current.reset(new THREE.Vector3(0, 0, 0));
    peerServiceRef.current?.send({ type: 'RESET_SPAWN' });
  };

  // Add custom imported vehicle from AI generator
  const handleAddCustomVehicle = (vehicle: VehicleItem) => {
    setVehicles((prev) => [...prev, vehicle]);
    handleUpdateSettings({
      ...settings,
      activeVehicleIds: [...settings.activeVehicleIds, vehicle.id],
    });
    switchVehicleModel(vehicle.id);
  };

  // Keyboard controls listener (Arrow Keys & WASD)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsParentPanelOpen((prev) => !prev);
        return;
      }

      // Ignore driving keys if inside textarea
      if ((e.target as HTMLElement)?.tagName === 'TEXTAREA' || (e.target as HTMLElement)?.tagName === 'INPUT') {
        return;
      }

      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          keyboardStateRef.current.forward = 1;
          break;
        case 'ArrowDown':
        case 'KeyS':
          keyboardStateRef.current.forward = -1;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          keyboardStateRef.current.steer = -1;
          break;
        case 'ArrowRight':
        case 'KeyD':
          keyboardStateRef.current.steer = 1;
          break;
        case 'Space':
          keyboardStateRef.current.jump = true;
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          if (keyboardStateRef.current.forward === 1) keyboardStateRef.current.forward = 0;
          break;
        case 'ArrowDown':
        case 'KeyS':
          if (keyboardStateRef.current.forward === -1) keyboardStateRef.current.forward = 0;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          if (keyboardStateRef.current.steer === -1) keyboardStateRef.current.steer = 0;
          break;
        case 'ArrowRight':
        case 'KeyD':
          if (keyboardStateRef.current.steer === 1) keyboardStateRef.current.steer = 0;
          break;
        case 'Space':
          keyboardStateRef.current.jump = false;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Initialize WebRTC Host ONCE on mount
  useEffect(() => {
    const peer = new PeerService();
    peerServiceRef.current = peer;

    peer
      .initHost(
        (event) => {
          clientEventRef.current?.(event);
        },
        (state) => setConnectionState(state)
      )
      .then((id) => setSessionId(id))
      .catch((err) => console.error('Failed to init Peer host:', err));

    return () => {
      peer.destroy();
    };
  }, []); // Run ONCE on mount

  // Low-frequency UI telemetry update interval (5 Hz)
  useEffect(() => {
    const timer = setInterval(() => {
      if (latestMotionRef.current) {
        setParentPanelMotion({ ...latestMotionRef.current });
      }
      setDisplaySpeed(Math.round(Math.abs(physicsRef.current.speed * 3.6))); // km/h
    }, 200);

    return () => clearInterval(timer);
  }, []);

  // Initialize Desktop Audio on first click
  useEffect(() => {
    const unlockAudio = () => {
      desktopAudio.resume();
      window.removeEventListener('click', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    return () => window.removeEventListener('click', unlockAudio);
  }, []);

  // Three.js Render Loop & Scene Setup (Runs ONCE on mount)
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    // Detect software GL as required by Three.js skill
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x93c5fd); // Sunny Countryside blue sky
    scene.fog = new THREE.FogExp2(0xe0f2fe, 0.012); // Atmospheric horizon fog

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(52, width / height, 0.5, 300);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // Mandatory RoomEnvironment PBR Reflection Map
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3-Point Lighting Rig
    const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.8);
    sunLight.position.set(40, 60, 30);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 150;
    sunLight.shadow.camera.left = -35;
    sunLight.shadow.camera.right = 35;
    sunLight.shadow.camera.top = 35;
    sunLight.shadow.camera.bottom = -35;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x15803d, 0.6);
    scene.add(hemiLight);

    // Add Vehicle Group to scene
    const vehicleRoot = activeVehicleGroupRef.current;
    scene.add(vehicleRoot);

    // Initial vehicle model mount
    switchVehicleModel('roadster');

    // Procedural World Generator initialized with active world
    const worldGen = new WorldGenerator(scene, getWorldById(activeWorldIdRef.current));
    worldGenRef.current = worldGen;

    // Handle Window Resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let frameId = 0;
    const clock = new THREE.Clock();
    let stateStreamTimer = 0;

    const tick = () => {
      const delta = Math.min(0.05, clock.getDelta());
      const elapsed = clock.getElapsedTime();

      // 1. Apply keyboard controls if active
      const kb = keyboardStateRef.current;
      if (kb.forward !== 0 || kb.steer !== 0 || kb.jump) {
        physicsRef.current.applyKeyboardInput(
          kb.forward,
          kb.steer,
          kb.jump,
          settingsRef.current,
          () => desktopAudio.playJump()
        );
      }

      // 2. Advance physics simulation
      const physics = physicsRef.current;
      physics.tick(
        delta,
        vehicleRoot,
        settingsRef.current.autoCruise,
        settingsRef.current.cruiseSpeed,
        () => {
          // Landing bump
          peerServiceRef.current?.send({
            type: 'COLLISION_TRIGGER',
            severity: 'landing',
          });
        }
      );

      // 3. Non-blocking Obstacle & Interactive Collisions check (Boosts, Springs, Coins, Mystery Boxes, Portals!)
      worldGen.checkCollisions(
        physics.position,
        2.4,
        physics.isAirVehicle,
        (severity, isAirItem) => {
          if (isAirItem) {
            desktopAudio.playStarCollect();
          } else {
            desktopAudio.playCrash(severity);
          }
          peerServiceRef.current?.send({
            type: 'COLLISION_TRIGGER',
            severity,
            isAirItem,
          });
        },
        (targetWorldId) => {
          switchWorldRef.current(targetWorldId);
        },
        (action, noteIndex, powerUp) => {
          if (action === 'boost') {
            physics.triggerTurboBoost(24.0, 2.5);
            desktopAudio.playTurboBoost();
            peerServiceRef.current?.send({ type: 'INTERACTIVE_TRIGGER', action: 'boost' });
          } else if (action === 'spring') {
            physics.triggerSuperBounce(22.0);
            desktopAudio.playSpringBounce();
            peerServiceRef.current?.send({ type: 'INTERACTIVE_TRIGGER', action: 'spring' });
          } else if (action === 'coin') {
            desktopAudio.playCoinNote(noteIndex ?? 0);
            peerServiceRef.current?.send({ type: 'INTERACTIVE_TRIGGER', action: 'coin', noteIndex });
          } else if (action === 'mystery') {
            const pType = (powerUp as 'giant' | 'rainbow' | 'coins') || 'giant';
            physics.triggerPowerUp(pType, 7.0);
            desktopAudio.playMysteryFanfare();
            const toastMap = {
              giant: { name: 'MEGA GIANT CAR!', icon: '🌟' },
              rainbow: { name: 'RAINBOW TURBO BOOST!', icon: '🚀' },
              coins: { name: 'COIN SHOWER BURST!', icon: '🪙' },
            };
            setActivePowerUpToast(toastMap[pType] || toastMap.giant);
            setTimeout(() => setActivePowerUpToast(null), 4500);
            peerServiceRef.current?.send({ type: 'INTERACTIVE_TRIGGER', action: 'mystery', powerUp: pType });
          } else if (action === 'creature') {
            if (powerUp === 'moo') desktopAudio.playMoo();
            else if (powerUp === 'squawk') desktopAudio.playSquawk();
            else if (powerUp === 'dino_roar') desktopAudio.playDinoRoar();
            else if (powerUp === 'ufo') desktopAudio.playUfoHum();
            else desktopAudio.playCrash('minor');
            peerServiceRef.current?.send({ type: 'INTERACTIVE_TRIGGER', action: 'creature', powerUp });
          }
        }
      );

      // Broadcast live position, yaw, speed, world, and active power-up to phone controller (~30 FPS)
      stateStreamTimer += delta;
      if (stateStreamTimer >= 0.033) {
        stateStreamTimer = 0;
        peerServiceRef.current?.send({
          type: 'GAME_STATE',
          x: physics.position.x,
          y: physics.position.y,
          z: physics.position.z,
          yaw: physics.currentYaw,
          speed: physics.speed,
          worldId: activeWorldIdRef.current,
          powerUp: physics.powerUpActive || undefined,
        });
      }

      // 4. Update procedural chunks around vehicle
      worldGen.updateChunks(physics.position, settingsRef.current.groundDensity);
      worldGen.tick(delta, elapsed, physics.position);

      // 5. Update Sun light position to follow vehicle for crisp shadows
      sunLight.position.set(
        physics.position.x + 40,
        60,
        physics.position.z + 30
      );
      sunLight.target.position.copy(physics.position);
      sunLight.target.updateMatrixWorld();

      // 6. Translating Non-Rotating Overhead Camera (Section 3)
      if (settingsRef.current.cameraMode === 'overhead') {
        // Fixed cardinal north view (looking slightly forward/down, no yaw rotation)
        const targetCamX = physics.position.x;
        const targetCamY = physics.position.y + 24;
        const targetCamZ = physics.position.z + 18; // Offset south

        camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamX, 8.0, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamY, 8.0, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, targetCamZ, 8.0, delta);

        camera.lookAt(physics.position.x, physics.position.y + 0.5, physics.position.z - 2.0);
      } else {
        // Optional Chase Camera Mode for older kids
        const chaseDist = 16;
        const chaseHeight = 8;
        const forwardX = -Math.sin(physics.currentYaw);
        const forwardZ = -Math.cos(physics.currentYaw);

        const targetCamX = physics.position.x - forwardX * chaseDist;
        const targetCamY = physics.position.y + chaseHeight;
        const targetCamZ = physics.position.z - forwardZ * chaseDist;

        camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamX, 6.0, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamY, 6.0, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, targetCamZ, 6.0, delta);

        camera.lookAt(physics.position.x, physics.position.y + 1.2, physics.position.z);
      }

      // Render
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []); // Run ONCE on mount!

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-sky-200">
      {/* 3D WebGL Canvas Container */}
      <div ref={canvasMountRef} className="absolute inset-0 w-full h-full" />

      {/* QR Code Signaling Overlay (Top Left) */}
      <QRCodeOverlay sessionId={sessionId} connectionState={connectionState} />

      {/* Active Mystery Power-Up Celebration Toast */}
      {activePowerUpToast && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-bounce">
          <div className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-amber-500 via-purple-600 to-indigo-600 text-white font-black text-sm rounded-full shadow-2xl border-2 border-white/60">
            <span className="text-2xl">{activePowerUpToast.icon}</span>
            <span className="tracking-wide uppercase">{activePowerUpToast.name}</span>
          </div>
        </div>
      )}

      {/* Top Right Quick Bar (Parent Panel Button) */}
      <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
        <button
          onClick={() => setIsParentPanelOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-900 text-slate-800 dark:text-slate-200 font-semibold text-xs rounded-full shadow-lg border border-slate-200/60 dark:border-slate-800 transition-all hover:scale-105"
        >
          <Settings className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Parent Settings</span>
          <span className="text-[10px] opacity-60 font-mono">[Esc]</span>
        </button>
      </div>

      {/* Floating Bottom Quick HUD (Collapsible / Unobtrusive as per skill) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
        <div className="flex items-center gap-3 px-5 py-2.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/40 dark:border-slate-800 pointer-events-auto">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-100">
            <Car className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>
              {vehicles.find((v) => v.id === activeVehicleId)?.name || 'Toy Vehicle'}
            </span>
          </div>

          <span className="text-slate-300 dark:text-slate-700">|</span>

          {/* Speed Indicator */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
            <Gauge className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
              {displaySpeed} km/h
            </span>
          </div>

          <span className="text-slate-300 dark:text-slate-700">|</span>

          {/* Auto-Cruise Quick Toggle Requested by User */}
          <button
            onClick={() => handleUpdateSettings({ ...settings, autoCruise: !settings.autoCruise })}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
              settings.autoCruise
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}
            title="When active, car drives forward at a steady speed. Pushing phone on table gives a speed boost!"
          >
            <span>Auto-Cruise:</span>
            <span className="uppercase">{settings.autoCruise ? 'ON' : 'OFF'}</span>
          </button>

          <span className="text-slate-300 dark:text-slate-700">|</span>

          {/* Connection & Live Steering Status */}
          <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <Wifi className={`w-3.5 h-3.5 ${connectionState === 'connected' ? 'text-emerald-500' : 'text-slate-400'}`} />
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {connectionState === 'connected'
                ? `Phone Paired (${parentPanelMotion ? Math.round(parentPanelMotion.alpha) + '°' : 'Steering Ready'})`
                : 'WASD or Scan QR'}
            </span>
          </div>

          <button
            onClick={handleResetSpawn}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Recenter
          </button>
        </div>
      </div>

      {/* Master Parent Control Panel Modal */}
      <ParentPanel
        isOpen={isParentPanelOpen}
        onClose={() => setIsParentPanelOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        latestMotion={parentPanelMotion}
        onLockBaseline={handleLockBaseline}
        onResetSpawn={handleResetSpawn}
        onAddCustomVehicle={handleAddCustomVehicle}
        activeVehicles={vehicles}
        onForceRequestPermissions={handleForceRequestPermissions}
        currentWorldId={activeWorldId}
        onSelectWorld={handleSwitchWorld}
      />

      {/* Cosmic Warp Portal Transition Screen Flash */}
      {isWarping && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center bg-purple-600/30 backdrop-blur-sm animate-pulse">
          <div className="p-8 bg-white/95 dark:bg-slate-900/95 rounded-3xl shadow-2xl border-4 border-purple-400 text-center animate-bounce">
            <Sparkles className="w-16 h-16 text-purple-600 mx-auto mb-3 animate-spin" />
            <div className="text-xs font-black tracking-widest text-purple-600 uppercase">
              COSMIC STARGATE WARP!
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-1">
              {warpTargetName}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
