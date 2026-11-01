# Master Technical Specification: Motion-Controlled Procedural Kids Game (3D WebGL / WebRTC)

## 1. Project Overview & Target Audience

* **Target Audience:** Toddlers / Young Children.
* **Design Philosophy:** Zero frustration, infinite exploration, high tactile feedback, visual rewards, bright cartoon aesthetics, toddler-proof locked UI.
* **Core Setup & Physical Interaction:**
  * The mobile smartphone is laid flat on a table surface face-up.
  * **Dual Setup Modes:**
    1. **Physical Toy Mode:** A physical toy car sits directly on top of the phone (or the phone is attached inside/underneath the physical toy).
    2. **Direct Phone Mode (No Toy Needed):** The phone screen displays a prominent, high-contrast, top-down view of the in-game vehicle occupying ~80% of the display. The display mirrors the real-time movement, turning, and actions of the desktop game, reinforcing to the child that the phone itself is the vehicle.
  * The child grabs the phone-and-car assembly to drive across the table, bridging physical play directly into the digital WebGL 3D world on the desktop screen via gyroscope and accelerometer sensors.

---

## 2. System Architecture & Dual-Screen Sync Flow

```
+------------------------------------+                      +------------------------------------+
|            Desktop Host            |                      |         Mobile Controller          |
|      (Parent Control & Engine)     |                      |       (Toddler-Proof UI)           |
|                                    |                      |                                    |
|  1. Display QR Code                | <--- WebRTC/P2P ---> |  1. Tap-to-Start Permission Screen |
|  2. Three.js 3D Engine & Audio Bus |  (PeerJS DataConn)   |  2. Scan QR Code / Auto-Connect    |
|  3. Master Parent Control Panel    |                      |  3. Web Audio Synthesis Engine     |
|  4. Motion Data LERP Smoother      |                      |  4. Real-Time Top-Down Preview     |
|  5. Save/Load Local Storage Config |                      |  5. Horizontal Swipe Gesture Swap  |
+------------------------------------+                      +------------------------------------+
```

### Phase 1: Connection Setup & Sensor Permissions
1. **Controller (Mobile Permission Handshake):**
   * Displays a prominent "TAP TO START DRIVING" screen on launch.
   * User tap triggers explicit browser permission requests for motion/orientation sensors (`DeviceOrientationEvent.requestPermission()`).
   * Activates Fullscreen API, Screen Wake Lock API (`navigator.wakeLock`), and locks screen orientation.
2. **Host (Desktop):**
   * Generates a unique PeerJS / WebRTC session ID.
   * Displays a prominent QR code encoding the mobile controller URL: `https://<domain>/?session=<SESSION_ID>`.
3. **P2P Pairing & Auto-Reconnect:**
   * Mobile connects seamlessly via WebRTC Data Channel.
   * Auto-reconnect handshake restores connection instantly if Wi-Fi drops or page refreshes.

---

## 3. Camera System, Spatial Alignment & Smoothing

To ensure a toddler easily understands the physical-to-digital connection:

* **Translating Non-Rotating Overhead Camera:**
  * **Translation (Position Tracking):** The camera smoothly follows the vehicle as it drives through the infinite procedural world, keeping the vehicle centered on screen so the child clearly sees houses, trees, and sky objects passing by.
  * **Fixed Rotation (Cardinal Alignment):** The camera angle does **NOT** rotate with the vehicle. The camera remains locked to a fixed north/top orientation.
  * **Cognitive 1:1 Mirroring:** When the child twists the phone 45° to the right on the table, the vehicle on the desktop screen rotates 45° to the right relative to the display frame while moving forward across the terrain. "Facing top/forward on the phone" directly mirrors "facing top/forward on the monitor."
* **Desktop Parent Mirror-Mode Calibration Tool:**
  * Live wireframe visualizer on the PC screen showing real-time mobile orientation.
  * Parents align the phone toward the display and press "Lock Forward Baseline" for instant 1:1 angular sync.
