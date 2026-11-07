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
import { createLandedBiplane } from '../modules/airportRunwayModule';
import { getChallengeById } from '../challenges';
import { Settings, RefreshCw, Car, Gauge, Wifi, Sparkles, Globe } from 'lucide-react';

const STORAGE_KEY = 'toddler_drive_parent_settings_v1';

export const DesktopHost: React.FC = () => {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [isParentPanelOpen, setIsParentPanelOpen] = useState(false);
  const [vehicles, setVehicles] = useState<VehicleItem[]>(BUILTIN_VEHICLES);
  const [activeVehicleId, setActiveVehicleId] = useState<string>('roadster');
  const activeVehicleIdRef = useRef<string>('roadster');
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
  const triggerOnDemandRef = useRef<((action: string, word?: string, vehicleId?: string) => void) | null>(null);
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
    if (worldGenRef.current && newSettings.enabledModules) {
      worldGenRef.current.setEnabledModules(newSettings.enabledModules);
    }
    peerServiceRef.current?.send({
      type: 'UPDATE_SETTINGS',
      settings: newSettings,
    });
  };

  // Switch 3D vehicle model in-place without tearing down Three.js scene
  const switchVehicleModel = useCallback((vehicleId: string) => {
    const target = vehicles.find((v) => v.id === vehicleId) || vehicles[0];
    if (!target) return;

    setActiveVehicleId(target.id);
    activeVehicleIdRef.current = target.id;
    peerServiceRef.current?.send({ type: 'SWAP_VEHICLE', vehicleId: target.id });

    // Clear previous mesh children
    const group = activeVehicleGroupRef.current;
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    const bundle = target.create3D();
    currentBundleRef.current = bundle;
    group.add(bundle.root);

    // Link animated parts to physics engine
    physicsRef.current.wheels = bundle.wheels || [];
    physicsRef.current.propeller = bundle.propeller || null;
    physicsRef.current.smokeEmitter = bundle.smokeEmitter || null;
    physicsRef.current.setVehicleType(target.type);
    physicsRef.current.setVehicleModel(target.id);
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
    } else if (event.type === 'WORLD_WARP') {
      handleSwitchWorld(event.worldId);
    } else if (event.type === 'UPDATE_SETTINGS') {
      const merged = { ...settingsRef.current, ...event.settings };
      handleUpdateSettings(merged);
    } else if (event.type === 'TRIGGER_ON_DEMAND') {
      triggerOnDemandRef.current?.(event.action, event.word, event.vehicleId);
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
    scene.fog = new THREE.FogExp2(0xe0f2fe, 0.0035); // Soft atmospheric distant horizon fog

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(52, width / height, 0.5, 900);

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
    worldGen.setEnabledModules(settingsRef.current.enabledModules);
    worldGen.onDestroyCallback = (objType, pos, severity) => {
      peerServiceRef.current?.send({
        type: 'DESTRUCTION_EVENT',
        objType,
        pos: { x: pos.x, y: pos.y, z: pos.z },
        severity,
      });
    };
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

    // Mini-Game 1: Rainbow Paint Trail
    const paintTrailGroup = new THREE.Group();
    scene.add(paintTrailGroup);
    const lastPaintPos = new THREE.Vector3();
    let paintHue = 0;
    const paintSegments: THREE.Mesh[] = [];

    // Mini-Game 2: Red Chasers (Tag)
    const redChasersGroup = new THREE.Group();
    scene.add(redChasersGroup);
    interface RedChaser {
      mesh: THREE.Group;
      position: THREE.Vector3;
      hopPhase: number;
      speed: number;
    }
    const redChasers: RedChaser[] = [];
    const redChaserGeo = new THREE.SphereGeometry(0.85, 14, 14);
    const redChaserMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.3,
      emissive: 0xb91c1c,
      emissiveIntensity: 0.4,
    });
    const chaserEyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const chaserPupilMat = new THREE.MeshStandardMaterial({ color: 0x09090b });

    for (let i = 0; i < 5; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(redChaserGeo, redChaserMat);
      body.castShadow = true;
      g.add(body);
      [-0.28, 0.28].forEach((ex) => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), chaserEyeMat);
        eye.position.set(ex, 0.35, -0.68);
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), chaserPupilMat);
        pupil.position.set(ex, 0.35, -0.86);
        g.add(eye, pupil);
      });
      const angle = (i / 5) * Math.PI * 2;
      const initialPos = new THREE.Vector3(Math.cos(angle) * 35, 0.85, Math.sin(angle) * 35);
      g.position.copy(initialPos);
      redChasersGroup.add(g);
      redChasers.push({
        mesh: g,
        position: initialPos,
        hopPhase: i * 1.2,
        speed: 5.5 + (i % 2) * 1.8,
      });
    }

    // Mini-Game 3: Star Blaster Projectiles
    const projectilesGroup = new THREE.Group();
    scene.add(projectilesGroup);
    interface StarProjectile {
      mesh: THREE.Mesh;
      velocity: THREE.Vector3;
      life: number;
    }
    const activeProjectiles: StarProjectile[] = [];
    let blasterTimer = 0;
    const starGeo = new THREE.OctahedronGeometry(0.5, 0);
    const starMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfacc15,
      emissiveIntensity: 1.5,
      roughness: 0.2,
    });

    // Aerobatic Smoke Trails for Airplanes and in-air jumps (wingtip ribbons)
    const smokeTrailGroup = new THREE.Group();
    scene.add(smokeTrailGroup);
    interface SmokePuff {
      mesh: THREE.Mesh;
      velocity: THREE.Vector3;
      life: number;
      maxLife: number;
      baseScale: number;
    }
    const activeSmokePuffs: SmokePuff[] = [];
    const smokeGeo = new THREE.SphereGeometry(0.5, 8, 8);
    const smokeMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });
    let smokeTimer = 0;

    // 3D Floating Pop Words Group
    const popWordsGroup = new THREE.Group();
    scene.add(popWordsGroup);
    interface PopWordItem {
      sprite: THREE.Sprite;
      velocity: THREE.Vector3;
      life: number;
      maxLife: number;
      baseScale: number;
    }
    const activePopWords: PopWordItem[] = [];

    const createWordTexture = (text: string, bgColor = '#facc15', textColor = '#1e293b'): THREE.CanvasTexture => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 160;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, 512, 160);
      ctx.fillStyle = bgColor;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.roundRect(12, 12, 488, 136, 36);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = textColor;
      ctx.font = '900 48px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 256, 80);

      const tex = new THREE.CanvasTexture(canvas);
      tex.needsUpdate = true;
      return tex;
    };

    const showPopWord = (text: string, pos: THREE.Vector3, bgColor = '#facc15') => {
      const tex = createWordTexture(text, bgColor);
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
      const sprite = new THREE.Sprite(mat);
      sprite.position.set(pos.x, pos.y + 2.8, pos.z);
      sprite.scale.set(6.4, 2.0, 1.0);
      popWordsGroup.add(sprite);
      activePopWords.push({
        sprite,
        velocity: new THREE.Vector3((Math.random() - 0.5) * 1.5, 6.0, (Math.random() - 0.5) * 1.5),
        life: 2.2,
        maxLife: 2.2,
        baseScale: 6.4,
      });
    };

    // On-Demand Event Spawner implementation
    triggerOnDemandRef.current = (action: string, word?: string, targetVehicleId?: string) => {
      const phys = physicsRef.current;
      const heading = phys.currentYaw;
      const forwardX = -Math.sin(heading);
      const forwardZ = -Math.cos(heading);
      const rightX = -forwardZ;
      const rightZ = forwardX;

      if (action === 'spawn_landed_plane') {
        const spawnPos = new THREE.Vector3(
          phys.position.x + forwardX * 16,
          0,
          phys.position.z + forwardZ * 16
        );
        const planeMesh = createLandedBiplane();
        planeMesh.position.copy(spawnPos);
        planeMesh.rotation.y = heading + Math.PI;
        worldGen.spawnDynamicCollidable(
          `ondemand_biplane_${Date.now()}`,
          'vehicle',
          spawnPos,
          3.4,
          planeMesh,
          'minor',
          false,
          { vehicleId: 'biplane', sound: 'whoosh' }
        );
        showPopWord('✈️ LANDED PLANE!', spawnPos, '#facc15');
        desktopAudio.playMysteryFanfare();
        setActivePowerUpToast({ name: 'LANDED BIPLANE AHEAD! RAM TO FLY!', icon: '✈️' });
        setTimeout(() => setActivePowerUpToast(null), 3500);
      } else if (action === 'spawn_mega_ramp') {
        const rampPos = new THREE.Vector3(
          phys.position.x + forwardX * 14,
          0,
          phys.position.z + forwardZ * 14
        );
        const rampGroup = new THREE.Group();
        const rampGeo = new THREE.BoxGeometry(6.0, 2.4, 5.5);
        rampGeo.rotateX(-Math.PI / 7);
        const rampMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4 });
        const rampMesh = new THREE.Mesh(rampGeo, rampMat);
        rampMesh.position.set(0, 1.2, 0);
        rampGroup.add(rampMesh);

        const ringGeo = new THREE.TorusGeometry(3.2, 0.3, 12, 24);
        const ringMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xfacc15, emissiveIntensity: 1.2 });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.position.set(0, 6.2, 4.0);
        rampGroup.add(ringMesh);

        rampGroup.position.copy(rampPos);
        rampGroup.rotation.y = heading;
        worldGen.spawnDynamicCollidable(
          `ondemand_ramp_${Date.now()}`,
          'stunt_ramp',
          rampPos,
          3.6,
          rampGroup,
          'minor',
          false,
          { sound: 'whoosh' }
        );
        showPopWord('🚀 MEGA RAMP!', rampPos, '#ec4899');
        desktopAudio.playTurboBoost();
        setActivePowerUpToast({ name: 'MEGA STUNT RAMP AHEAD!', icon: '🚀' });
        setTimeout(() => setActivePowerUpToast(null), 3500);
      } else if (action === 'spawn_mushrooms') {
        [-3.2, 0, 3.2].forEach((ox, idx) => {
          const mPos = new THREE.Vector3(
            phys.position.x + forwardX * (12 + idx * 4) + rightX * ox,
            0,
            phys.position.z + forwardZ * (12 + idx * 4) + rightZ * ox
          );
          const mGroup = new THREE.Group();
          const stem = new THREE.Mesh(
            new THREE.CylinderGeometry(0.5, 0.8, 2.2, 10),
            new THREE.MeshStandardMaterial({ color: 0xfef08a })
          );
          stem.position.set(0, 1.1, 0);
          mGroup.add(stem);
          const cap = new THREE.Mesh(
            new THREE.SphereGeometry(1.8, 14, 14, 0, Math.PI * 2, 0, Math.PI / 2),
            new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 })
          );
          cap.position.set(0, 2.2, 0);
          mGroup.add(cap);
          mGroup.position.copy(mPos);
          worldGen.spawnDynamicCollidable(
            `ondemand_shroom_${Date.now()}_${idx}`,
            'trampoline',
            mPos,
            2.2,
            mGroup,
            'minor',
            false,
            { sound: 'boing' }
          );
        });
        showPopWord('🍄 BOUNCY SHROOMS!', phys.position, '#10b981');
        desktopAudio.playPop();
      } else if (action === 'spawn_traffic_rush') {
        const rosterVehicles = ['police_cruiser', 'fire_truck', 'ice_cream_van', 'monster_truck', 'roadster'];
        [-3.5, 0, 3.5].forEach((ox, i) => {
          const vId = rosterVehicles[i % rosterVehicles.length];
          const vPos = new THREE.Vector3(
            phys.position.x + forwardX * (14 + i * 5) + rightX * ox,
            0,
            phys.position.z + forwardZ * (14 + i * 5) + rightZ * ox
          );
          const carGroup = new THREE.Group();
          const body = new THREE.Mesh(
            new THREE.BoxGeometry(2.0, 1.2, 4.0),
            new THREE.MeshStandardMaterial({ color: i === 0 ? 0x3b82f6 : i === 1 ? 0xef4444 : 0xec4899 })
          );
          body.position.set(0, 0.8, 0);
          carGroup.add(body);
          carGroup.position.copy(vPos);
          carGroup.rotation.y = heading;
          worldGen.spawnDynamicCollidable(
            `ondemand_traffic_${Date.now()}_${i}`,
            'traffic_car',
            vPos,
            2.5,
            carGroup,
            'minor',
            false,
            { vehicleId: vId, speed: 7.0 }
          );
        });
        showPopWord('🚗 TRAFFIC CONVOY!', phys.position, '#3b82f6');
        desktopAudio.playHonk();
      } else if (action === 'spawn_star_shower') {
        for (let i = 0; i < 8; i++) {
          const sPos = new THREE.Vector3(
            phys.position.x + forwardX * (8 + i * 3) + (Math.random() - 0.5) * 4,
            1.4,
            phys.position.z + forwardZ * (8 + i * 3) + (Math.random() - 0.5) * 4
          );
          const starMesh = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.7, 0),
            new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xf59e0b, emissiveIntensity: 1.2 })
          );
          starMesh.position.copy(sPos);
          worldGen.spawnDynamicCollidable(
            `ondemand_star_${Date.now()}_${i}`,
            'coin',
            sPos,
            1.6,
            starMesh,
            'minor',
            false,
            { noteIndex: i % 8 }
          );
        }
        showPopWord('⭐ STAR SHOWER!', phys.position, '#f59e0b');
        desktopAudio.playStarCollect();
      } else if (action === 'pop_word') {
        showPopWord(word || 'WHEEE! 🎈', phys.position, '#a855f7');
        desktopAudio.playSpringBounce();
      } else if (targetVehicleId) {
        const vPos = new THREE.Vector3(
          phys.position.x + forwardX * 12,
          0,
          phys.position.z + forwardZ * 12
        );
        const vGroup = new THREE.Group();
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(2.2, 1.4, 4.2),
          new THREE.MeshStandardMaterial({ color: 0x6366f1 })
        );
        body.position.set(0, 0.9, 0);
        vGroup.add(body);
        vGroup.position.copy(vPos);
        vGroup.rotation.y = heading;
        worldGen.spawnDynamicCollidable(
          `ondemand_v_${Date.now()}`,
          'vehicle',
          vPos,
          2.8,
          vGroup,
          'minor',
          false,
          { vehicleId: targetVehicleId, sound: 'whoosh' }
        );
        const vName = vehicles.find((v) => v.id === targetVehicleId)?.name || 'Vehicle';
        showPopWord(`🚗 HIT: ${vName.toUpperCase()}!`, vPos, '#6366f1');
      } else if (action === 'spawn_challenge') {
        const challengeId = targetVehicleId || 'police_chase';
        const challenge = getChallengeById(challengeId);
        const beaconPos = new THREE.Vector3(
          phys.position.x + forwardX * 16,
          1.8,
          phys.position.z + forwardZ * 16
        );
        const beaconGroup = new THREE.Group();
        beaconGroup.name = 'challenge_beacon_group';
        const orbGeo = new THREE.SphereGeometry(1.6, 16, 16);
        const orbColor = challenge ? new THREE.Color(challenge.bubbleColor) : new THREE.Color(0x3b82f6);
        const orbMat = new THREE.MeshStandardMaterial({
          color: orbColor,
          emissive: orbColor,
          emissiveIntensity: 0.9,
          roughness: 0.2,
          metalness: 0.8,
          transparent: true,
          opacity: 0.88,
        });
        const orb = new THREE.Mesh(orbGeo, orbMat);
        beaconGroup.add(orb);

        const ringGeo = new THREE.TorusGeometry(2.4, 0.2, 12, 32);
        const ringMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: orbColor,
          emissiveIntensity: 0.5,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 4;
        beaconGroup.add(ring);

        beaconGroup.position.copy(beaconPos);
        worldGen.spawnDynamicCollidable(
          `ondemand_challenge_${Date.now()}`,
          'challenge_beacon',
          beaconPos,
          3.2,
          beaconGroup,
          'minor',
          false,
          { vehicleId: challenge?.vehicleId, sound: 'mystery', powerUp: challengeId }
        );

        const challengeTitle = challenge?.title || 'CHALLENGE AHEAD!';
        showPopWord(`${challenge?.badge || '🎯'} ${challengeTitle.toUpperCase()}!`, beaconPos, challenge?.bubbleColor || '#3b82f6');
        desktopAudio.playMysteryFanfare();
        setActivePowerUpToast({
          name: `${challenge?.badge || '🎯'} ${challengeTitle.toUpperCase()} BEACON AHEAD!`,
          icon: challenge?.badge || '🎯',
        });
        setTimeout(() => setActivePowerUpToast(null), 4000);
      }
    };

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

      // 3. Non-blocking Obstacle & Interactive Collisions check (Boosts, Springs, Coins, Mystery Boxes, Portals, Vehicles!)
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
            physics.triggerSuperBounce(34.0, 16.0);
            desktopAudio.playSpringBounce();
            showPopWord('SUPER JUMP! 🚀', physics.position, '#ec4899');
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
            else if (powerUp === 'honk') desktopAudio.playHonk();
            else if (powerUp === 'train_whistle') desktopAudio.playTrainWhistle();
            else if (powerUp === 'whoosh') desktopAudio.playWhoosh();
            else if (powerUp === 'pop') desktopAudio.playPop();
            else desktopAudio.playCrash('minor');
            peerServiceRef.current?.send({ type: 'INTERACTIVE_TRIGGER', action: 'creature', powerUp });
          }
        },
        (targetVehicleId, obj) => {
          // Challenge Beacon trigger: changes world, swaps vehicle, triggers mission fanfare!
          if (obj.type === 'challenge_beacon') {
            const challengeId = obj.extraData?.powerUp || 'police_chase';
            const challenge = getChallengeById(challengeId);
            if (challenge) {
              handleSwitchWorld(challenge.targetWorldId);
              switchVehicleModel(challenge.vehicleId);
              physics.triggerTurboBoost(24.0, 3.0);
              desktopAudio.playMysteryFanfare();
              showPopWord(challenge.bannerText, physics.position, challenge.bubbleColor);
              setActivePowerUpToast({ name: challenge.bannerText, icon: challenge.badge });
              setTimeout(() => setActivePowerUpToast(null), 4000);
              if (challengeId === 'police_chase') {
                triggerOnDemandRef.current?.('spawn_traffic_rush');
              }
            }
            return;
          }

          // Vehicle collision handling: SWAP (drive it on hit - default) or DESTROY
          const action = settingsRef.current.vehicleHitActions?.[targetVehicleId] ?? 'swap';
          if (action === 'swap') {
            switchVehicleModel(targetVehicleId);
            desktopAudio.playMysteryFanfare();
            worldGen.triggerConfetti(obj.position, 60);
            obj.hitTimestamp = performance.now();
            obj.isDestroyed = true;
            obj.mesh.visible = false;
            obj.respawnTime = performance.now() + 8000;
            const hitVehicleName = vehicles.find((v) => v.id === targetVehicleId)?.name || 'New Vehicle';
            setActivePowerUpToast({ name: `DRIVING: ${hitVehicleName.toUpperCase()}! 🚗💨`, icon: '🎉' });
            setTimeout(() => setActivePowerUpToast(null), 4000);
            peerServiceRef.current?.send({
              type: 'SWAP_VEHICLE',
              vehicleId: targetVehicleId,
            });
          } else {
            worldGen.destroyObject(obj);
            desktopAudio.playCrash('major');
            peerServiceRef.current?.send({
              type: 'COLLISION_TRIGGER',
              severity: 'major',
            });
          }
        }
      );

      // Mini-Games Execution
      const enabledMiniGames = settingsRef.current.enabledMiniGames || [];

      // Mini-Game 1: Rainbow Paint Trail (Ground vehicles ON THE GROUND only!)
      const isVehicleInAir = !physics.isGrounded || physics.position.y > 0.6 || physics.isAirVehicle;
      if (enabledMiniGames.includes('paint_trail')) {
        paintTrailGroup.visible = true;
        // Strictly only paint when wheels are rolling ON THE GROUND! Never in the air, and not for airplanes!
        if (!isVehicleInAir && Math.abs(physics.speed) > 1.2 && physics.position.distanceTo(lastPaintPos) > 1.2) {
          lastPaintPos.copy(physics.position);
          paintHue = (paintHue + 0.04) % 1.0;
          const segMat = new THREE.MeshBasicMaterial({
            color: new THREE.Color().setHSL(paintHue, 1.0, 0.55),
            side: THREE.DoubleSide,
            depthWrite: false,
          });
          const segGeo = new THREE.PlaneGeometry(1.8, 1.4);
          segGeo.rotateX(-Math.PI / 2);
          const seg = new THREE.Mesh(segGeo, segMat);
          seg.position.set(physics.position.x, 0.05, physics.position.z);
          seg.rotation.y = physics.currentYaw;
          paintTrailGroup.add(seg);
          paintSegments.push(seg);
          if (paintSegments.length > 180) {
            const old = paintSegments.shift();
            if (old) {
              paintTrailGroup.remove(old);
              old.geometry.dispose();
              (old.material as THREE.Material).dispose();
            }
          }
        }
      } else {
        paintTrailGroup.visible = false;
      }

      // Aerobatic Smoke Trails for Airplanes / In-Air Jumps (Wingtip cloud trails in mid-air)
      const shouldEmitSmoke =
        (physics.isAirVehicle || (!physics.isGrounded && physics.position.y > 1.5)) &&
        Math.abs(physics.speed) > 1.5;
      if (shouldEmitSmoke) {
        smokeTimer += delta;
        if (smokeTimer >= 0.05) {
          smokeTimer = 0;
          const heading = physics.currentYaw;
          const forwardX = -Math.sin(heading);
          const forwardZ = -Math.cos(heading);
          const rightX = -forwardZ;
          const rightZ = forwardX;
          const wingOffsets = physics.isAirVehicle ? [-2.6, 2.6] : [0];
          wingOffsets.forEach((offset) => {
            const puffMesh = new THREE.Mesh(smokeGeo, smokeMat.clone());
            puffMesh.position.set(
              physics.position.x + rightX * offset - forwardX * 0.8,
              physics.position.y + (physics.isAirVehicle ? 0.3 : 0.8),
              physics.position.z + rightZ * offset - forwardZ * 0.8
            );
            smokeTrailGroup.add(puffMesh);
            activeSmokePuffs.push({
              mesh: puffMesh,
              velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.4,
                0.4 + Math.random() * 0.4,
                (Math.random() - 0.5) * 0.4
              ),
              life: 1.8,
              maxLife: 1.8,
              baseScale: 0.6 + Math.random() * 0.3,
            });
          });
        }
      }

      for (let i = activeSmokePuffs.length - 1; i >= 0; i--) {
        const p = activeSmokePuffs[i];
        p.life -= delta;
        p.mesh.position.addScaledVector(p.velocity, delta);
        const progress = 1 - p.life / p.maxLife;
        const currentScale = p.baseScale * (1.0 + progress * 2.8);
        p.mesh.scale.setScalar(currentScale);
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - progress) * 0.45);

        if (p.life <= 0) {
          smokeTrailGroup.remove(p.mesh);
          p.mesh.geometry.dispose();
          (p.mesh.material as THREE.Material).dispose();
          activeSmokePuffs.splice(i, 1);
        }
      }

      // 3D Floating Pop Words Tick
      for (let i = activePopWords.length - 1; i >= 0; i--) {
        const pw = activePopWords[i];
        pw.life -= delta;
        pw.sprite.position.addScaledVector(pw.velocity, delta);
        pw.velocity.y *= Math.exp(-1.4 * delta);
        const progress = 1 - pw.life / pw.maxLife;
        pw.sprite.material.opacity = Math.max(0, 1 - progress * 1.2);
        const bounceScale = pw.baseScale * (1.0 + Math.sin(progress * Math.PI) * 0.25);
        pw.sprite.scale.set(bounceScale, bounceScale * (2.0 / 6.4), 1.0);

        if (pw.life <= 0) {
          popWordsGroup.remove(pw.sprite);
          pw.sprite.material.map?.dispose();
          pw.sprite.material.dispose();
          activePopWords.splice(i, 1);
        }
      }

      // Mini-Game 2: Red Chasers (Tag)
      if (enabledMiniGames.includes('red_chasers')) {
        redChasersGroup.visible = true;
        for (const chaser of redChasers) {
          const dx = physics.position.x - chaser.position.x;
          const dz = physics.position.z - chaser.position.z;
          const dist = Math.hypot(dx, dz);

          chaser.mesh.rotation.y = Math.atan2(dx, dz) + Math.PI;

          if (dist > 2.2) {
            const moveSpeed = chaser.speed * delta;
            chaser.position.x += (dx / dist) * moveSpeed;
            chaser.position.z += (dz / dist) * moveSpeed;
          }

          chaser.mesh.position.set(
            chaser.position.x,
            Math.abs(Math.sin(elapsed * 6 + chaser.hopPhase)) * 1.4 + 0.85,
            chaser.position.z
          );

          if (dist < 2.3) {
            desktopAudio.playPop();
            worldGen.triggerConfetti(chaser.mesh.position, 35);
            setActivePowerUpToast({ name: 'BOING! TAGGED RED BUDDY! 🔴✨', icon: '🎉' });
            setTimeout(() => setActivePowerUpToast(null), 3000);
            const respawnAngle = Math.random() * Math.PI * 2;
            chaser.position.set(
              physics.position.x + Math.cos(respawnAngle) * 45,
              0.85,
              physics.position.z + Math.sin(respawnAngle) * 45
            );
          }
        }
      } else {
        redChasersGroup.visible = false;
      }

      // Mini-Game 3: Star Blaster
      if (enabledMiniGames.includes('star_blaster')) {
        projectilesGroup.visible = true;
        blasterTimer += delta;
        if (blasterTimer >= 0.75 && Math.abs(physics.speed) > 2.0) {
          blasterTimer = 0;
          desktopAudio.playWhoosh();
          [-0.7, 0.7].forEach((side) => {
            const star = new THREE.Mesh(starGeo, starMat);
            const heading = physics.currentYaw;
            const forwardX = -Math.sin(heading);
            const forwardZ = -Math.cos(heading);
            const rightX = -forwardZ;
            const rightZ = forwardX;
            star.position.set(
              physics.position.x + forwardX * 2.5 + rightX * side,
              physics.position.y + 0.9,
              physics.position.z + forwardZ * 2.5 + rightZ * side
            );
            projectilesGroup.add(star);
            activeProjectiles.push({
              mesh: star,
              velocity: new THREE.Vector3(forwardX * 36, 0, forwardZ * 36),
              life: 1.2,
            });
          });
        }

        for (let i = activeProjectiles.length - 1; i >= 0; i--) {
          const p = activeProjectiles[i];
          p.mesh.position.addScaledVector(p.velocity, delta);
          p.mesh.rotation.x += delta * 12;
          p.mesh.rotation.y += delta * 15;
          p.life -= delta;

          let hit = false;
          if (enabledMiniGames.includes('red_chasers')) {
            for (const chaser of redChasers) {
              if (p.mesh.position.distanceTo(chaser.mesh.position) < 2.0) {
                hit = true;
                desktopAudio.playPop();
                worldGen.triggerConfetti(chaser.mesh.position, 35);
                const respawnAngle = Math.random() * Math.PI * 2;
                chaser.position.set(
                  physics.position.x + Math.cos(respawnAngle) * 45,
                  0.85,
                  physics.position.z + Math.sin(respawnAngle) * 45
                );
                break;
              }
            }
          }

          if (hit || p.life <= 0) {
            projectilesGroup.remove(p.mesh);
            activeProjectiles.splice(i, 1);
          }
        }
      } else {
        projectilesGroup.visible = false;
      }

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
          pitch: physics.pitchAngle,
          roll: physics.rollAngle,
          isFlipped: physics.isFlipped,
          speed: physics.speed,
          worldId: activeWorldIdRef.current,
          vehicleId: activeVehicleIdRef.current,
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
        onSelectVehicle={(id) => switchVehicleModel(id)}
        onTriggerOnDemand={(action, word, vehicleId) => triggerOnDemandRef.current?.(action, word, vehicleId)}
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
