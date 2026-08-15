const gridEl = document.getElementById('grid');
const algorithmEl = document.getElementById('algorithm');
const speedEl = document.getElementById('speed');
const speedValueEl = document.getElementById('speedValue');
const runBtn = document.getElementById('runBtn');
const clearPathBtn = document.getElementById('clearPathBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const mazeBtn = document.getElementById('mazeBtn');

const statAlgorithm = document.getElementById('statAlgorithm');
const statNodes = document.getElementById('statNodes');
const statLength = document.getElementById('statLength');
const statTime = document.getElementById('statTime');
const statusBox = document.getElementById('statusBox');
const infoTitle = document.getElementById('infoTitle');
const infoText = document.getElementById('infoText');

const ROWS = 24;
const COLS = 38;
let start = { r: 12, c: 5 };
let goal = { r: 12, c: 32 };
let walls = new Set();
let visitedCells = new Set();
let pathCells = new Set();
let isRunning = false;
let mouseDown = false;
let dragMode = null;
let draggedPoint = null;

const algorithms = {
  astar: {
    label: 'A*',
    title: 'A* Search',
    text: 'A* combines the travelled cost with a heuristic estimate to the goal. It usually explores far fewer nodes than Dijkstra while still finding an optimal path with this heuristic.'
  },
  dijkstra: {
    label: 'Dijkstra',
    title: 'Dijkstra',
    text: 'Dijkstra expands outward by total travelled cost only. It guarantees the shortest path here, but it tends to inspect many more nodes because it has no idea where the goal is.'
  },
  greedy: {
    label: 'Greedy',
    title: 'Greedy Best-First',
    text: 'Greedy Best-First follows the heuristic toward the goal and ignores travelled cost. It is often fast, but the resulting path is not guaranteed to be optimal.'
  }
};

function key(r, c) { return `${r},${c}`; }
function parseKey(k) {
  const [r, c] = k.split(',').map(Number);
  return { r, c };
}
function same(a, b) { return a.r === b.r && a.c === b.c; }
function inBounds(r, c) { return r >= 0 && r < ROWS && c >= 0 && c < COLS; }
function manhattan(a, b) { return Math.abs(a.r - b.r) + Math.abs(a.c - b.c); }
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

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

  window.addEventListener('pointerup', () => {
    mouseDown = false;
    dragMode = null;
    draggedPoint = null;
  });

  renderGrid();
}

function getCell(r, c) {
  return gridEl.children[r * COLS + c];
}

function renderGrid() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = getCell(r, c);
      const k = key(r, c);
      cell.className = 'cell';
      if (walls.has(k)) cell.classList.add('wall');
      if (visitedCells.has(k)) cell.classList.add('visited');
      if (pathCells.has(k)) cell.classList.add('path');
      if (same({ r, c }, start)) cell.classList.add('start');
      if (same({ r, c }, goal)) cell.classList.add('goal');
    }
  }
}

function clearSearchVisualization() {
  visitedCells.clear();
  pathCells.clear();
  renderGrid();
  statNodes.textContent = '0';
  statLength.textContent = '0';
  statTime.textContent = '0 ms';
}

function onPointerDown(e) {
  if (isRunning) return;
  e.preventDefault();
  const r = Number(e.currentTarget.dataset.r);
  const c = Number(e.currentTarget.dataset.c);
  const p = { r, c };
  mouseDown = true;
  clearSearchVisualization();

  if (same(p, start)) {
    draggedPoint = 'start';
    return;
  }
  if (same(p, goal)) {
    draggedPoint = 'goal';
    return;
  }

  const k = key(r, c);
  dragMode = walls.has(k) ? 'erase' : 'draw';
  toggleWall(r, c, dragMode);
}

function onPointerEnter(e) {
  if (!mouseDown || isRunning) return;
  const r = Number(e.currentTarget.dataset.r);
  const c = Number(e.currentTarget.dataset.c);
  const p = { r, c };

  if (draggedPoint) {
    if (walls.has(key(r, c))) return;
    if (draggedPoint === 'start' && same(p, goal)) return;
    if (draggedPoint === 'goal' && same(p, start)) return;
    if (draggedPoint === 'start') start = p;
    else goal = p;
    renderGrid();
    return;
  }

  toggleWall(r, c, dragMode);
}

function onContextMenu(e) {
  e.preventDefault();
  if (isRunning) return;
  const r = Number(e.currentTarget.dataset.r);
  const c = Number(e.currentTarget.dataset.c);
  walls.delete(key(r, c));
  clearSearchVisualization();
}

function toggleWall(r, c, mode) {
  const p = { r, c };
  if (same(p, start) || same(p, goal)) return;
  const k = key(r, c);
  if (mode === 'erase') walls.delete(k);
  else walls.add(k);
  renderGrid();
}

