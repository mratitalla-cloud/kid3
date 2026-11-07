/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Sliders,
  RotateCcw,
  Compass,
  Volume2,
  Vibrate,
  Sparkles,
  Camera,
  Layers,
  ChevronDown,
  ChevronUp,
  X,
  Copy,
  Check,
  FileCode,
  Globe,
  Trees,
  Car,
  Train,
  PartyPopper,
  Flame,
  Zap,
  Plane,
  Send,
  Target,
  ShieldAlert,
} from 'lucide-react';
import { ParentSettings, MotionPacket } from '../types/game';
import { BUILTIN_VEHICLES, getAiVehiclePrompt, loadVehicleFromModule, VehicleItem } from '../vehicles/roster';
import { BUILTIN_WORLDS, getAiWorldPrompt, WorldDefinition } from '../worlds';
import { BUILTIN_MODULES, getAiModulePrompt } from '../modules';
import { BUILTIN_CHALLENGES, getAiChallengePrompt } from '../challenges';

interface ParentPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ParentSettings;
  onUpdateSettings: (newSettings: ParentSettings) => void;
  latestMotion: MotionPacket | null;
  onLockBaseline: () => void;
  onResetSpawn: () => void;
  onAddCustomVehicle: (vehicle: VehicleItem) => void;
  activeVehicles: VehicleItem[];
  onForceRequestPermissions: () => void;
  currentWorldId: string;
  onSelectWorld: (worldId: string) => void;
  onSelectVehicle?: (vehicleId: string) => void;
  onTriggerOnDemand?: (
    action: 'spawn_landed_plane' | 'spawn_mega_ramp' | 'spawn_train_crossing' | 'spawn_traffic_rush' | 'spawn_red_chasers' | 'spawn_star_shower' | 'spawn_mushrooms' | 'pop_word' | 'spawn_challenge',
    word?: string,
    vehicleId?: string
  ) => void;
}