* **Network Motion LERP (Linear Interpolation):**
  * The desktop host interpolates sensor packets using LERP to guarantee smooth 60fps rendering even if mobile Wi-Fi packets experience minor micro-jitter.

---

## 4. Mobile Display, Swipe Vehicle Selection & Toddler-Proofing

### A. Minimalist Swipe Vehicle Selection (No Visible Menus)
* **Zero UI Text/Lists:** To keep the phone uncluttered, no dropdowns, text menus, or lists appear on the mobile screen.
* **Horizontal Swipe Gesture:** Swiping left or right anywhere across the phone screen triggers an instant vehicle swap.
  * **Visual Feedback:** The top-down vehicle image on the phone screen plays a smooth slide-out / slide-in animation.
  * **Real-Time Host Sync:** Emits a `SWAP_VEHICLE` event to the desktop host via WebRTC. The 3D vehicle model on the desktop screen instantly switches to match the phone's vehicle without pausing the game.

### B. Toddler-Proofing & Browser Locking Mechanics
To prevent children from accidentally closing the page, switching tabs, or triggering system gestures:
1. **HTML5 Fullscreen API:** Forces the app into full borderless screen mode (`element.requestFullscreen()`) on initial tap.
2. **Screen Wake Lock API:** Prevents the device screen from dimming or turning off during gameplay (`navigator.wakeLock.request('screen')`).
3. **Orientation Lock API:** Forces the screen to lock in landscape or portrait mode (`screen.orientation.lock()`).
4. **Gesture Intervention:**
   * Disables double-tap zoom, pinch zoom, and swipe-to-refresh via CSS (`touch-action: none; user-select: none;`).
   * Overrides system context menus (`window.oncontextmenu = () => false`).
   * Listens for `beforeunload` events to warn against accidental back-button navigation.

---

## 5. Mobile Web Audio Engine & Haptic Vibration Mechanics

### A. Local Phone Web Audio Synthesizer
* **Low-Latency Mobile Audio:** Audio is processed locally on the smartphone using the HTML5 Web Audio API to eliminate network audio delay.
* **Dynamic Audio Synthesis:**
  * **Engine Sound:** Continuous dynamic oscillator pitch shifting in real time based on push/pull velocity.
  * **Jump Effect:** Playful synthesized upward pitch slide ("boing").
  * **Collision / Destruction:** Bright cartoon crash impact noise.

### B. Tactile Haptic Vibration
* **Impact & Crash Vibration:** When an in-game collision or object destruction occurs, the phone invokes the Vibration API (`navigator.vibrate([duration])`).
* **Dynamic Haptic Patterns:**
  * **Minor Impact (Hitting a fence/cloud):** Short sharp pulse (`navigator.vibrate(40)`).
  * **Major Impact / Collapse (Hitting a house):** Double pulse (`navigator.vibrate([60, 30, 80])`).
  * **Jump Landing:** Single thump (`navigator.vibrate(70)`).
  * **Vehicle Flip:** Continuous low rumble (`navigator.vibrate([100, 50, 100, 50])`).

---

## 6. Master Desktop Control Panel (Parent System)

All configuration, calibration, vehicle library management, and fine-tuning are managed exclusively on the **Desktop Host** display via a toggleable parent menu (`Esc` key or hidden UI icon).

### Control Panel Features & Saved Settings
1. **Mirror-Mode Orientation Calibration Tool:**
   * Interactive UI displaying live phone orientation wireframe.
   * "Set Forward Baseline" button to zero out table angles.
2. **Emergency Reset & Teleport Controls:**
   * "Recenter Vehicle to Spawn" button in case the child drives out of bounds or loses physical context.
3. **Camera Mode Options:**
   * **Translating Non-Rotating Camera (Default):** Smoothly tracks position across procedural map; camera orientation stays fixed.
   * **Chase Camera Toggle:** Optional follow mode for older children.
4. **Vehicle Roster Manager:**
   * Enable/disable active vehicles in the mobile swipe rotation.
   * Drag-and-drop or paste custom AI vehicle `.js` modules.