function getNeighbors(node) {
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  const out = [];
  for (const [dr, dc] of dirs) {
    const r = node.r + dr;
    const c = node.c + dc;
    if (inBounds(r, c) && !walls.has(key(r, c))) out.push({ r, c });
  }
  return out;
}

function reconstructPath(cameFrom, endKey) {
  const path = [];
  let current = endKey;
  while (current && current !== key(start.r, start.c)) {
    path.push(parseKey(current));
    current = cameFrom.get(current);
  }
  path.reverse();
  return path;
}

function runSearch(type) {
  const startKey = key(start.r, start.c);
  const goalKey = key(goal.r, goal.c);
  const open = [{ ...start, g: 0, priority: 0 }];
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
      return { found: true, explorationOrder, path: reconstructPath(cameFrom, goalKey) };
    }

    for (const neighbor of getNeighbors(current)) {
      const nk = key(neighbor.r, neighbor.c);
      if (closed.has(nk)) continue;

      const tentativeG = (gScore.get(ck) ?? Infinity) + 1;
      if (tentativeG < (gScore.get(nk) ?? Infinity)) {
        cameFrom.set(nk, ck);
        gScore.set(nk, tentativeG);

        let priority;
        if (type === 'dijkstra') priority = tentativeG;
        else if (type === 'greedy') priority = manhattan(neighbor, goal);
        else priority = tentativeG + manhattan(neighbor, goal);

        open.push({ ...neighbor, g: tentativeG, priority });
      }
    }
  }

  return { found: false, explorationOrder, path: [] };
}

function animationDelay() {
  const map = { 1: 65, 2: 35, 3: 18, 4: 7, 5: 0 };
  return map[Number(speedEl.value)];
}

async function animateResult(result) {
  const delay = animationDelay();
  for (let i = 0; i < result.explorationOrder.length; i++) {
    const p = result.explorationOrder[i];
    if (!same(p, goal)) visitedCells.add(key(p.r, p.c));
    if (delay === 0) {
      if (i % 70 === 0) {
        renderGrid();
        await sleep(0);
      }
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
  statusBox.textContent = 'Planning route... the robot is thinking extremely hard about moving through rectangles.';

  const t0 = performance.now();
  const result = runSearch(type);
  const computeMs = performance.now() - t0;

  statNodes.textContent = result.explorationOrder.length.toString();
  statLength.textContent = result.found ? result.path.length.toString() : '—';
  statTime.textContent = `${computeMs.toFixed(2)} ms`;

  await animateResult(result);

  if (result.found) {
    const comments = {
      astar: 'A* found the route without inspecting the entire known universe. Efficient enough.',
      dijkstra: 'Dijkstra found the optimal route. It also inspected everything remotely relevant because subtlety is optional.',
      greedy: 'Greedy reached the goal quickly. Whether it made good life choices on the way is another question.'
    };
    statusBox.textContent = comments[type];
  } else {
    statusBox.textContent = 'No path found. Congratulations, you have successfully trapped the robot.';
  }

  setControlsDisabled(false);
  isRunning = false;
}

function setControlsDisabled(disabled) {
  runBtn.disabled = disabled;
  clearPathBtn.disabled = disabled;
  clearAllBtn.disabled = disabled;
  mazeBtn.disabled = disabled;
  algorithmEl.disabled = disabled;
}

function clearAll() {
  if (isRunning) return;
  walls.clear();
  start = { r: 12, c: 5 };
  goal = { r: 12, c: 32 };
  clearSearchVisualization();
  statusBox.textContent = 'Clean map. The robot has briefly been granted peace.';
}

function randomWalls() {
  if (isRunning) return;
  clearSearchVisualization();
  walls.clear();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = { r, c };
      if (same(p, start) || same(p, goal)) continue;
      if (Math.random() < 0.23) walls.add(key(r, c));
    }
  }
  renderGrid();
  statusBox.textContent = 'Random walls generated. Civil engineering has become hostile.';
}

function updateAlgorithmInfo() {
  const data = algorithms[algorithmEl.value];
  statAlgorithm.textContent = data.label;
  infoTitle.textContent = data.title;
  infoText.textContent = data.text;
}

function updateSpeedLabel() {
  const labels = { 1: 'Slow', 2: 'Normal', 3: 'Quick', 4: 'Fast', 5: 'Instant-ish' };
  speedValueEl.textContent = labels[speedEl.value];
}

runBtn.addEventListener('click', run);
clearPathBtn.addEventListener('click', () => {
  if (!isRunning) {
    clearSearchVisualization();
    statusBox.textContent = 'Search cleared. Walls remain because consequences do too.';
  }
});
clearAllBtn.addEventListener('click', clearAll);
mazeBtn.addEventListener('click', randomWalls);
algorithmEl.addEventListener('change', updateAlgorithmInfo);
speedEl.addEventListener('input', updateSpeedLabel);

createGrid();
updateAlgorithmInfo();
updateSpeedLabel();
