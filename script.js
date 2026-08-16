const $ = id => document.getElementById(id);

const gridEl = $('grid');
const algorithmEl = $('algorithm');
const brushEl = $('brush');
const speedEl = $('speed');
const speedValueEl = $('speedValue');
const diagonalToggle = $('diagonalToggle');
const brushReadout = $('brushReadout');

const runBtn = $('runBtn');
const clearPathBtn = $('clearPathBtn');
const clearWallsBtn = $('clearWallsBtn');
const mazeBtn = $('mazeBtn');
const terrainBtn = $('terrainBtn');
const resetBtn = $('resetBtn');

const statAlgorithm = $('statAlgorithm');
const statNodes = $('statNodes');
const statLength = $('statLength');
const statCost = $('statCost');
const statTime = $('statTime');
const statMovement = $('statMovement');
const statusBox = $('statusBox');
const infoTitle = $('infoTitle');
const infoText = $('infoText');
const infoSimple = $('infoSimple');

const ROWS = 24;
const COLS = 38;
const DEFAULT_START = { r: 12, c: 5 };
const DEFAULT_GOAL = { r: 12, c: 32 };

let start = { ...DEFAULT_START };
let goal = { ...DEFAULT_GOAL };
let walls = new Set();
let terrain = new Map();
let visitedCells = new Set();
let pathCells = new Set();
let isRunning = false;
let pointerDown = false;
let draggedPoint = null;
let lastPaintedKey = null;

const algorithms = {
  astar: {
    label: 'A*',
    title: 'A* Search',
    text: 'A* remembers how expensive the trip has already been and adds an estimate of how much farther the goal probably is. With a safe heuristic, it still finds the cheapest route, but normally explores less of the map than Dijkstra.',
    simple: 'Think of GPS navigation: “this road already cost me 8, and I estimate about 12 more to the destination”. It balances both numbers.'
  },
  dijkstra: {
    label: 'Dijkstra',
    title: 'Dijkstra',
    text: 'Dijkstra only cares about the cost accumulated from START. It always expands the cheapest known option first. That guarantees the cheapest route with positive costs, but it has no clue which direction the GOAL is.',
    simple: 'Imagine water spreading from START. It expands everywhere by cheapest travel cost until one wave finally reaches GOAL.'
  },
  greedy: {
    label: 'Greedy',
    title: 'Greedy Best-First',
    text: 'Greedy mostly asks one question: “which cell looks closest to GOAL right now?” That can make it very fast, but it ignores how expensive the route has already become, so weighted terrain can trick it badly.',
    simple: 'Imagine always walking toward the visible destination, even if the direct street suddenly turns into an eight-times-more-expensive swamp.'
  }
};

const brushLabels = {
  wall: 'WALL',
  erase: 'ERASE',
  rough: 'COST 4',
  heavy: 'COST 8'
};

function key(r, c) { return `${r},${c}`; }
function parseKey(k) { const [r, c] = k.split(',').map(Number); return { r, c }; }
function same(a, b) { return a.r === b.r && a.c === b.c; }
function inBounds(r, c) { return r >= 0 && r < ROWS && c >= 0 && c < COLS; }
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function terrainCost(r, c) { return terrain.get(key(r, c)) || 1; }

function heuristic(a, b) {
  const dx = Math.abs(a.c - b.c);
  const dy = Math.abs(a.r - b.r);
  if (!diagonalToggle.checked) return dx + dy;
  const diagonal = Math.min(dx, dy);
  const straight = Math.max(dx, dy) - diagonal;
  return diagonal * Math.SQRT2 + straight;
}

function createGrid() {
  gridEl.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
  gridEl.style.gridTemplateRows = `repeat(${ROWS}, 1fr)`;
  gridEl.innerHTML = '';

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.r = r;
      cell.dataset.c = c;
      cell.addEventListener('pointerdown', onPointerDown);
      cell.addEventListener('pointerenter', onPointerEnter);
      cell.addEventListener('contextmenu', onContextMenu);
      gridEl.appendChild(cell);
    }
  }

  window.addEventListener('pointerup', finishPointerAction);
  window.addEventListener('pointercancel', finishPointerAction);
  renderGrid();
}

