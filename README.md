<div align="center">

# Coast Horizon
### Take the scenic route. A peaceful retro-arcade coastal driving game, solo or with a friend.

![Status](https://img.shields.io/badge/status-active-22C55E?style=flat-square)
![Graphics](https://img.shields.io/badge/graphics-Three.js%20WebGL-22D3EE?style=flat-square)
![Audio](https://img.shields.io/badge/audio-Web%20Audio%20API-A855F7?style=flat-square)
![Multiplayer](https://img.shields.io/badge/multiplayer-WebSocket%202P%20Rooms-6366F1?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-F59E0B?style=flat-square)

</div>

---

## Overview

**Coast Horizon** is a high-performance, lightweight 3D web driving experience engineered entirely with web standards. Rather than relying on massive game engines or multi-megabyte 3D asset downloads, Coast Horizon builds its entire visual and sonic world procedurally directly inside the browser.

From an extruded parametric Bézier hatchback chassis and a continuous 10-kilometer Catmull-Rom coastal spline highway to an oscillator-synthesized combustion engine that revs dynamically through 6 gear shifts using the Web Audio API, every subsystem is engineered for zero load time, high framerates (60+ FPS), and seamless two-player room matchmaking.

---

## Features

- **Procedural 3D Hatchback** — the entire 3D car geometry, cabin taper, wheel arches, dual axles, rims, and headlights are generated mathematically via Three.js Bézier extrusions with zero external 3D file overhead (under 12 KB).
- **10 km Spline Highway Loop** — a 10,000-meter closed circuit defined by 33 knot points, re-parameterized by arc-length integration so road textures never stretch across sharp bends or elevation grades.
- **Synthesized Web Audio Engine** — zero audio files (.mp3/.wav); engine combustion pulses and exhaust bodies are generated live using custom harmonic Fourier waves (`PeriodicWave` + `BiquadFilter`) responsive to throttle, speed, and gear shifts.
- **Real-Time 2-Player Multiplayer** — instant private room creation (`?room=<id>`), 20 Hz WebSocket packet synchronization, and 100 ms client-side entity interpolation (`wrapAngle` slerp) for smooth rival vehicle rendering.
- **Dual-Pass Rear-View Mirror** — live secondary Three.js camera rendering backward at 12 FPS directly to an off-screen `WebGLRenderTarget`, composited with a rounded pill shader mask.
- **Retro Analog HUD & Gauges** — responsive SVG speedometer with sweep gauge, real-time damage condition meter, fuel consumption meter, and lap checkpoint system.
- **Santa Monica Open-World Mode** — alternative free-roam urban coastal map with real street layouts and oceanfront avenues.
- **Static Geometry Batching** — automated spatial mesh merging (`batchStaticGroup`) reducing scene draw calls to ensure silky smooth performance across desktop and mobile devices.

---

## Controls

| Action | Keyboard | Touch Controls |
|---|---|---|
| **Accelerate** | `W` or `↑` | ▲ Button (Right) |
| **Steer Left** | `A` or `←` | ◀ Button (Left) |
| **Steer Right** | `D` or `→` | ▶ Button (Left) |
| **Brake / Reverse** | `Space` or `↓` | ▼ Button (Right) |
| **Toggle Rear-View Mirror** | `M` | Mirror Button (Top HUD) |
| **Toggle Audio** | Sound Button | Sound Button (Top HUD) |

---

## Tech Stack

| Technology | Role |
|---|---|
| Three.js (WebGL) | Scene graph, camera management, ACES Filmic tone mapping & lighting |
| Web Audio API | Procedural combustion engine & exhaust harmonic synthesis |
| WebSockets (`ws`) | Low-latency 20 Hz peer telemetry and state synchronization |
| GLSL Shaders | Pastel sky gradients, distance ground detail blending & water surf shaders |
| Vanilla JavaScript (ES Modules) | Core arcade physics, handling equations, and spline mathematics |
| HTML5 / SVG / CSS3 | Hardware-accelerated race HUD, dialogs, and SVG gauges |
| Node.js | Local development server & WebSocket multiplayer room broker |

---

## Architecture

- **Arc-Length Parameterized Spline:** Highway generation integrates numerical arc lengths across 33 control points (`route.js`), calculating position, tangency, heading angle, and curvature dynamically while eliminating knot-clustering speed artifacts.
- **Procedural Mesh Synthesis:** The car body (`imported-car.js`) is constructed from parametric 2D shapes extruded with bevel segments, custom normal vertex recalculation, and smooth door normal flattening to prevent cap triangle artifacts.
- **Harmonic Voice Synthesizer:** `engine-audio.js` creates a dual-oscillator voice consisting of an exhaust periodic wave with 12 overtone coefficients and a low-frequency body oscillator routed through a dynamic lowpass filter. Pitch, volume, and filter cutoff shift in real time based on throttle and simulated RPM.
- **Multiplayer Entity Interpolation:** `party.js` transmits car telemetry (`[x, z, h, pitch, roll, speed]`) at 50 ms intervals. Peers maintain a sliding timestamp buffer and interpolate poses at `t - 100ms`, solving angular rollover via `Math.atan2(Math.sin(Δθ), Math.cos(Δθ))`.
- **Dual-Pass Mirror Compositing:** Rather than instantiating a second WebGL context, `coast-views.js` targets an off-screen render buffer with auto-clearing disabled, then renders an orthographic screen quad with aspect-corrected circular discard.

---

## Challenges Solved

**1. High-fidelity 3D vehicle without large asset payloads**
Loading traditional 3D models (.gltf / .fbx) adds heavy download latencies and requires texture unwrapping. Coast Horizon constructs the entire vehicle chassis, cabin, and suspension in pure code using Bézier extrusions and custom normal smoothing, delivering an authentic automotive silhouette with zero network latency.

**2. Realistic engine sound without audio files**
Pre-recorded engine sound loops often sound repetitive and stutter during gear transitions. Coast Horizon implements live procedural synthesis via the Web Audio API, adjusting harmonic frequencies, filter cutoffs, and intake volumes continuously against virtual transmission gear shifts.

**3. Texture distortion along complex spline curves**
Standard spline interpolation causes road markings and asphalt textures to bunch up on sharp bends and stretch on straights. An arc-length sampling table with binary search normalizes distance along the 10 km track, ensuring uniform texture mapping and constant vehicle progression speed.

**4. Smooth multiplayer motion over variable latency**
Directly applying network updates causes rival cars to stutter or snap abruptly. Coast Horizon uses a 100 ms historical sample buffer with spherical angular interpolation to smoothly render peer movements across turns, jumps, and collisions.

---

## Getting Started

### Prerequisites
- Node.js (v18 or higher)

### Installation & Run

1. Clone the repository:
   ```bash
   git clone https://github.com/Pro-Prince/Coast-Horizon.git
   cd Coast-Horizon
   ```

2. Start the game server:
   ```bash
   node server.mjs
   ```

3. Open your browser:
   * **Coast Circuit:** `http://localhost:3000/`
   * **Santa Monica Free Drive:** `http://localhost:3000/santa-monica/`

---

## License

This project is licensed under the MIT License.
