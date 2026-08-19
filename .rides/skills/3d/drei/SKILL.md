---
name: drei
description: Drei skill — batteries-included helpers for React Three Fiber: Float, OrbitControls, Environment, Text, Html, ContactShadows, MeshTransmissionMaterial, useGLTF. Usage + performance rules.
---

# Drei (drei)

Companion library for React Three Fiber. Provides production-ready helpers so you don't hand-roll camera controls, lighting environments, text, or shadows.

## Install

```bash
npm i three @react-three/fiber @react-three/drei
```

## Most-Used Helpers

| Helper | Use |
|---|---|
| `Float` | Gentle levitation: `<Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.5}>` |
| `OrbitControls` | User camera control: `makeDefault`, `enableZoom={false}`, `enablePan={false}` for hero scenes |
| `Environment` | Realistic lighting: `<Environment preset="city" />` (or `files` HDR) — biggest quality boost per line |
| `ContactShadows` | Soft grounding shadow: `<ContactShadows position={[0,-2,0]} opacity={0.4} scale={10} blur={2.4} />` |
| `Text` | 3D text: `<Text font={...} fontSize={1}>` — use `troika-three-text` (drei's Text) not texture text |
| `Html` | DOM overlay: `<Html distanceFactor={10}>` — label/tooltip content in HTML |
| `MeshTransmissionMaterial` | Glass: `<MeshTransmissionMaterial transmission={1} thickness={0.5} />` (expensive — limit) |
| `RoundedBox` | Soft-edge boxes: `<RoundedBox radius={0.08} smoothness={4}>` |
| `useGLTF` | Cached model loading: `const { scene } = useGLTF(url)` |
| `Sparkles` / `Stars` | Particle ambience (cheap, subtle) |
| `GradientTexture` | Canvas gradient as texture |
| `useScroll` | Scroll-linked scene control |
| `useTexture` | Texture loader with cache |

## Rules

1. `Environment` is the #1 realism helper — use it before adding more lights. One preset per scene.
2. `Float` + `Environment` + `ContactShadows` = premium-looking hero with 3 components. No more.
3. `Html` content is DOM — keep it light; use for labels/tooltips, not complex UI.
4. `MeshTransmissionMaterial` is heavy (multiple render passes) — hero-only, never on multiple objects, reduce `samples`.
5. `OrbitControls`: hero scenes usually want `enableZoom={false}`; dashboards may allow full control.
6. Use `useGLTF.preload(url)` for prefetch; lazy import scenes that are below the fold.
7. Dispose models when swapping: `useGLTF` caches — fine; for dynamic load/unload, dispose traversed geometry/material.

## Do / Don't

| Do | Don't |
|---|---|
| `Environment preset` for lighting | 6 lights + no environment |
| `Float` for life | Random rotation everywhere |
| `ContactShadows` once | `<ContactShadows>` per object |
| `useGLTF` + ktx2/draco compression | Uncompressed models |

## Verification

- [ ] Scene renders with fallback while loading.
- [ ] Reduced-motion: Float/rotation disabled or static.
- [ ] Draw calls sane (`renderer.info`).