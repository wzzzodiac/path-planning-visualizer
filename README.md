# Path Planning Visualizer v2

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

Open `index.html` in a browser.

## Tech

Plain HTML, CSS and JavaScript. No framework and no backend.

---

Made for robots that refuse to simply walk in a straight line.
