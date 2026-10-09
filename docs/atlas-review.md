# Atlas 3D / visual review

2026-10-09. Branch `codex/path-planning-atlas-3d`, based on `9ff73acb26820c70bdbdbc767e1ff2ce0c1a6e82`. Main, the Hub and other projects are unchanged.

## Run and review

Serve this checkout with `python -m http.server 8003 --bind 127.0.0.1`, then open `http://127.0.0.1:8003/`. Use `/?scene=canyon` for the more complex demonstration. The [gallery](atlas/index.html) has a 12-second video, before/after captures of the same field, desktop/mobile views and the rover close-up. No build or installation is needed.

The default demo and baseline comparison use identical 38×24 field data, endpoints, wall positions and terrain costs. The camera projection and layout intentionally differ; this is a 2D-to-3D comparison, not pixel-identical framing. Screenshots were taken at 1440×1000 and 390×844 browser viewports. The video consists of 288 actual WebGL frames at 960×600 / 24 FPS, with condensed exploration and fixed-step rover playback. It is not a real-time performance recording.

## Design and interaction

Atlas presents the original graph as a survey-table diorama: raised obstacle blocks, distinct rough/heavy terrain markers, blue explored cells, an amber route, START/GOAL poles and a four-wheel survey rover. Lighting, shadows, height variation and the plate underneath provide depth. Height is decorative; there is no volumetric or elevation-aware search. This remains a weighted 2D grid with the original costs and no-corner-cutting rule.

- Orbit: drag to rotate, wheel or +/− to zoom. Overview resets framing; Top gives a precise overhead view; Rover uses a close camera which follows traversal and makes obstacle blocks translucent so they do not hide the vehicle.
- Edit map: paint the selected brush or drag START/GOAL; right-click erases. Touch uses one finger in the selected mode. Pinch/pan gestures are not implemented.
- 2D map: shares exactly the same state, preserving the original editor and providing a functional fallback when WebGL 2 is missing or lost.
- Run/Pause/Stop: animated exploration can be paused for inspection or cancelled without leaving map controls locked. Hidden documents suspend exploration at its next animation checkpoint and stop GPU submissions.
- Replay rover: illustrates the computed route. The rover advances at a constant cell rate; weighted cost does not determine its visual travel time. Reduced-motion preference presents the route without automatically traversing it.
- Canyon pass: a second authored scenario. A* and Dijkstra return cost **54**, while Greedy returns **147** in the default four-way model. It demonstrates why a more direct-looking weighted route can be more expensive.

## Asset pipeline

`tools/build_rover.py` was executed with installed Blender 5.2.2 LTS. It creates a beveled ochre/ivory rover with four separate wheel assemblies, tread, camera, lidar and antenna. `assets/rover.blend` is editable; `assets/rover.glb` is the actual browser asset. Regenerate using:

```powershell
blender --background --python-exit-code 1 --python tools/build_rover.py
```

The GLB is loaded using the matching Three.js r180 GLTFLoader. Imported hierarchy was inspected: four wheel nodes `Wheel_LF`, `Wheel_LB`, `Wheel_RF`, `Wheel_RB` under `RoverRoot`; rotations preserve their world-space pivot centers. Exported size is approximately 0.952 × 0.979 × 1.102 grid units. Forward is +Z in the browser, wheel axles are X. The source includes no scene camera, lights or presentation ground. Real GLB materials and geometry were visually inspected in the browser. Wheel rotation is an illustration, not a vehicle dynamics simulation.

Three.js 0.180.0, GLTFLoader and BufferGeometryUtils are vendored locally with MIT license and provenance. Loader imports were adjusted to relative local paths. No CDN runs in the product, and the CSP restricts scripts and network requests to self. No Inventor, generated imagery, paid services, framework or bundler were used.

## Verification

[verification.json](atlas/verification.json) records **46 browser checks** and **48 algorithm comparisons**. [final-checks.json](atlas/final-checks.json) adds **9 focused checks** covering Canyon, actual wheel pivots, map generators, right-click editing, context loss and switching to 2D during a delayed asset load.

The original and new searches were run on eight deterministic random wall/weighted maps, three algorithms, and both 4/8-connected movement models. Costs, full paths and full exploration order match exactly in all 48 cases. Additional independently expected cases verify diagonal √2 distance, blocked corners, a cheaper weighted detour and unreachable goals.

Browser checks exercise 3D raycast painting, all brushes, START/GOAL dragging, orbit/zoom, shared 2D edits, touch input, quality options, pause/stop, no-path recovery, rover arrival/replay, actual wheel movement, reduced motion and fallback. Viewports include 1440×1000, 390×844, 360×800, 768×1024, 844×390 and 1920×1080. The Run button is visible in the initial mobile viewport. No unexpected console/page errors or missing resources were recorded.

The renderer draws on demand while idle; it runs continuously only during rover traversal or requested interaction/search updates. It stops submitting frames in 2D or while hidden. Twenty search/reset cycles keep GPU counts at 135 geometries and 4 textures. Tile/obstacle/terrain batches use instancing; their transforms and colors are updated without allocating per-cell meshes. Replaced path geometries are disposed. Scene geometry, materials, textures, observer and renderer are disposed on final page exit. Back/forward-cache behavior has not been explicitly tested.

## Performance and limits

During rover playback, 2.2-second frame-interval samples in Edge 154.0.4258.62 on Windows / NVIDIA RTX 4070 SUPER were approximately **120 FPS**, P95 **8.4–8.5 ms**, around **135 draw calls** and **32,174 triangles** on the simple field. These are short browser frame-cadence samples, not GPU timer queries, compute-search benchmarks or sustained battery/thermal tests. Compute time in the interface measures search only, excluding rendering and animation.

Mobile is emulated at 390×844 with DPR 3 on the desktop GPU. Auto caps render DPR at 1.5, High at 2, and Low at 1 while disabling shadows. Physical phones, low-end GPUs, Safari, Firefox, screen readers and full keyboard-only map painting were not tested. The 912-cell map is fixed; this is not an optimized large-scale planning engine. Camera lighting and obstacle height are visual aids, not physical terrain or robot collision simulation.
