# Motion-Controlled Procedural Kids Game (3D WebGL & WebRTC)

A zero-frustration, motion-controlled 3D procedural driving experience designed for toddlers and parents. Children lay a smartphone flat on a table (either carrying a physical toy car or driving the phone itself in direct phone mode) and slide, steer, and lift the phone to control a cartoon vehicle across an infinite Sunny Countryside world rendered on a desktop display in real time via high-speed WebRTC peer-to-peer motion streaming.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and design decisions have been confirmed and incorporated directly from user requirements:

- **Confirmed Theme & Biome**: Sunny Countryside with friendly red barns, windmills, wooden split-rail fences, hay bales, apple orchards, animated cows/sheep, and low-altitude hot air balloons with puffy clouds.
- **Confirmed Connectivity**: Pure PeerJS WebRTC live mobile connection. The desktop generates a unique session ID with an on-screen QR code and direct pairing link for zero-latency peer-to-peer data channel streaming.
- **Confirmed Vehicle Roster**: Balanced 4-vehicle fleet available in the mobile swipe selector:
  1. *Sunny Roadster (Toy Convertible)*: Bright cartoon red convertible with spinning wheels and dual chrome exhausts.
  2. *Choo-Choo Express (Steam Train)*: Articulated steam engine with a smoking chimney, tender, and 2 linked passenger cabins.
  3. *Barnstormer (Biplane)*: Whimsical dual-wing flyer with a spinning front propeller and tail fin.
  4. *Rusty Digger (Excavator / Digger)*: Sturdy yellow backhoe digger with articulated boom, bucket, and rubber caterpillar treads.

---

## 1. Overview & Core Concept

- **What It Does**: Bridges tactile tabletop physical play with an immersive digital WebGL 3D world on the parent's desktop display. Twisting the phone turns the vehicle 1:1; sliding it accelerates/decelerates; tapping or lifting upward triggers a joyful jump; collisions trigger haptic buzzes and confetti bursts without halting momentum.
- **Target Audience**: Toddlers and young children (ages 2–6) and parents. The mobile UI is completely toddler-proofed (no text menus, gesture locks, fullscreen, wake-lock), while parents retain full calibration and safety controls via an intuitive desktop control drawer (`Esc` key).
- **Core Play Modes**:
  1. *Physical Toy Mode*: A toy vehicle is placed atop the phone.
  2. *Direct Phone Mode*: The phone screen displays a high-contrast top-down view of the active vehicle (~80% screen coverage) that rotates and vibrates in sync with the desktop.

---

## 2. User Experience & Visual Design

### Key User Flows

```
[Desktop Launch]
       │
       ▼
┌───────────────────────────────────────────────┐
│ Desktop Host: 3D Scene + QR Code Pairing Card │
│ (Awaits WebRTC Data Channel connection)       │
└──────────────────────┬────────────────────────┘
                       │ Parent scans QR with phone
                       ▼
┌───────────────────────────────────────────────┐
│ Mobile Controller: "TAP TO START DRIVING"     │
│ (Triggers DeviceOrientation + AudioContext +  │
│  Fullscreen + WakeLock + Orientation Lock)    │
└──────────────────────┬────────────────────────┘
                       │ Instant WebRTC P2P Data Channel
                       ▼
┌───────────────────────────────────────────────┐
│ Dual-Screen Live Play:                        │
│ • Phone: Top-Down vehicle view + audio/haptics│
│ • Desktop: Translating overhead camera in 3D  │
│ • Toddler swiping left/right swaps vehicles   │
│ • Parent presses [Esc] for calibration drawer │
└───────────────────────────────────────────────┘
```

### Visual Identity & Theme
- **Theme Palette (Sunny Countryside)**:
  - Sky & Atmosphere: Vibrant baby blue sky (`#60A5FA` / `#93C5FD`) blending to soft horizon fog (`#E0F2FE`).
  - Rolling Meadows: Bright grassy greens (`#4ADE80`, `#22C55E`, `#15803D`) with dirt paths (`#D97706` / `#FBBF24`).
  - Architecture: Cherry red barns (`#DC2626`) with crisp white trim, rustic wood fences (`#78350F`), golden haystacks (`#F59E0B`).
- **Typography & Clean UI**:
  - Display Font: `Plus Jakarta Sans` (Rounded, friendly, high legibility).
  - Data / Angles: Tabular monospace figures (`tabular-nums font-mono`) in the parent calibration drawer.
  - Zero-Pill & Anti-Slop Discipline: Clean typographic status indicators, no pulsating dots, single-line actions, collapsible parent drawer pinned to the bottom.