5. **Sensor Calibration & Thresholds:**
   * Live motion gauges, deadzone sliders ($0^\circ - 15^\circ$), and acceleration sensitivity controls.
6. **Audio & Haptic Controls:**
   * Independent volume controls for phone vs. PC audio outputs.
   * Toggle haptic vibration intensity.
7. **World & Environment Customization:**
   * Object density sliders for ground (houses, trees) and sky (clouds, balloons).
   * Day/Night cartoon color themes.
8. **Persistence (`localStorage`):**
   * All configurations save automatically and load on startup.

---

## 7. Physical Controls & Motion Physics Summary

| Action | Physical Gesture (Phone & Toy on Table) | Sensor Input | Game Response |
| ----- | ----- | ----- | ----- |
| **Steering** | Twisting phone flat on table ($Z$-axis yaw rotation) | `orientation.alpha` | 1:1 real-time heading rotation of car on desktop and phone display |
| **Speed Boost** | Sliding / pushing phone forward across table | `acceleration.y` | Vehicle accelerates forward along ground |
| **Slowdown** | Sliding / pulling phone backward across table | `acceleration.y` | Vehicle decelerates / reverses |
| **Jump** | Quick vertical lift / tap upward off table surface | `acceleration.z` | Vehicle jumps into the air with zero forward speed loss |
| **Vehicle Swap** | Swiping horizontal finger gesture on phone screen | Touch Swipe Event | Instantly switches active vehicle model (desktop & phone sync) |
| **Impact Haptics** | Colliding with in-game houses or trees | Trigger payload | Mobile phone vibrates with crash intensity pattern |

---

## 8. Advanced Vehicle Generator UI & High-Complexity AI Prompt

### Embedded AI System Prompt

