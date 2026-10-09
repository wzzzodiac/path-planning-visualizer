# Path Planning Visualizer / Atlas 3D

Interactive browser-based visualization of common grid path-planning algorithms.

## Algorithms

- A* Search
- Dijkstra
- Greedy Best-First Search

## V2 features

- Drag-and-drop **START** and **GOAL** nodes
- Paint and erase walls directly on the grid
- Weighted terrain:
  - normal cell: cost 1
  - rough terrain: cost 4
  - heavy terrain: cost 8
- Optional diagonal / 8-connected movement
- Diagonal movement uses `sqrt(2)` distance cost
- Corner cutting through blocked cells is disabled
- Random wall generation
- Random weighted-terrain generation
- Animated search exploration
- Final path visualization
- Metrics for:
  - nodes explored
  - path steps
  - total path cost
  - compute time
  - movement model
- Adjustable animation speed
- Beginner-friendly explanations for each algorithm
- Responsive engineering-console UI for desktop, laptop, tablet and mobile

## How the algorithms differ

### A*

A* combines the cost already travelled with a heuristic estimate of the remaining distance to the goal.

```text
priority = travelled cost + estimated remaining cost
```

With the heuristic used here, A* finds the cheapest route while generally exploring fewer cells than Dijkstra.

### Dijkstra

Dijkstra only considers accumulated travel cost.

```text
priority = travelled cost
```

It guarantees the cheapest route for positive edge costs, but it does not know which direction the goal is located.

### Greedy Best-First

Greedy mainly follows the heuristic estimate toward the goal.

```text
priority = estimated remaining distance
```

It often explores fewer cells, but it is not guaranteed to find the cheapest path. Weighted terrain makes this difference especially easy to see.

## Weighted movement

Entering a cell multiplies the movement distance by that cell's terrain cost.

For orthogonal movement:

```text
step cost = 1 × terrain cost
```

For diagonal movement:

```text
step cost = sqrt(2) × terrain cost
```

## Run locally

Serve the checkout with `python -m http.server 8003 --bind 127.0.0.1`, then open `http://127.0.0.1:8003/`. Use `/?scene=canyon` for the Canyon scenario. JavaScript modules require HTTP; opening the file directly is not supported.

## Tech

Plain HTML, CSS and JavaScript, with locally vendored Three.js 0.180.0 and a Blender-built GLB rover. No framework, build step, runtime CDN or backend.

---

Made for robots that refuse to simply walk in a straight line.

## Atlas 3D review

Orbit an interactive planning table, switch to a top view, paint terrain or drag endpoints in 3D, and follow the survey rover along the computed route. The 2D editor remains available and serves as the WebGL fallback. Original A*, Dijkstra and Greedy behavior is preserved: height is decorative, costs remain 1/4/8, and diagonal corner cutting is disabled.

The review includes [before/after images and video](docs/atlas/index.html), [validation and limitations](docs/atlas-review.md), and the editable [Blender source](assets/rover.blend). Regenerate the rover with `blender --background --python-exit-code 1 --python tools/build_rover.py`.
