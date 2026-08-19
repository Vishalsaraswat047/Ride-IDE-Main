---
name: react-three-fiber
description: React Three Fiber skill — declarative Three.js in React (Canvas, useFrame, useLoader, geometry/materials as JSX). Use for React 3D UIs. Rules: keep it lean, one scene per page, dispose properly.
---

# React Three Fiber (R3F)

Declarative Three.js for React (`@react-three/fiber` + `@react-three/drei`). Three.js objects are JSX; state changes rerender the scene. Choose R3F for React apps; plain Three.js for non-React.

## Setup

```tsx
import { Canvas } from "@react-three/fiber";

<Canvas camera={{ position: [0, 0, 10], fov: 45 }} dpr={[1, 2]}>
  <ambientLight intensity={0.5} />
  <directionalLight position={[5, 5, 5]} />
  <mesh>
    <boxGeometry args={[2, 2, 2]} />
    <meshStandardMaterial color="#0070f3" />
  </mesh>
</Canvas>
```

## Key APIs

1. **Canvas** props: `camera`, `dpr={[1, 2]}` (min/max pixel ratio — mobile cap), `shadows`, `gl={{ antialias: true, powerPreference: "high-performance" }}`, `onCreated`.
2. **useFrame** — per-frame logic:
   ```tsx
   useFrame((state, delta) => { ref.current.rotation.y += delta * 0.3; });
   ```
   `delta`-based (frame-rate independent); never mutate via React state in useFrame.
3. **useLoader** — `const model = useLoader(GLTFLoader, url)`; combine with `useGLTF` from drei (cached).
4. **Hooks**: `useThree` (camera, size, viewport), `useThree().gl`, `useInView` (drei) for visibility gating.
5. **drei** helpers: `Float`, `OrbitControls`, `Environment`, `ContactShadows`, `MeshTransmissionMaterial`, `PerspectiveCamera`, `RoundedBox`, `Text`, `Html` (DOM overlay), `Sparkles`, `Stars`, `GradientTexture`.

## Patterns

- **Float**: `const floatRef = useRef(); useFrame((_, d) => { floatRef.current.rotation.x = Math.sin(t) * 0.1; })` or drei `<Float>`.
- **Mouse parallax**: `useFrame((state) => { camera.position.x = THREE.MathUtils.lerp(camera.position.x, state.pointer.x * 0.5, 0.05); })`.
- **Scroll**: `useScroll` from drei + `useFrame` for scroll-driven camera/scene.
- **Lazy load**: `React.lazy` the Canvas component + `dynamic import` three/drei chunks so the page shell is lightweight.

## Rules

1. One `<Canvas>` per page max; give it a fixed-size container (`h-[60vh]` etc.), never full-viewport forever.
2. Wrap in `Suspense` with a styled fallback (gradient/mesh image) for model/texture loading.
3. Dispose on unmount: R3F auto-disposes when nodes unmount; for models call `model.scene.traverse(o => o.dispose?.())` when switching.
4. Use `dpr={[1, 2]}`; never default `[1, 3]`.
5. React state inside useFrame causes rerenders — use refs for per-frame values.
6. `useReducedMotion()` (from framer/motion or r3f context) to freeze/animate-lite.
7. Keep scene graph shallow; < 100 meshes; instanced for repetition.

## Do / Don't

| Do | Don't |
|---|---|
| `Suspense` fallback | Blank canvas while loading |
| `useFrame` with delta | Per-frame setState |
| drei helpers (`Float`, `ContactShadows`) | Hand-rolling lighting/controls |
| Mobile `dpr` cap | Multi-canvas pages |