function finishPointerAction() {
  pointerDown = false;
  draggedPoint = null;
  lastPaintedKey = null;
}

function getCell(r, c) { return gridEl.children[r * COLS + c]; }

function renderGrid() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = getCell(r, c);
      const k = key(r, c);
      cell.className = 'cell';
      if (walls.has(k)) cell.classList.add('wall');
      else if (terrain.get(k) === 4) cell.classList.add('rough');
      else if (terrain.get(k) === 8) cell.classList.add('heavy');
      if (visitedCells.has(k)) cell.classList.add('visited');
      if (pathCells.has(k)) cell.classList.add('path');
      if (same({ r, c }, start)) cell.classList.add('start');
      if (same({ r, c }, goal)) cell.classList.add('goal');
    }
  }
}

function resetStats() {
  statNodes.textContent = '0';
  statLength.textContent = '0';
  statCost.textContent = '0';
  statTime.textContent = '0 ms';
}

function clearSearchVisualization() {
  visitedCells.clear();
  pathCells.clear();
  resetStats();
  renderGrid();
}

function onPointerDown(e) {
  if (isRunning) return;
  e.preventDefault();
  const r = Number(e.currentTarget.dataset.r);
  const c = Number(e.currentTarget.dataset.c);
  const p = { r, c };
  pointerDown = true;
  clearSearchVisualization();

  if (same(p, start)) { draggedPoint = 'start'; return; }
  if (same(p, goal)) { draggedPoint = 'goal'; return; }

  paintCell(r, c, brushEl.value);
}

function onPointerEnter(e) {
  if (!pointerDown || isRunning) return;
  const r = Number(e.currentTarget.dataset.r);
  const c = Number(e.currentTarget.dataset.c);
  const p = { r, c };

  if (draggedPoint) {
    const k = key(r, c);
    if (walls.has(k)) return;
    if (draggedPoint === 'start' && same(p, goal)) return;
    if (draggedPoint === 'goal' && same(p, start)) return;
    if (draggedPoint === 'start') start = p;
    else goal = p;
    terrain.delete(k);
    renderGrid();
    return;
  }

  paintCell(r, c, brushEl.value);
}

function onContextMenu(e) {
  e.preventDefault();
  if (isRunning) return;
  const r = Number(e.currentTarget.dataset.r);
  const c = Number(e.currentTarget.dataset.c);
  eraseCell(r, c);
  clearSearchVisualization();
}

function eraseCell(r, c) {
  const p = { r, c };
  if (same(p, start) || same(p, goal)) return;
  const k = key(r, c);
  walls.delete(k);
  terrain.delete(k);
  renderGrid();
}

function paintCell(r, c, brush) {
  const p = { r, c };
  if (same(p, start) || same(p, goal)) return;
  const k = key(r, c);
  if (k === lastPaintedKey) return;
  lastPaintedKey = k;

  if (brush === 'erase') {
    walls.delete(k);
    terrain.delete(k);
  } else if (brush === 'wall') {
    terrain.delete(k);
    walls.add(k);
  } else {
    walls.delete(k);
    terrain.set(k, brush === 'rough' ? 4 : 8);
  }
  renderGrid();
}

function getNeighbors(node) {
  const orthogonal = [[1,0],[-1,0],[0,1],[0,-1]];
  const diagonal = [[1,1],[1,-1],[-1,1],[-1,-1]];
  const dirs = diagonalToggle.checked ? [...orthogonal, ...diagonal] : orthogonal;
  const out = [];

  for (const [dr, dc] of dirs) {
    const r = node.r + dr;
    const c = node.c + dc;
    if (!inBounds(r, c) || walls.has(key(r, c))) continue;

    const isDiagonal = dr !== 0 && dc !== 0;
    if (isDiagonal) {
      const sideA = key(node.r + dr, node.c);
      const sideB = key(node.r, node.c + dc);
      if (walls.has(sideA) || walls.has(sideB)) continue;
    }

    const distance = isDiagonal ? Math.SQRT2 : 1;
    out.push({ r, c, stepCost: distance * terrainCost(r, c) });
  }
  return out;
}