```text
You are an expert Three.js 3D vehicle and object generator for a modular toddler driving game. 
Generate a complete, fully valid JavaScript ES Module file according to the specifications below.

RULES:
1. Return strictly valid JavaScript ES module code starting with `export default {`. Do not wrap code in markdown tags if saving directly to file.
2. High Complexity Support: Support detailed multi-part structures when requested (e.g., trains with multiple connected cabins/cars, multi-axle heavy haulers, articulated construction machinery, multi-propeller aircraft, or complex mechanical assemblies). Group sub-assemblies cleanly into hierarchical `THREE.Group()` nodes.
3. Baseline Parameters:
   - `baseSpeed`: Set baseline speed (Default: 10 for cars, 6 for heavy trains/excavators, 16 for jets).
   - `type`: Must be either "ground" or "air".
4. Geometry Construction: Build the visual representation strictly inside `geometry(THREE)` using rich primitive compositions (BoxGeometry, CylinderGeometry, SphereGeometry, ConeGeometry, TorusGeometry, ExtrudeGeometry, etc.).
5. Visual Polish: Apply bright, vibrant, high-contrast, toddler-friendly colors using `THREE.MeshStandardMaterial` with varied roughness, metalness, and transparencies for high visual quality.
6. Pivot & Alignment: Center the main group at ground level (Y = 0) facing forward along the -Z axis.
7. Return a unified root `THREE.Group()` object containing all assembled sub-components.

USER REQUEST:
[INSERT USER TEXT DESCRIPTION HERE, e.g., "A colorful cartoon steam train with a detailed locomotive boiler, chimney, cab, and three distinct passenger cars attached behind it with wheels"]
```

---

## 9. AI Developer Execution Checklist (Step-by-Step Implementation Guide)

*Instructions for AI/Developers:* Complete these steps **sequentially in order**. Check off each item `[x]` as it is completed, verified, and tested.

### Phase 1: WebRTC Communication & Sensor Permission Handshake
* [ ] **1.1 Mobile Tap-to-Start Permission Screen:** Build explicit user-tap landing screen on mobile requesting `DeviceOrientationEvent.requestPermission()` and audio context activation.
* [ ] **1.2 Desktop Host QR Signaling:** Build WebRTC host setup (PeerJS) generating a session ID and rendering a scanning QR code.
* [ ] **1.3 Mobile Connection & Auto-Reconnect Pairing:** Implement mobile client script auto-pairing with desktop host and auto-reconnecting on Wi-Fi drops.
* [ ] **1.4 High-Frequency Data Stream & Motion LERP:** Establish 60Hz data channel for motion data with desktop-side Linear Interpolation (LERP) smoothing.

### Phase 2: Mobile UI, Lockscreen & Gestures
* [ ] **2.1 Toddler-Proof Display Lock:** Activate Fullscreen API, Screen Wake Lock API (`navigator.wakeLock`), and Orientation Lock API on mobile startup tap.
* [ ] **2.2 Input Interception:** Disable context menus (`oncontextmenu`), double-tap/pinch zoom, and refresh pulls via CSS (`touch-action: none; user-select: none;`).
* [ ] **2.3 Top-Down Vehicle Render:** Implement ~80% screen top-down real-time preview display of the active vehicle on the mobile device screen.
* [ ] **2.4 Horizontal Swipe Switcher:** Add swipe left/right gesture detection to trigger real-time vehicle selection without showing text menus.

### Phase 3: Motion Physics & Control Engine
* [ ] **3.1 Tabletop Z-Axis Alignment (Steering):** Map `orientation.alpha` ($Z$-axis yaw) to 1:1 real-time vehicle heading rotation relative to calibrated zero baseline.
* [ ] **3.2 Longitudinal Push/Pull Acceleration:** Map forward/backward sliding motion (`acceleration.y`) to vehicle acceleration and deceleration.
* [ ] **3.3 Momentum-Preserving Jump System:** Implement vertical lift detection (`acceleration.z` impulse) that triggers a jump when grounded without losing any forward speed or momentum.
* [ ] **3.4 Side Flip & Recovery Logic:** Implement flipping condition when tilt exceeds critical threshold ($>80^\circ$) to stop forward movement until the phone is righted.

### Phase 4: Camera System & Parent Control Panel
* [ ] **4.1 Translating Non-Rotating Overhead Camera:** Configure camera to follow the car's position across the infinite terrain while maintaining fixed cardinal screen rotation.
* [ ] **4.2 Parent Mirror-Mode Calibration UI (Desktop):** Build desktop overlay containing live phone wireframe alignment, deadzone adjustment sliders, and sensitivity controls.
* [ ] **4.3 Emergency Reset & Teleport Tool:** Add instant car teleport button to return vehicle to origin point if lost or disconnected.
* [ ] **4.4 Parent Settings Persistence:** Connect all parent menu options to `localStorage` for dynamic saving and instant reloading.

### Phase 5: Mobile Audio Synthesis, Haptics & Infinite World
* [ ] **5.1 Mobile Web Audio Synthesizer:** Implement local Web Audio API synthesizer on phone for low-latency engine rumbles, jump "boing" sounds, and impact crashes.
* [ ] **5.2 Dynamic Impact Haptics:** Integrate HTML5 Vibration API (`navigator.vibrate`) with custom pulse patterns calibrated to collision severity.
* [ ] **5.3 Infinite Procedural Chunk Generator:** Build chunk loader generating infinite terrain populated with toddler-friendly ground objects (houses, trees) and sky objects (clouds, balloons).
* [ ] **5.4 Non-Blocking Collisions:** Implement destruction FX (confetti, collapse animation, sound/vibration triggers) on impact while keeping the vehicle moving forward smoothly.

### Phase 6: Dynamic Vehicle Loader & Prompt Blueprint
* [ ] **6.1 Standard ES Module Vehicle Library:** Create baseline modular vehicles (default car, airplane, excavator, multi-cabin train).
* [ ] **6.2 Dynamic Vehicle Script Ingestion:** Implement Dynamic Blob URL Loader (`URL.createObjectURL`) to accept local `.js` files or pasted code strings into active game sessions.
* [ ] **6.3 AI Vehicle Prompt Exporter:** Add "Copy AI Prompt" generator in desktop parent settings formatted for complex multi-part vehicle generation.