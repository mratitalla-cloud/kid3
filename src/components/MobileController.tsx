/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
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
} from 'lucide-react';

interface MobileControllerProps {
  sessionId: string;
}

export const MobileController: React.FC<MobileControllerProps> = ({ sessionId }) => {
  const [hasStarted, setHasStarted] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [vehicles] = useState<VehicleItem[]>(BUILTIN_VEHICLES);
  const [currentVehicleIndex, setCurrentVehicleIndex] = useState(0);
  const [isSlideAnimating, setIsSlideAnimating] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [hasMotionSensor, setHasMotionSensor] = useState(false);
  const [sensorStatusText, setSensorStatusText] = useState('Checking Sensors...');
  const [currentAngleDisplay, setCurrentAngleDisplay] = useState(0);

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

  const activeVehicle = vehicles[currentVehicleIndex] || vehicles[0];

  // Toddler-proof input lock: prevent right-click context menu and navigation
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

  // Handle incoming events from host (collisions, jump landings, resets)
  const handleHostEvent = useCallback((event: GameEvent) => {
    if (event.type === 'COLLISION_TRIGGER') {
      HapticsService.trigger(event.severity, true, 1.0);
      if (event.severity !== 'landing') {
        mobileAudio.playCrash(event.severity);
      }
    } else if (event.type === 'SWAP_VEHICLE') {
      const idx = vehicles.findIndex((v) => v.id === event.vehicleId);
      if (idx !== -1) {
        setCurrentVehicleIndex(idx);
      }
    }
  }, [vehicles]);

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

  // Request Wake Lock to prevent screen dimming
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
    setSensorStatusText(`Steering Active: ${Math.round(alpha)}°`);
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
        az = (g.z ?? 9.8) - 9.8; // Gravity offset when flat on table
      }
    }

    const rawZ = az ?? 0;
    const deltaZ = Math.abs(rawZ - lastAccelZRef.current);
    lastAccelZRef.current = rawZ;

    motionPacketRef.current.accelX = ax ?? 0;
    motionPacketRef.current.accelY = ay ?? 0;
    // Combine raw vertical acceleration and sudden delta for robust jump lift detection
    motionPacketRef.current.accelZ = Math.max(rawZ, deltaZ);
  }, []);

  // Request motion permissions explicitly (iOS 13+ and Android)
  const triggerPermissionsRequest = () => {
    const DeviceOrientation = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    const DeviceMotion = window.DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };

    // iOS 13+ requires requestPermission called directly on synchronous user gesture
    if (typeof DeviceOrientation?.requestPermission === 'function') {
      DeviceOrientation.requestPermission()
        .then((perm) => {
          if (perm === 'granted') {
            window.addEventListener('deviceorientation', handleDeviceOrientation, true);
            window.addEventListener('deviceorientationabsolute', handleDeviceOrientation, true);
            setHasMotionSensor(true);
            setSensorStatusText('Permissions Granted!');
          } else {
            setSensorStatusText('Motion Permission Denied');
          }
        })
        .catch((err) => {
          console.warn('Orientation request failed:', err);
          setSensorStatusText('Permission Prompt Failed');
        });
    } else {
      // Non-iOS: standard event listeners
      window.addEventListener('deviceorientation', handleDeviceOrientation, true);
      window.addEventListener('deviceorientationabsolute', handleDeviceOrientation, true);
      setHasMotionSensor(true);
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

  // Tap-to-Start Permission Handshake (Phase 1.1 & Phase 2.1)
  const handleTapToStart = async () => {
    // 1. Immediately request motion permissions synchronously in user activation context!
    triggerPermissionsRequest();

    // 2. Audio Activation
    await mobileAudio.resume();
    mobileAudio.startEngine();

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
      // Ignore fullscreen rejection
    }

    // 4. Screen Orientation Lock
    try {
      if (screen.orientation && 'lock' in screen.orientation) {
        await screen.orientation.lock('portrait');
      }
    } catch {
      // Ignore
    }

    // 5. Screen Wake Lock
    await requestWakeLock();

    // 6. Start 60Hz motion data stream loop over WebRTC
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

      // Modulate local engine audio based on motion push
      const speedEstimate = 1.0 + Math.max(0, Math.abs(packet.accelY) * 0.8);
      mobileAudio.updateEngineSpeed(speedEstimate);
    }, 1000 / 60);

    setHasStarted(true);
  };

  // Horizontal Swipe Switcher
  const handleTouchStart = (e: React.TouchEvent) => {
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

    // Swipe detection: swipe threshold > 40px and predominantly horizontal
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3 && duration < 600) {
      if (deltaX > 0) {
        triggerVehicleSwap('right', -1);
      } else {
        triggerVehicleSwap('left', 1);
      }
    }
  };

  const triggerVehicleSwap = (direction: 'left' | 'right', step: number) => {
    if (isSlideAnimating) return;

    setIsSlideAnimating(true);
    setSlideDirection(direction);

    const nextIndex = (currentVehicleIndex + step + vehicles.length) % vehicles.length;
    setCurrentVehicleIndex(nextIndex);
    const newVehicle = vehicles[nextIndex];

    mobileAudio.playVehicleSwap();
    HapticsService.trigger('minor', true, 0.8);

    peerServiceRef.current?.send({
      type: 'SWAP_VEHICLE',
      vehicleId: newVehicle.id,
    });

    setTimeout(() => {
      setIsSlideAnimating(false);
    }, 300);
  };

  // Manual Jump button trigger
  const handleManualJump = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    // Simulate high vertical acceleration spike
    motionPacketRef.current.accelZ = 12.0;
    mobileAudio.playJump();
    HapticsService.trigger('landing', true, 0.9);
    setTimeout(() => {
      motionPacketRef.current.accelZ = 0;
    }, 100);
  };

  const toggleAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAudioMuted) {
      mobileAudio.setVolume(0.8);
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
            Turn your phone into a steering toy car for the big screen!
          </p>
        </div>

        {/* Big tactile button */}
        <div className="w-full max-w-xs py-8 px-6 bg-white text-slate-900 rounded-3xl shadow-2xl flex flex-col items-center text-center transform active:scale-95 transition-transform">
          <Sparkles className="w-8 h-8 text-amber-500 mb-2 animate-spin" />
          <span className="text-2xl font-black tracking-wide text-orange-600">
            TAP TO DRIVE!
          </span>
          <span className="text-xs text-slate-500 mt-1">
            Enables motion steering & engine sounds
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

  // Phase 2: Toddler-Proof Direct Phone Mode (~80% Vehicle Screen Display)
  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-between select-none overflow-hidden touch-none"
    >
      {/* Top Status Bar with Sensor Diagnostics & Permission Recovery */}
      <div className="w-full px-4 pt-3 flex items-center justify-between z-20 pointer-events-none">
        <div className="flex items-center gap-2">
          {connectionState === 'connected' ? (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 rounded-full text-emerald-400 text-xs font-semibold backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>CONNECTED</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 border border-amber-500/40 rounded-full text-amber-400 text-xs font-semibold backdrop-blur-sm">
              <WifiOff className="w-3.5 h-3.5" />
              <span>RECONNECTING...</span>
            </div>
          )}

          {/* Motion Sensor Status Badge & Manual Permission Recovery Button */}
          {hasMotionSensor ? (
            <div className="flex items-center gap-1 px-2.5 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-full text-indigo-300 text-[11px] font-mono">
              <Compass className="w-3 h-3 text-indigo-400" />
              <span>{currentAngleDisplay}°</span>
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerPermissionsRequest();
              }}
              className="pointer-events-auto flex items-center gap-1.5 px-3 py-1 bg-rose-500/30 hover:bg-rose-500/50 border border-rose-400/50 rounded-full text-rose-200 text-xs font-bold animate-pulse"
            >
              <AlertCircle className="w-3.5 h-3.5 text-rose-300" />
              <span>Tap to Allow Sensors</span>
            </button>
          )}
        </div>

        {/* Quiet Sound Mute Toggle */}
        <button
          onClick={toggleAudio}
          className="pointer-events-auto p-2 bg-white/10 hover:bg-white/20 rounded-full text-white/80 transition-colors"
        >
          {isAudioMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Prominent Top-Down Vehicle Display (~80% Screen) with Swipe Transitions */}
      <div className="relative flex-1 w-full max-w-sm flex items-center justify-center p-4">
        {/* Subtle ground dirt road texture under vehicle */}
        <div className="absolute inset-x-8 inset-y-12 bg-amber-950/20 rounded-3xl border-2 border-dashed border-amber-500/10" />

        <div
          className={`w-full h-full flex items-center justify-center transition-transform duration-300 ${
            isSlideAnimating
              ? slideDirection === 'left'
                ? '-translate-x-full opacity-40'
                : 'translate-x-full opacity-40'
              : 'translate-x-0 opacity-100'
          }`}
          dangerouslySetInnerHTML={{
            __html: activeVehicle.renderTopDownSvg(
              activeVehicle.primaryColor,
              activeVehicle.accentColor
            ),
          }}
        />

        {/* Quick Tap Jump Button in lower right */}
        <button
          onClick={handleManualJump}
          onTouchStart={handleManualJump}
          className="absolute bottom-6 right-6 pointer-events-auto flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600/80 active:bg-indigo-500 text-white rounded-full shadow-lg border border-indigo-400/40 text-xs font-bold backdrop-blur-sm"
        >
          <ArrowUpCircle className="w-4 h-4 text-amber-300" />
          <span>JUMP!</span>
        </button>
      </div>

      {/* Subtle Bottom Instruction Indicator */}
      <div className="w-full pb-6 px-6 text-center z-20 pointer-events-none">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-white/70 text-xs font-medium">
          <span>Twist on table to steer • Push for boost • Swipe to swap car</span>
        </div>
      </div>
    </div>
  );
};
