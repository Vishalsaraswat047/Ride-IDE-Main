---
name: three-js
description: Three.js skill — WebGL 3D scenes: camera, lighting, materials, models, animation, performance, mobile fallback. Don't put heavy 3D everywhere.
---

# Three.js

WebGL 3D. Use for: 3D heroes, product visualizations, data visualization, immersive backgrounds. RULE: never force 3D onto content sites — hero → 3D scene, features → subtle motion, pricing → minimal, footer → no WebGL.

## Core Scene Setup

```js
import * as THREE from "three";
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
camera.position.set(0, 0, 10);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(w, h);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
// render loop
renderer.setAnimationLoop(animate);
```

## Essentials

- **Geometry/Material/Mesh**: `BoxGeometry`, `SphereGeometry`, `TorusKnotGeometry`, `MeshStandardMaterial` (PBR), `MeshBasicMaterial` (cheap), `MeshPhysicalMaterial` (premium, pricier).
- **Lighting**: `AmbientLight` (base), `DirectionalLight` (key), `PointLight`/`SpotLight` (accent). Keep lights ≤ 3–4.
- **Environment**: `THREE.RoomEnvironment` / `PMREMGenerator` for realistic reflections.
- **Textures**: `TextureLoader` + `SRGBColorSpace`; all textures power-of-two for mipmaps.
- **Models**: GLTF via `GLTFLoader`; convert with gltf-transform (KHRONOS ktx2, draco) — always compressed.

## Animation

```js
renderer.setAnimationLoop((t) => {
  mesh.rotation.y = t * 0.001;
  camera.position.x = Math.sin(t * 0.0005) * 3; // subtle orbit
});
```

## Performance (non-negotiable)

1. `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))` — never 3×.
2. Reuse geometries/materials; dispose with `geometry.dispose()` on teardown.
3. `renderer.info` to monitor draw calls/triangles; target < 100 draw calls, < 1M triangles on mobile.
4. Lazy-mount WebGL (only when visible) + destroy/dispose on unmount.
5. Cap DPR on mobile; fall back to static image/Canvas2D for weak GPUs.
6. `powerPreference: "high-performance"` but still watch battery.
7. Add fog/near-far to clip distance; use `InstancedMesh` for repeated objects.

## Mobile Fallback (mandatory)

```js
if (isMobile || isLowPower || prefersReducedMotion) {
  // render static pre-baked image or skip 3D entirely
}
```
Detect via `navigator.hardwareConcurrency`, `devicePixelRatio`, screen width, and `prefers-reduced-motion`.

## Rules

1. Camera: subtle drift > dramatic sweeps; never shake.
2. Lighting tells the story — bad lighting = "AI-generated 3D" look.
3. Interactive scenes need clear affordance (cursor, hints).
4. Always pair 3D with an HTML fallback layer (gradient/mesh image) that looks intentional.

## Do / Don't

| Do | Don't |
|---|---|
| Compressed GLTF (draco/ktx2) | Raw .obj with huge textures |
| ≤ 1 heavy 3D area per page | 3D in every section |
| Dispose on unmount | Leaking render loops |
| Mobile fallback | Requiring WebGL2 for content |