---

## 3. Key Product Decisions & Trade-Offs

- **Translating Non-Rotating Overhead Camera (Spatial 1:1 Mirroring)**:
  - *Chosen Approach*: The 3D camera translates with the vehicle (keeping it centered), but its yaw angle remains locked to fixed screen-up.
  - *Why*: Toddlers orient physical space relative to their body and the table. When twisting the phone $45^\circ$ right, the car turns $45^\circ$ right relative to the desktop frame, avoiding disorientation caused by rotating chase cameras.
- **Local Web Audio Synthesis on Phone**:
  - *Chosen Approach*: Low-latency Web Audio API oscillators generated directly on the phone rather than streaming audio packets over WebRTC.
  - *Why*: Eliminates network lag and jitter, giving instantaneous audio-tactile feedback when pushing the vehicle or bumping into obstacles.
- **Non-Blocking Toddler-Proof Collisions**:
  - *Chosen Approach*: Bumping into trees, fences, or barns triggers visual squashing, confetti bursts, sound effects, and haptic vibration, but does not stop or stall the vehicle.
  - *Why*: Toddlers get frustrated by hard stops, wall-clipping, and "game over" states. Play is continuous and rewarding.
- **PeerJS Cloud Signaling with Fallback Auto-Reconnect**:
  - *Chosen Approach*: Lightweight WebRTC DataChannel via PeerJS public STUN/signaling servers with exponential backoff auto-reconnect.
  - *Why*: Zero backend server configuration needed; direct peer-to-peer data transmission guarantees 60Hz update rates.

---

## 4. Technical Architecture & System Data Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                          DESKTOP HOST                                  │
│                                                                        │
│  ┌────────────────────────┐      ┌──────────────────────────────────┐  │
│  │ Three.js Engine        │      │ Procedural World Manager         │  │
│  │ • PCFSoftShadowMap     │◄────►│ • Infinite 60m x 60m chunks      │  │
│  │ • RoomEnvironment PBR  │      │ • Barns, fences, trees, cows     │  │
│  │ • Non-rotating Cam     │      │ • Confetti particle pool         │  │
│  └───────────▲────────────┘      └──────────────────────────────────┘  │
│              │                                                         │
│  ┌───────────┴────────────┐      ┌──────────────────────────────────┐  │
│  │ Motion LERP Smoother   │      │ Parent Control Panel (Esc)       │  │
│  │ • Exponential damping  │◄────►│ • Mirror wireframe & zero angle  │  │
│  │ • Jump & flip detector │      │ • Deadzones & sensitivity        │  │
│  │ • 60 FPS physics tick  │      │ • Dynamic JS vehicle importer    │  │
│  └───────────▲────────────┘      └──────────────────────────────────┘  │
│              │                                                         │
│              │ WebRTC Data Channel (60 Hz packets)                     │
└──────────────┼─────────────────────────────────────────────────────────┘
               │
               ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        MOBILE CONTROLLER                               │
│                                                                        │
│  ┌────────────────────────┐      ┌──────────────────────────────────┐  │
│  │ Toddler-Proof Lockbox  │      │ Web Audio & Haptics Engine       │  │
│  │ • Fullscreen & WakeLock│      │ • Dynamic pitch oscillator       │  │
│  │ • Touch-action: none   │      │ • Jump boing & crash noise       │  │
│  │ • Contextmenu disabled │      │ • Navigator.vibrate patterns     │  │
│  └────────────────────────┘      └──────────────────────────────────┘  │
│                                                                        │
│  ┌────────────────────────┐      ┌──────────────────────────────────┐  │
│  │ Sensor Streamer        │      │ Top-Down Vehicle Preview         │  │
│  │ • DeviceOrientation    │      │ • 80% screen SVG/Canvas render   │  │
│  │ • DeviceMotion accel   │      │ • Horizontal swipe gesture swap  │  │
│  └────────────────────────┘      └──────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Phased Implementation Roadmap & Verification Plan

### Phase 1: Dependencies & WebRTC Peer-to-Peer Pipeline
- Install `three`, `@types/three`, `peerjs`, and `qrcode`.
- Build `webrtcService.ts` to manage PeerJS host/client lifecycles, session ID generation, and automatic data channel reconnection.
- Build QR code overlay on desktop displaying mobile connection URL (`?session=<ID>`).
- Build Mobile Tap-to-Start onboarding screen requesting `DeviceOrientationEvent.requestPermission()` and resuming Web Audio `AudioContext`.