export const ParentPanel: React.FC<ParentPanelProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  latestMotion,
  onLockBaseline,
  onResetSpawn,
  onAddCustomVehicle,
  activeVehicles,
  onForceRequestPermissions,
  currentWorldId,
  onSelectWorld,
  onSelectVehicle,
  onTriggerOnDemand,
}) => {
  const [activeTab, setActiveTab] = useState<'triggers' | 'challenges' | 'calibration' | 'worlds' | 'modules' | 'vehicles' | 'audio' | 'environment'>('triggers');
  const [customWord, setCustomWord] = useState('WHEEE! 🎈');
  const [customChallengePrompt, setCustomChallengePrompt] = useState('High-speed police chase through neon city with siren barricades and runaway vans');
  const [copiedChallengePrompt, setCopiedChallengePrompt] = useState(false);
  const [customJsCode, setCustomJsCode] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [worldThemeIdea, setWorldThemeIdea] = useState('Underwater Coral Kingdom or Pirate Cove');
  const [copiedWorldPrompt, setCopiedWorldPrompt] = useState(false);
  const [moduleIdea, setModuleIdea] = useState('Dinosaur stampede with stomping triceratops crossing');
  const [copiedModulePrompt, setCopiedModulePrompt] = useState(false);

  if (!isOpen) return null;

  const currentRelativeAngle = latestMotion
    ? Math.round(((latestMotion.alpha - settings.baselineAlpha + 360) % 360))
    : 0;

  const handleCopyAiPrompt = () => {
    const prompt = getAiVehiclePrompt('A colorful cartoon steam roller with heavy roller drum and cab');
    navigator.clipboard.writeText(prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleCopyWorldAiPrompt = () => {
    const prompt = getAiWorldPrompt(worldThemeIdea);
    navigator.clipboard.writeText(prompt);
    setCopiedWorldPrompt(true);
    setTimeout(() => setCopiedWorldPrompt(false), 2000);
  };

  const handleImportModule = async () => {
    if (!customJsCode.trim()) return;
    try {
      setImportStatus('Loading module...');
      const vehicle = await loadVehicleFromModule(customJsCode);
      onAddCustomVehicle(vehicle);
      setImportStatus(`Successfully added "${vehicle.name}"!`);
      setCustomJsCode('');
      setTimeout(() => setImportStatus(null), 3000);
    } catch (err: unknown) {
      setImportStatus(`Error: ${(err as Error).message}`);
    }
  };

  const toggleVehicleActive = (id: string) => {
    const current = new Set(settings.activeVehicleIds);
    if (current.has(id)) {
      if (current.size > 1) {
        current.delete(id);
      }
    } else {
      current.add(id);
    }
    onUpdateSettings({ ...settings, activeVehicleIds: Array.from(current) });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none p-4 md:p-6">
      {/* Background scrim */}
      <div
        className="fixed inset-0 bg-slate-950/40 pointer-events-auto transition-opacity"
        onClick={onClose}
      />

      {/* Glassmorphic Parent Control Dock */}
      <div className="relative w-full max-w-4xl max-h-[85vh] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 pointer-events-auto overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Sliders className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Master Parent Control Panel
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              [Esc to toggle]
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onResetSpawn}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Recenter Spawn
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 overflow-x-auto">
          <button
            onClick={() => setActiveTab('triggers')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === 'triggers'
                ? 'bg-white dark:bg-slate-900 text-amber-500 border-t-2 border-amber-500 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-500 animate-pulse" />
            <span>⚡ Live On-Demand Triggers</span>
          </button>
          <button
            onClick={() => setActiveTab('challenges')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === 'challenges'
                ? 'bg-white dark:bg-slate-900 text-rose-500 border-t-2 border-rose-500 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Target className="w-4 h-4 text-rose-500" />
            <span>🎯 Challenges & AI Mission Prompts</span>
          </button>
          <button
            onClick={() => setActiveTab('calibration')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === 'calibration'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border-t-2 border-indigo-600 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Compass className="w-4 h-4" />
            Motion & Calibration
          </button>
          <button
            onClick={() => setActiveTab('worlds')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors ${
              activeTab === 'worlds'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border-t-2 border-indigo-600 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Globe className="w-4 h-4" />
            Worlds & Portals
          </button>
          <button
            onClick={() => setActiveTab('modules')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors ${
              activeTab === 'modules'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border-t-2 border-indigo-600 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            Modules & Events
          </button>
          <button
            onClick={() => setActiveTab('vehicles')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors ${
              activeTab === 'vehicles'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border-t-2 border-indigo-600 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            Vehicle Roster & AI Importer
          </button>
          <button
            onClick={() => setActiveTab('audio')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors ${
              activeTab === 'audio'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border-t-2 border-indigo-600 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            Audio & Haptics
          </button>
          <button
            onClick={() => setActiveTab('environment')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors ${
              activeTab === 'environment'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border-t-2 border-indigo-600 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            World & Camera
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
          {activeTab === 'triggers' && (
            <div className="space-y-6">
              {/* Header Banner */}
              <div className="p-4 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-indigo-500/10 rounded-2xl border border-amber-500/30">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-black text-sm">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <span>Interactive Live Event Spawners (Activate on Request)</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  Click any button to immediately spawn an exciting stunt, landed airplane, or train right in front of your toddler while they play!
                </p>
              </div>

              {/* Section 1: Landed Planes & Flight Stunts */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  <Plane className="w-4 h-4 text-sky-500" />
                  <span>✈️ Landed Biplanes & Airport Runways</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Toddlers can clearly see landed planes parked on the tarmac. Hit the plane to immediately jump in and take flight!
                </p>
                <div className="flex flex-wrap gap-2.5 pt-1">
                  <button
                    onClick={() => onTriggerOnDemand?.('spawn_landed_plane')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all border border-sky-400"
                  >
                    <Plane className="w-4 h-4" />
                    <span>Land a Biplane Right Ahead ✈️</span>
                  </button>
                  <button
                    onClick={() => onSelectVehicle?.('biplane')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all border border-amber-300"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Drive / Fly Biplane Now</span>
                  </button>
                </div>
              </div>

              {/* Section 2: Mega Jumps, Stunts & Trampolines */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span>🚀 Mega Stunt Ramps & Big Jumps</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Spawns giant launch ramps and springy mushrooms that launch vehicles 34+ meters into the air with cartoon floaty hangtime!
                </p>
                <div className="flex flex-wrap gap-2.5 pt-1">
                  <button
                    onClick={() => onTriggerOnDemand?.('spawn_mega_ramp')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all border border-orange-400"
                  >
                    <Flame className="w-4 h-4" />
                    <span>Spawn Mega Stunt Ramp (34m Jump!) 🚀</span>
                  </button>
                  <button
                    onClick={() => onTriggerOnDemand?.('spawn_mushrooms')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all border border-emerald-400"
                  >
                    <Trees className="w-4 h-4" />
                    <span>Spawn Bouncy Mushrooms 🍄</span>
                  </button>
                  <button
                    onClick={() => onTriggerOnDemand?.('spawn_star_shower')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all border border-amber-300"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Rain Star Shower ⭐</span>
                  </button>
                </div>
              </div>

              {/* Section 3: Live World Events (Trains & Traffic) */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  <Car className="w-4 h-4 text-indigo-500" />
                  <span>🚗 World Events: Trains & Traffic Convoys</span>
                </div>
                <div className="flex flex-wrap gap-2.5 pt-1">
                  <button
                    onClick={() => onTriggerOnDemand?.('spawn_traffic_rush')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                  >
                    <Car className="w-4 h-4" />
                    <span>Spawn Traffic Convoy Ahead 🚗</span>
                  </button>
                  <button
                    onClick={() => onSelectVehicle?.('steam_train')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                  >
                    <Train className="w-4 h-4" />
                    <span>Drive Steam Train 🚂</span>
                  </button>
                </div>
              </div>

              {/* Section 4: 3D Floating Comic Pop Words */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  <PartyPopper className="w-4 h-4 text-purple-500" />
                  <span>💬 Pop 3D Comic Words in World</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Spawns animated 3D comic speech bubbles right above the car!
                </p>
                <div className="flex flex-wrap gap-2">
                  {['WHEEE! 🎈', 'SUPER JUMP! 🚀', 'BOING! 🍄', 'VROOM! 🏎️', 'AIRSHOW! ✈️', 'NICE JOB! ⭐', 'ZOOM! ⚡'].map((w) => (
                    <button
                      key={w}
                      onClick={() => onTriggerOnDemand?.('pop_word', w)}
                      className="px-3 py-1.5 bg-white dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 shadow-sm active:scale-95 transition-all"
                    >
                      {w}
                    </button>
                  ))}
                </div>
                {/* Custom Word Input */}
                <div className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={customWord}
                    onChange={(e) => setCustomWord(e.target.value)}
                    placeholder="Type your kid's name or custom cheer (e.g. GO LEO! 🎉)"
                    className="flex-1 px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={() => {
                      if (customWord.trim()) {
                        onTriggerOnDemand?.('pop_word', customWord.trim());
                      }
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Pop in 3D!</span>
                  </button>
                </div>
              </div>

              {/* Section 5: Instant 1-Click World Switcher */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  <Globe className="w-4 h-4 text-teal-500" />
                  <span>🌍 Instant World Switcher (1-Click Warp)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {BUILTIN_WORLDS.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => onSelectWorld(w.id)}
                      className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all active:scale-95 flex items-center justify-between ${
                        currentWorldId === w.id
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                          : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                      }`}
                    >
                      <span className="truncate">{w.name}</span>
                      {currentWorldId === w.id && <Check className="w-3.5 h-3.5 text-white ml-1 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Section 6: Direct Vehicle Spawner Ahead on Road */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  <Car className="w-4 h-4 text-indigo-500" />
                  <span>🚗 Spawn Target Vehicle on Road (To Hit & Drive)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {activeVehicles.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => onTriggerOnDemand?.('spawn_traffic_rush', undefined, v.id)}
                      className="p-2 bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-left text-xs transition-all active:scale-95"
                    >
                      <div className="font-bold text-slate-800 dark:text-slate-200 truncate">{v.name}</div>
                      <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">Spawn Ahead ➜</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'challenges' && (
            <div className="space-y-6">
              {/* AI Mission Prompt Generator Box */}
              <div className="p-5 bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30 rounded-2xl border-2 border-rose-300 dark:border-rose-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-black text-sm text-rose-700 dark:text-rose-300 uppercase tracking-wide">
                    <Target className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                    <span>✨ AI Mission Prompt & Live Beacon Spawner</span>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(getAiChallengePrompt(customChallengePrompt));
                      setCopiedChallengePrompt(true);
                      setTimeout(() => setCopiedChallengePrompt(false), 2200);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-700 hover:bg-rose-100 dark:hover:bg-slate-800 rounded-lg text-xs font-bold text-rose-700 dark:text-rose-300 transition-all shadow-sm active:scale-95"
                  >
                    {copiedChallengePrompt ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Prompt Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy AI Prompt</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-xs text-rose-800 dark:text-rose-200">
                  Type any custom toddler scenario or game theme below (e.g. <em>&quot;Police chase speeders with sirens and road cones&quot;</em>). You can copy the engineered AI prompt for Claude/Gemini, or click <strong>Spawn Beacon Ahead</strong> to spawn an interactive 3D Mission Beacon directly on the road!
                </p>

                <div className="space-y-2">
                  <textarea
                    value={customChallengePrompt}
                    onChange={(e) => setCustomChallengePrompt(e.target.value)}
                    rows={2}
                    placeholder="Enter scenario e.g. Police cruiser chasing reckless sports cars through the city..."
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 resize-none font-medium"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => onTriggerOnDemand?.('spawn_challenge', customChallengePrompt, 'police_chase')}
                      className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-95"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Spawn Custom Mission Beacon Ahead on Road ➜</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Built-in Instant Challenges Grid */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  <Flame className="w-4 h-4 text-amber-500" />
                  <span>Interactive Toddler Challenges (Spawn On Road Ahead)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {BUILTIN_CHALLENGES.map((challenge) => (
                    <div
                      key={challenge.id}
                      className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{challenge.badge}</span>
                            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                              {challenge.title}
                            </span>
                          </div>
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase"
                            style={{
                              backgroundColor: `${challenge.bubbleColor}20`,
                              color: challenge.bubbleColor,
                            }}
                          >
                            {challenge.targetWorldId.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          {challenge.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                        <button
                          onClick={() => {
                            const p = getAiChallengePrompt(challenge.aiPromptIdea);
                            navigator.clipboard.writeText(p);
                            setCustomChallengePrompt(challenge.aiPromptIdea);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy Prompt</span>
                        </button>

                        <button
                          onClick={() => onTriggerOnDemand?.('spawn_challenge', challenge.description, challenge.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white rounded-lg shadow-sm hover:shadow transition-all active:scale-95"
                          style={{ backgroundColor: challenge.bubbleColor }}
                        >
                          <span>Spawn Beacon Ahead ➜</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'calibration' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Live Mirror Calibration Visualizer */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60 flex flex-col items-center">
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
                  Live Tabletop Phone Orientation
                </h3>

                {/* Wireframe Phone Visualizer */}
                <div className="relative w-40 h-40 flex items-center justify-center my-2">
                  <div className="absolute inset-0 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-full" />
                  <div
                    className="relative w-20 h-32 bg-indigo-500/10 border-2 border-indigo-600 dark:border-indigo-400 rounded-xl flex flex-col items-center justify-between p-2 shadow-lg transition-transform duration-75"
                    style={{
                      transform: `rotate(${currentRelativeAngle}deg)`,
                    }}
                  >
                    <div className="w-6 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                      FRONT
                    </span>
                    <div className="w-2.5 h-2.5 border border-indigo-600 dark:border-indigo-400 rounded-full" />
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400 mt-2">
                  <div>Live Yaw: <span className="font-bold text-slate-900 dark:text-slate-100">{latestMotion ? Math.round(latestMotion.alpha) : 0}°</span></div>
                  <div>Relative: <span className="font-bold text-indigo-600 dark:text-indigo-400">{currentRelativeAngle}°</span></div>
                </div>

                <button
                  onClick={onLockBaseline}
                  className="mt-4 w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Compass className="w-4 h-4" />
                  Lock Forward Baseline (0° Zero)
                </button>

                <button
                  onClick={onForceRequestPermissions}
                  className="mt-2 w-full py-2 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  <span>📲 Force Request Phone Permissions</span>
                </button>
              </div>

              {/* Sliders & Thresholds */}
              <div className="space-y-4">
                {/* Driving Mode Selector: Auto-Cruise vs Physical Phone Push */}
                <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                        Driving Control Mode
                      </div>
                      <div className="text-[11px] text-indigo-700 dark:text-indigo-300">
                        Choose whether the car auto-cruises or responds directly to physical forward/back pushes.
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateSettings({
                          ...settings,
                          drivingMode: 'autoCruise',
                          autoCruise: true,
                        })
                      }
                      className={`p-2.5 rounded-lg text-xs font-bold text-left border transition-all flex flex-col gap-1 ${
                        settings.drivingMode !== 'phonePush'
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 font-black">
                        🚗 Auto-Cruise
                      </span>
                      <span className="text-[10px] font-normal opacity-90 leading-tight">
                        Steady smooth speed hands-free. Toddler only needs to steer!
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onUpdateSettings({
                          ...settings,
                          drivingMode: 'phonePush',
                          autoCruise: false,
                        })
                      }
                      className={`p-2.5 rounded-lg text-xs font-bold text-left border transition-all flex flex-col gap-1 ${
                        settings.drivingMode === 'phonePush'
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 font-black">
                        ✋ Physical Phone Push
                      </span>
                      <span className="text-[10px] font-normal opacity-90 leading-tight">
                        Push phone forward to accelerate & zoom; pull back to brake & reverse!
                      </span>
                    </button>
                  </div>

                  {settings.drivingMode !== 'phonePush' && (
                    <div className="pt-2 border-t border-indigo-200/60 dark:border-indigo-800/60">
                      <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        <span>Cruise Speed</span>
                        <span className="font-mono tabular-nums font-bold">
                          {Math.round(settings.cruiseSpeed * 3.6)} km/h ({settings.cruiseSpeed} m/s)
                        </span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="20"
                        step="1"
                        value={settings.cruiseSpeed}
                        onChange={(e) =>
                          onUpdateSettings({ ...settings, cruiseSpeed: Number(e.target.value) })
                        }
                        className="w-full accent-indigo-600"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                        <span>Gentle (18 km/h)</span>
                        <span>Cruising (36 km/h)</span>
                        <span>Fast (72 km/h)</span>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    <span>Deadzone Angle Filter</span>
                    <span className="font-mono tabular-nums">{settings.deadzoneAngle}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    step="1"
                    value={settings.deadzoneAngle}
                    onChange={(e) =>
                      onUpdateSettings({ ...settings, deadzoneAngle: Number(e.target.value) })
                    }
                    className="w-full accent-indigo-600"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Filters toddler hand trembling below this threshold.
                  </p>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    <span>Push Boost & Acceleration Sensitivity</span>
                    <span className="font-mono tabular-nums">{settings.sensitivity.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.5"
                    step="0.1"
                    value={settings.sensitivity}
                    onChange={(e) =>
                      onUpdateSettings({ ...settings, sensitivity: Number(e.target.value) })
                    }
                    className="w-full accent-indigo-600"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    How much temporary speed boost the car gets when slid across the table.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Physical Table Sensor Telemetry
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px] font-mono tabular-nums bg-slate-100 dark:bg-slate-800 p-2.5 rounded-lg text-slate-600 dark:text-slate-300">
                    <div>Tilt X: {latestMotion ? latestMotion.gamma.toFixed(1) : 0}°</div>
                    <div>Tilt Y: {latestMotion ? latestMotion.beta.toFixed(1) : 0}°</div>
                    <div>Push Y: {latestMotion ? latestMotion.accelY.toFixed(1) : 0}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'worlds' && (
            <div className="space-y-6">
              {/* World Selector */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Interactive Worlds Roster
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      All worlds live in <code className="text-indigo-600 dark:text-indigo-400 font-mono">/src/worlds/</code>. Click any world to teleport immediately, or drive into random portals!
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {BUILTIN_WORLDS.map((w) => {
                    const isActive = w.id === currentWorldId;
                    return (
                      <div
                        key={w.id}
                        onClick={() => onSelectWorld(w.id)}
                        className={`cursor-pointer p-3.5 rounded-xl border text-left transition-all ${
                          isActive
                            ? 'bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-500 dark:border-indigo-500 shadow-md ring-2 ring-indigo-400/40'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                            {w.name}
                          </span>
                          {isActive ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-600 text-white rounded-full">
                              ACTIVE WORLD
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                              Teleport →
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                          {w.subtitle}
                        </p>
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px] font-mono">
                          <span className="flex items-center gap-1">
                            <span
                              className="w-2.5 h-2.5 rounded-full inline-block border border-black/20"
                              style={{ backgroundColor: `#${w.groundColor.toString(16).padStart(6, '0')}` }}
                            />
                            Ground
                          </span>
                          <span className="flex items-center gap-1">
                            <span
                              className="w-2.5 h-2.5 rounded-full inline-block border border-black/20"
                              style={{ backgroundColor: `#${w.roadColor.toString(16).padStart(6, '0')}` }}
                            />
                            Road
                          </span>
                          <span className="flex items-center gap-1">
                            <span
                              className="w-2.5 h-2.5 rounded-full inline-block border border-black/20"
                              style={{ backgroundColor: `#${w.skyColor.toString(16).padStart(6, '0')}` }}
                            />
                            Sky
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Portal System Explainer */}
              <div className="p-3.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl">
                <div className="flex items-center gap-2 text-purple-900 dark:text-purple-200 font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>Procedural Stargate Portals Spawned In-Game</span>
                </div>
                <p className="text-xs text-purple-800 dark:text-purple-300 mt-1">
                  Each world randomly spawns glowing vortex stargates (~25% chunk chance) alongside the road. Driving the vehicle directly into any vortex triggers a cosmic whoosh and instantly teleports the toddler to another world!
                </p>
              </div>

              {/* AI World Prompt Generator */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Generate New World with AI
                    </h4>
                  </div>
                  <button
                    onClick={handleCopyWorldAiPrompt}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                  >
                    {copiedWorldPrompt ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Prompt Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy AI World Prompt</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Parents can customize the world theme concept below and copy the prompt to paste into Gemini / Claude to generate a brand new world file in <code className="font-mono text-indigo-600 dark:text-indigo-400">/src/worlds/</code>.
                </p>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Theme / Atmosphere Concept:
                  </label>
                  <input
                    type="text"
                    value={worldThemeIdea}
                    onChange={(e) => setWorldThemeIdea(e.target.value)}
                    placeholder="e.g. Underwater Coral Kingdom or Pirate Cove"
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'modules' && (
            <div className="space-y-6">
              {/* Active Mini-Games Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      Active Mini-Games & Special Game Modes
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Engaging mini-game modes that keep the world fun and thrilling for toddlers.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'paint_trail',
                      name: 'Rainbow Paint Trail',
                      icon: '🎨',
                      desc: 'Wherever the car drives, paints vibrant glowing rainbow ribbon lines across the world!',
                      badge: 'Creative Fun',
                    },
                    {
                      id: 'red_chasers',
                      name: 'Red Chasers (Tag)',
                      icon: '🔴',
                      desc: 'Playful bouncy red creatures chase the car! Bump them or shoot them to POP into sparkling stars!',
                      badge: 'Playful Tag',
                    },
                    {
                      id: 'star_blaster',
                      name: 'Star Blaster (Shooting Car)',
                      icon: '⭐',
                      desc: 'Vehicle automatically shoots bright stars forward that pop obstacles, crystals, and balloons!',
                      badge: 'Action Blaster',
                    },
                  ].map((mg) => {
                    const isEnabled = (settings.enabledMiniGames || []).includes(mg.id);
                    return (
                      <div
                        key={mg.id}
                        onClick={() => {
                          const current = new Set(settings.enabledMiniGames || []);
                          if (current.has(mg.id)) {
                            current.delete(mg.id);
                          } else {
                            current.add(mg.id);
                          }
                          onUpdateSettings({ ...settings, enabledMiniGames: Array.from(current) });
                        }}
                        className={`cursor-pointer p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                          isEnabled
                            ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-400 shadow-sm ring-1 ring-amber-400/50'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-60'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xl">{mg.icon}</span>
                            <span className={`px-2 py-0.5 text-[9px] font-black rounded-full uppercase ${
                              isEnabled ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                            }`}>
                              {isEnabled ? 'ACTIVE' : 'OFF'}
                            </span>
                          </div>
                          <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
                            {mg.name}
                          </div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-snug">
                            {mg.desc}
                          </div>
                        </div>
                        <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                            {mg.badge}
                          </span>
                          <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                            {isEnabled ? 'Enabled ✓' : 'Tap to Enable'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Dynamic World Modules (Auto-Added to All Maps)
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Toggle interactive set-pieces: moving NPC cars, train tracks, forest hurdles, and ramps.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {BUILTIN_MODULES.map((m) => {
                    const isEnabled = (settings.enabledModules || []).includes(m.id);
                    return (
                      <div
                        key={m.id}
                        onClick={() => {
                          const current = new Set(settings.enabledModules || []);
                          if (current.has(m.id)) {
                            current.delete(m.id);
                          } else {
                            current.add(m.id);
                          }
                          onUpdateSettings({ ...settings, enabledModules: Array.from(current) });
                        }}
                        className={`cursor-pointer p-4 rounded-xl border text-left transition-all flex items-start justify-between ${
                          isEnabled
                            ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-60'
                        }`}
                      >
                        <div className="space-y-1 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                              {m.name}
                            </span>
                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 uppercase">
                              {m.category}
                            </span>
                          </div>
                          <div className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                            {m.subtitle}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                            {m.description}
                          </div>
                        </div>

                        <div
                          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                            isEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              isEnabled ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AI Module Generator Prompt */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      AI Dynamic Module Generator
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Copy prompt to generate custom pluggable event modules (e.g. dinosaur stampedes, volcano lava, airport runways).
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const prompt = getAiModulePrompt(moduleIdea);
                      navigator.clipboard.writeText(prompt);
                      setCopiedModulePrompt(true);
                      setTimeout(() => setCopiedModulePrompt(false), 2000);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg border border-slate-300 dark:border-slate-600 transition-colors shadow-sm"
                  >
                    {copiedModulePrompt ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedModulePrompt ? 'Copied Prompt!' : 'Copy AI Module Prompt'}
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Module & Event Idea
                  </label>
                  <input
                    type="text"
                    value={moduleIdea}
                    onChange={(e) => setModuleIdea(e.target.value)}
                    placeholder="e.g. Construction site with dump trucks and bouncy dirt ramps"
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  💡 <strong>How to add new modules:</strong> Save your generated module file in <code className="px-1 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[10px] font-mono">/src/modules/</code> and export it in <code className="px-1 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[10px] font-mono">/src/modules/index.ts</code>. Every map immediately injects it into live procedural terrain!
                </div>
              </div>
            </div>
          )}

          {activeTab === 'vehicles' && (
            <div className="space-y-6">
              {/* Vehicles Roster & Collision Action Rules */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Car className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      All Vehicles: Map Spawn & Collision Actions
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      All vehicles roam the map. Ramming a vehicle starts driving it (default) or destroys it! Parents can also swap the active vehicle directly below.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeVehicles.map((v) => {
                    const hitAction = settings.vehicleHitActions?.[v.id] || 'swap';
                    const isSwap = hitAction === 'swap';

                    return (
                      <div
                        key={v.id}
                        className="p-3.5 rounded-xl border bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-4 h-4 rounded-full shadow-sm flex-shrink-0"
                              style={{ backgroundColor: v.primaryColor }}
                            />
                            <div>
                              <div className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                {v.name}
                                <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded-md uppercase ${
                                  v.type === 'air' ? 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300' : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                                }`}>
                                  {v.type}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                {v.subtitle}
                              </div>
                            </div>
                          </div>

                          {onSelectVehicle && (
                            <button
                              type="button"
                              onClick={() => onSelectVehicle(v.id)}
                              className="px-2.5 py-1 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors active:scale-95"
                            >
                              🏎️ Drive Now
                            </button>
                          )}
                        </div>

                        {/* Collision Action Toggle */}
                        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
                          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                            When Rammed by Player:
                          </span>
                          <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-600 p-0.5 bg-slate-100 dark:bg-slate-900">
                            <button
                              type="button"
                              onClick={() => {
                                const currentActions = { ...(settings.vehicleHitActions || {}) };
                                currentActions[v.id] = 'swap';
                                onUpdateSettings({ ...settings, vehicleHitActions: currentActions });
                              }}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors ${
                                isSwap
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                              }`}
                            >
                              🚗 Drive It (Swap)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const currentActions = { ...(settings.vehicleHitActions || {}) };
                                currentActions[v.id] = 'destroy';
                                onUpdateSettings({ ...settings, vehicleHitActions: currentActions });
                              }}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors ${
                                !isSwap
                                  ? 'bg-rose-600 text-white shadow-sm'
                                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                              }`}
                            >
                              💥 Destroy It
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800 text-[11px] text-indigo-900 dark:text-indigo-200 leading-relaxed">
                  🛡️ <strong>Toddler-Proof Notice:</strong> Direct swiping on the phone screen to change cars is removed so toddlers cannot accidentally change vehicles while holding the phone. Instead, ramming any vehicle on the map automatically swaps into driving it! Parents can also swap vehicles here on demand.
                </div>
              </div>

              {/* Dynamic Vehicle Ingestion & AI Prompt */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <FileCode className="w-4 h-4 text-emerald-600" />
                      Dynamic JS Vehicle Module Loader
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Paste or upload valid Three.js ES Module code to inject custom vehicles.
                    </p>
                  </div>
                  <button
                    onClick={handleCopyAiPrompt}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg border border-slate-300 dark:border-slate-600 transition-colors"
                  >
                    {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedPrompt ? 'Copied Prompt!' : 'Copy AI Vehicle Prompt'}
                  </button>
                </div>

                <textarea
                  value={customJsCode}
                  onChange={(e) => setCustomJsCode(e.target.value)}
                  placeholder="export default { name: 'Fire Engine', baseSpeed: 10, geometry(THREE) { const root = new THREE.Group(); ... return root; } };"
                  className="w-full h-24 p-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />

                <div className="flex items-center justify-between">
                  <button
                    onClick={handleImportModule}
                    disabled={!customJsCode.trim()}
                    className="py-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition-colors"
                  >
                    Inject Vehicle into Game
                  </button>
                  {importStatus && (
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {importStatus}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'audio' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Volume Levels
                  </h3>
                  <div>
                    <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      <span>Phone Synthesizer (Engine & Boing)</span>
                      <span className="font-mono tabular-nums">{Math.round(settings.phoneVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={settings.phoneVolume}
                      onChange={(e) =>
                        onUpdateSettings({ ...settings, phoneVolume: Number(e.target.value) })
                      }
                      className="w-full accent-indigo-600"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      <span>Desktop Audio Volume</span>
                      <span className="font-mono tabular-nums">{Math.round(settings.desktopVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={settings.desktopVolume}
                      onChange={(e) =>
                        onUpdateSettings({ ...settings, desktopVolume: Number(e.target.value) })
                      }
                      className="w-full accent-indigo-600"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Haptic Vibration Feedback
                  </h3>
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Vibrate className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        Phone Collision Haptics
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.hapticEnabled}
                      onChange={(e) =>
                        onUpdateSettings({ ...settings, hapticEnabled: e.target.checked })
                      }
                      className="w-4 h-4 accent-indigo-600"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      <span>Vibration Intensity</span>
                      <span className="font-mono tabular-nums">{settings.hapticIntensity.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="1.5"
                      step="0.1"
                      value={settings.hapticIntensity}
                      onChange={(e) =>
                        onUpdateSettings({ ...settings, hapticIntensity: Number(e.target.value) })
                      }
                      className="w-full accent-indigo-600"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'environment' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Camera Perspective
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => onUpdateSettings({ ...settings, cameraMode: 'overhead' })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      settings.cameraMode === 'overhead'
                        ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-600 text-indigo-900 dark:text-indigo-200'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs">Overhead (1:1 Table)</div>
                    <div className="text-[11px] opacity-75 mt-0.5">
                      Fixed cardinal north, translates with car. Ideal for toddlers.
                    </div>
                  </button>
                  <button
                    onClick={() => onUpdateSettings({ ...settings, cameraMode: 'chase' })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      settings.cameraMode === 'chase'
                        ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-600 text-indigo-900 dark:text-indigo-200'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs">Chase Camera</div>
                    <div className="text-[11px] opacity-75 mt-0.5">
                      Rotates directly behind the vehicle for older kids.
                    </div>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  World Density & Theme
                </h3>
                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    <span>Farm Objects & Trees Density</span>
                    <span className="font-mono tabular-nums">{settings.groundDensity.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={settings.groundDensity}
                    onChange={(e) =>
                      onUpdateSettings({ ...settings, groundDensity: Number(e.target.value) })
                    }
                    className="w-full accent-indigo-600"
                  />
                </div>

                <div className="pt-2">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Sky Theme
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['day', 'sunset', 'night'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => onUpdateSettings({ ...settings, theme: t })}
                        className={`py-1.5 text-xs font-semibold rounded-lg capitalize border transition-colors ${
                          settings.theme === t
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent hover:bg-slate-200'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
