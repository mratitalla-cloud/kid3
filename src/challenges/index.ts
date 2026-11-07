/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ChallengeMission {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  bubbleColor: string;
  targetWorldId: string;
  vehicleId: string;
  bannerText: string;
  aiPromptIdea: string;
}

export const BUILTIN_CHALLENGES: ChallengeMission[] = [
  {
    id: 'police_chase',
    title: 'High-Speed Police Chase',
    subtitle: 'Code 3 Siren Pursuit through Neon City',
    description: 'A glowing siren beacon spawns on the road. Driving into it activates the police cruiser with flashing red/blue lights, siren wails, and spawns runaway speeders to chase down!',
    badge: '🚨',
    bubbleColor: '#3b82f6',
    targetWorldId: 'cosmic_sky_city',
    vehicleId: 'police_cruiser',
    bannerText: 'POLICE PURSUIT ACTIVATED! 🚨🚓',
    aiPromptIdea: 'High-speed police chase challenge with siren sounds, roadblock barricades, and runaway getaway trucks to catch.',
  },
  {
    id: 'dino_safari',
    title: 'Prehistoric Dinosaur Stampede',
    subtitle: 'Escape stomping triceratops in Jurassic Valley',
    description: 'A glowing amber dinosaur egg beacon spawns on the road. Driving into it warps to the Dino Safari, roars, and puts your toddler in the Monster Truck to blast through stampeding dino herds!',
    badge: '🦖',
    bubbleColor: '#eab308',
    targetWorldId: 'dino_safari',
    vehicleId: 'monster_truck',
    bannerText: 'JURASSIC SAFARI RESCUE! 🦖🌋',
    aiPromptIdea: 'Prehistoric dinosaur safari where you race alongside giant animated brachiosaurus and jump over ancient lava vents.',
  },
  {
    id: 'fire_rescue',
    title: 'Fire Engine Emergency Call',
    subtitle: 'Rush to the scene with blazing sirens',
    description: 'A glowing fire beacon on the road transforms the vehicle into the big red Fire Engine, ringing bells and shooting star jets to save the day!',
    badge: '🚒',
    bubbleColor: '#ef4444',
    targetWorldId: 'sunny_countryside',
    vehicleId: 'fire_truck',
    bannerText: 'FIRE RESCUE MISSION! 🚒🔥',
    aiPromptIdea: 'Firefighter emergency mission with burning barn obstacles, water spray cannons, and ringing sirens.',
  },
  {
    id: 'sugar_dash',
    title: 'Candy Kingdom Sugar Rush',
    subtitle: 'Rainbow speed frenzy in Candyland',
    description: 'A glowing giant lollipop beacon warps the world to Candyland, starts a rainbow coin shower, and grants continuous turbo rocket boost!',
    badge: '🍬',
    bubbleColor: '#ec4899',
    targetWorldId: 'candyland_toyland',
    vehicleId: 'ice_cream_van',
    bannerText: 'SUGAR DASH FREEDOM! 🍬🍭',
    aiPromptIdea: 'Candy rush speedrun through gumdrop hills with bouncing peppermint wheels and chocolate rivers.',
  },
  {
    id: 'sky_airshow',
    title: 'Sky Acrobatics Airshow',
    subtitle: 'Stunt loop-de-loops in the clouds',
    description: 'A glowing golden wing beacon launches the toddler straight into the biplane high above the mountains, streaming aerobatic white smoke puffs and flying through flaming rings!',
    badge: '✈️',
    bubbleColor: '#0ea5e9',
    targetWorldId: 'sunny_countryside',
    vehicleId: 'biplane',
    bannerText: 'AIRSHOW STUNT FLIGHT! ✈️💨',
    aiPromptIdea: 'Acrobatic flight airshow through cloud tunnels and golden rings with cheering crowd sound effects.',
  },
  {
    id: 'steam_express',
    title: 'Runaway Steam Express Train',
    subtitle: 'Chug down the mountain railway',
    description: 'A glowing golden train whistle beacon puts the toddler at the helm of the massive Steam Train, blowing steam whistles and cruising through stone mountain tunnels!',
    badge: '🚂',
    bubbleColor: '#8b5cf6',
    targetWorldId: 'sunny_countryside',
    vehicleId: 'steam_train',
    bannerText: 'TRAIN MASTER RUNAWAY! 🚂💨',
    aiPromptIdea: 'Scenic train conductor challenge down mountain railways with switch tracks, crossing gates, and whistle chimes.',
  },
];

export function getChallengeById(id: string): ChallengeMission | undefined {
  return BUILTIN_CHALLENGES.find((c) => c.id === id);
}

export function getAiChallengePrompt(customIdea: string): string {
  return `Act as a senior Three.js gameplay engineer. Generate an interactive modular Challenge Mission for the "Toddler Motion Drive" game.

Challenge Scenario / Theme: "${customIdea}"

Create a self-contained mission module conforming to:
\`\`\`typescript
export interface ChallengeEvent {
  id: string;
  title: string;
  themeWorld: string;
  vehicle: string;
  beaconColor: number; // hex
  onActivate: (gameApi: any) => void;
}
\`\`\`

Requirements:
1. Bright, vibrant, playful cartoon styling for toddlers (2-5 years old).
2. Spawns a glowing, pulsing 3D beacon/orb on the road.
3. Ramming the beacon triggers sound fanfare, floating 3D celebration text, swaps vehicle or world, and spawns interactive targets.
4. Return ONLY clean, production-ready TypeScript code.`;
}