function reconstructPath(cameFrom, endKey) {
  const path = [];
  let current = endKey;
  const startKey = key(start.r, start.c);
  while (current && current !== startKey) {
    path.push(parseKey(current));
    current = cameFrom.get(current);
  }
  path.reverse();
  return path;
}

function runSearch(type) {
  const startKey = key(start.r, start.c);
  const goalKey = key(goal.r, goal.c);
  const open = [{ ...start, priority: 0 }];
  const cameFrom = new Map();
  const gScore = new Map([[startKey, 0]]);
  const closed = new Set();
  const explorationOrder = [];

  while (open.length) {
    open.sort((a, b) => a.priority - b.priority);
    const current = open.shift();
    const ck = key(current.r, current.c);
    if (closed.has(ck)) continue;
    closed.add(ck);

    if (ck !== startKey) explorationOrder.push({ r: current.r, c: current.c });
    if (ck === goalKey) {
      return {
        found: true,
        explorationOrder,
        path: reconstructPath(cameFrom, goalKey),
        cost: gScore.get(goalKey) || 0
      };
    }

    for (const neighbor of getNeighbors(current)) {
      const nk = key(neighbor.r, neighbor.c);
      if (closed.has(nk)) continue;

      const tentativeG = (gScore.get(ck) ?? Infinity) + neighbor.stepCost;
      if (tentativeG < (gScore.get(nk) ?? Infinity)) {
        cameFrom.set(nk, ck);
        gScore.set(nk, tentativeG);

        let priority;
        if (type === 'dijkstra') priority = tentativeG;
        else if (type === 'greedy') priority = heuristic(neighbor, goal);
        else priority = tentativeG + heuristic(neighbor, goal);

        open.push({ r: neighbor.r, c: neighbor.c, priority });
      }
    }
  }

  return { found: false, explorationOrder, path: [], cost: Infinity };
}

function animationDelay() {
  return ({ 1: 65, 2: 35, 3: 18, 4: 7, 5: 0 })[Number(speedEl.value)];
}

async function animateResult(result) {
  const delay = animationDelay();
  for (let i = 0; i < result.explorationOrder.length; i++) {
    const p = result.explorationOrder[i];
    if (!same(p, goal)) visitedCells.add(key(p.r, p.c));
    if (delay === 0) {
      if (i % 70 === 0) { renderGrid(); await sleep(0); }
    } else {
      renderGrid();
      await sleep(delay);
    }
  }
  renderGrid();

  if (!result.found) return;
  for (const p of result.path) {
    if (!same(p, goal)) pathCells.add(key(p.r, p.c));
    renderGrid();
    if (delay > 0) await sleep(Math.max(8, delay));
  }
}

async function run() {
  if (isRunning) return;
  isRunning = true;
  setControlsDisabled(true);
  clearSearchVisualization();

  const type = algorithmEl.value;
  const data = algorithms[type];
  statAlgorithm.textContent = data.label;
  statMovement.textContent = diagonalToggle.checked ? '8-WAY' : '4-WAY';
  statusBox.textContent = 'Planning route... weighted suffering is being quantified.';

  const t0 = performance.now();
  const result = runSearch(type);
  const computeMs = performance.now() - t0;

  statNodes.textContent = result.explorationOrder.length.toString();
  statLength.textContent = result.found ? result.path.length.toString() : '—';
  statCost.textContent = result.found ? result.cost.toFixed(2) : '—';
  statTime.textContent = `${computeMs.toFixed(2)} ms`;

  await animateResult(result);

  if (result.found) {
    const comments = {
      astar: `A* found a route costing ${result.cost.toFixed(2)}. It used both experience and vibes, mathematically speaking.`,
      dijkstra: `Dijkstra found the cheapest route costing ${result.cost.toFixed(2)}. Thoroughness remains undefeated.`,
      greedy: `Greedy reached GOAL with cost ${result.cost.toFixed(2)}. Fast-looking decisions are not always cheap decisions.`
    };
    statusBox.textContent = comments[type];
  } else {
    statusBox.textContent = 'No path found. Congratulations, the robot has been architecturally defeated.';
  }

  isRunning = false;
  setControlsDisabled(false);
}