### Phase 2: Mobile Toddler-Proofing, Display & Gestures
- Implement browser locks: `requestFullscreen`, `navigator.wakeLock.request('screen')`, `screen.orientation.lock('portrait')` (with fallback).
- CSS lock: `touch-action: none; user-select: none;` and override `oncontextmenu` and `beforeunload`.
- Build real-time 2D/top-down vector vehicle preview filling ~80% of the mobile screen.
- Implement horizontal swipe detection (`onTouchStart`, `onTouchMove`, `onTouchEnd`) to trigger vehicle swap animation and broadcast `SWAP_VEHICLE` over WebRTC.

### Phase 3: Motion Engine, Tabletop Calibration & Physics
- Tabletop Yaw Steering: Map `orientation.alpha` to 1:1 car heading relative to calibrated baseline yaw.
- Longitudinal Acceleration: Map `acceleration.y` forward/backward sliding to velocity and reverse gear.
- Jump Impulse: Detect vertical lift impulse via `acceleration.z` without losing horizontal momentum.
- Tilt/Flip Detection: Invert/stop forward speed if phone tilt exceeds $80^\circ$ until placed flat again.
- Desktop Motion LERP: Interpolate incoming sensor packets at 60Hz using exponential smoothing.

### Phase 4: Procedural Sunny Countryside & Three.js Engine
- Three.js WebGL renderer setup with `ACESFilmicToneMapping`, `SRGBColorSpace`, `RoomEnvironment` reflections, warm directional key light with soft shadows, and horizon fog.
- Translating Non-Rotating Overhead Camera: Smoothly tracks the vehicle's position across $(X, Z)$ while keeping camera yaw locked to cardinal north.
- Procedural Infinite Chunks: Dynamic $3 \times 3$ chunk grid around the vehicle spawning rolling hills, farm barns, windmills, wooden fences, hay bales, apple trees, grazing animals, and floating clouds.
- Non-blocking dynamic collisions: On vehicle impact, trigger bounce deformation, confetti particle spray, and push the trigger packet to the phone for vibration.

### Phase 5: Local Phone Web Audio Synthesizer & Haptic Vibration
- Web Audio Synthesizer on phone:
  - Dynamic engine sound: Dual-oscillator (sawtooth + triangle) pitch-shifted continuously with vehicle speed.
  - Jump "boing": Frequency sweep oscillator.
  - Crash effect: Noise buffer burst with resonant filter.
- Dynamic Haptics (`navigator.vibrate`):
  - Minor impact (fence/hay): `[40]`
  - Major impact (barn): `[60, 30, 80]`
  - Landing: `[70]`
  - Vehicle flip: `[100, 50, 100, 50]`

### Phase 6: Vehicle Fleet, Dynamic ES Module Ingestion & Parent Drawer
- Implement 4 built-in procedural vehicles using multi-part `THREE.Group` assemblies:
  1. *Toy Convertible* (chassis, windshield, seats, steering wheel, 4 wheels with hubcaps, headlights).
  2. *Steam Train* (engine boiler, smoke stack, cab, coal tender, 2 attached passenger cars with wheels).
  3. *Biplane* (fuselage, dual wings with struts, spinning propeller, landing wheels, tail rudder).
  4. *Excavator / Digger* (cab, caterpillar treads, articulated 2-stage boom, digging bucket).
- Dynamic Vehicle Loader: Accept custom JS ES module strings or `.js` file uploads via `URL.createObjectURL(new Blob([...]))`.
- AI Prompt Exporter: One-click "Copy AI Vehicle Prompt" button pre-configured with the Three.js vehicle contract.
- Desktop Parent Control Drawer: Toggleable via `Esc` key or hidden corner badge; includes live phone orientation wireframe visualizer, "Set Forward Baseline" calibration button, emergency teleport to spawn, sensitivity sliders, sound/haptic toggles, and `localStorage` persistence.

---

## 6. Verification Checklist
- [ ] Mobile onboarding handles sensor permissions smoothly on iOS (Permission API) and Android.
- [ ] WebRTC peer pairing establishes connection rapidly via QR code scan.
- [ ] Phone screen displays high-contrast top-down vehicle view and supports smooth horizontal swipe swapping.
- [ ] Desktop Three.js scene maintains steady 60fps with infinite procedural chunk recycling.
- [ ] Camera follows position smoothly without rotating with the car.
- [ ] Phone Web Audio synthesizer shifts pitch with motion; haptics pulse on collision.
- [ ] Parent control drawer opens with `Esc` and calibrates forward heading baseline accurately.
- [ ] Compile and build pass cleanly with zero TypeScript errors.