function setControlsDisabled(disabled) {
  [runBtn, clearPathBtn, clearWallsBtn, mazeBtn, terrainBtn, resetBtn].forEach(btn => btn.disabled = disabled);
  [algorithmEl, brushEl, speedEl, diagonalToggle].forEach(el => el.disabled = disabled);
}

function clearMap() {
  if (isRunning) return;
  walls.clear();
  terrain.clear();
  clearSearchVisualization();
  statusBox.textContent = 'Map cleared. START and GOAL survived the purge.';
}

function resetDemo() {
  if (isRunning) return;
  walls.clear();
  terrain.clear();
  start = { ...DEFAULT_START };
  goal = { ...DEFAULT_GOAL };
  diagonalToggle.checked = false;
  brushEl.value = 'wall';
  clearSearchVisualization();
  updateBrushReadout();
  updateMovementReadout();
  statusBox.textContent = 'Demo reset. Fresh grid, fresh opportunities for bad routing decisions.';
}

function randomWalls() {
  if (isRunning) return;
  walls.clear();
  terrain.clear();
  clearSearchVisualization();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = { r, c };
      if (same(p, start) || same(p, goal)) continue;
      if (Math.random() < 0.21) walls.add(key(r, c));
    }
  }
  renderGrid();
  statusBox.textContent = 'Random walls generated. Civil engineering has once again become hostile.';
}

function randomTerrain() {
  if (isRunning) return;
  terrain.clear();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = { r, c };
      const k = key(r, c);
      if (same(p, start) || same(p, goal) || walls.has(k)) continue;
      const roll = Math.random();
      if (roll < 0.12) terrain.set(k, 8);
      else if (roll < 0.32) terrain.set(k, 4);
    }
  }
  clearSearchVisualization();
  statusBox.textContent = 'Weighted terrain generated. The shortest-looking route may now be financial damage for robots.';
}

function updateAlgorithmInfo() {
  const data = algorithms[algorithmEl.value];
  statAlgorithm.textContent = data.label;
  infoTitle.textContent = data.title;
  infoText.textContent = data.text;
  infoSimple.textContent = data.simple;
}

function updateSpeedLabel() {
  const labels = { 1: 'Slow', 2: 'Normal', 3: 'Quick', 4: 'Fast', 5: 'Instant-ish' };
  speedValueEl.textContent = labels[speedEl.value];
}

function updateBrushReadout() {
  brushReadout.textContent = `BRUSH: ${brushLabels[brushEl.value]}`;
}

function updateMovementReadout() {
  statMovement.textContent = diagonalToggle.checked ? '8-WAY' : '4-WAY';
  clearSearchVisualization();
  statusBox.textContent = diagonalToggle.checked
    ? 'Diagonal movement enabled. No corner cutting through walls, because geometry still has standards.'
    : '4-way movement enabled. The robot has rediscovered Manhattan.';
}

runBtn.addEventListener('click', run);
clearPathBtn.addEventListener('click', () => {
  if (!isRunning) {
    clearSearchVisualization();
    statusBox.textContent = 'Search cleared. The map remains because consequences do too.';
  }
});
clearWallsBtn.addEventListener('click', clearMap);
mazeBtn.addEventListener('click', randomWalls);
terrainBtn.addEventListener('click', randomTerrain);
resetBtn.addEventListener('click', resetDemo);
algorithmEl.addEventListener('change', updateAlgorithmInfo);
brushEl.addEventListener('change', updateBrushReadout);
speedEl.addEventListener('input', updateSpeedLabel);
diagonalToggle.addEventListener('change', updateMovementReadout);

createGrid();
updateAlgorithmInfo();
updateSpeedLabel();
updateBrushReadout();
statMovement.textContent = '4-WAY';
