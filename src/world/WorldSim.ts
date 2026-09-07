/* World simulation: pure data, no rendering. Continuous 2D ground plane
 * (x/z, y is up in the scene); the renderer is one projection of this.
 * Placement runs off a jittered-grid Voronoi ("pseudo-grid"): cell seeds
 * feed both the ground-texture cells and scenery scatter, so the terrain
 * tint and the objects sitting on it share structure. */

export type Vec = { x: number; z: number };

export type Cell = { pos: Vec; tone: number; stone: boolean };

export type Rock = {
  pos: Vec;
  r: number; /* collision + visual radius */
  h: number; /* height scale */
  kind: "boulder" | "monolith";
  rot: number;
  seed: number;
};

export type Flora = { pos: Vec; h: number; seed: number };

export type TreeSite = { key: string; pos: Vec };

export type World = {
  bounds: number; /* half-extent of the square world */
  cellsPerSide: number;
  cellSize: number;
  cells: Cell[]; /* row-major [gz * cellsPerSide + gx] */
  rocks: Rock[];
  flora: Flora[];
  trees: TreeSite[];
  spawn: Vec;
};

export type Avatar = { pos: Vec; facing: number };

/* Normalized desired movement direction in world space (zero when idle) */
export type Input = { x: number; z: number };

/* Deterministic PRNG (mulberry32 over a string hash) so worlds are seeds */
export const rng = (seed: string): (() => number) => {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const dist = (a: Vec, b: Vec): number => Math.hypot(a.x - b.x, a.z - b.z);

/* Rolling hills: presentation-only elevation (the sim itself stays 2D —
 * movement and collision ignore it). Broad overlapping sines, ±~2.7
 * units, with a small local undulation so relief reads at screen scale. */
export const height = (x: number, z: number): number =>
  1.5 * Math.sin(x * 0.14 + z * 0.08 + 1.7) +
  0.85 * Math.sin(x * 0.06 - z * 0.17 + 4.2) +
  0.45 * Math.sin((x + z) * 0.21 + 0.6) +
  0.22 * Math.sin(x * 0.34 + z * 0.29 + 2.3);

export const gen = (seed: string): World => {
  const rand = rng(seed);
  const bounds = 34;
  const cellsPerSide = 18;
  const cellSize = (2 * bounds) / cellsPerSide;

  const cells: Cell[] = [];
  for (let gz = 0; gz < cellsPerSide; gz++)
    for (let gx = 0; gx < cellsPerSide; gx++) {
      const jx = (rand() - 0.5) * 0.9 * cellSize;
      const jz = (rand() - 0.5) * 0.9 * cellSize;
      cells.push({
        pos: {
          x: -bounds + (gx + 0.5) * cellSize + jx,
          z: -bounds + (gz + 0.5) * cellSize + jz,
        },
        tone: rand(),
        stone: rand() < 0.14,
      });
    }

  const spawn = { x: 0, z: 10 };

  /* The gate: a pass between two monolith clusters, plugged by a tree
   * site. Shrinking the expression shrinks its footprint and opens the
   * way. A second, free-standing tree sits near spawn for low-stakes
   * play, and more are scattered across the landscape (their content is
   * assigned in WorldView from the Grove palette). */
  const trees: TreeSite[] = [
    { key: "gate", pos: { x: 0, z: -10 } },
    { key: "meadow", pos: { x: 12, z: 8 } },
  ];
  let ti = 0;
  for (const c of cells) {
    if (trees.length >= 10) break;
    if (rand() < 0.6) continue;
    const p = {
      x: c.pos.x + (rand() - 0.5) * 2,
      z: c.pos.z + (rand() - 0.5) * 2,
    };
    if (Math.abs(p.x) > bounds - 5 || Math.abs(p.z) > bounds - 5) continue;
    if (dist(p, spawn) < 8) continue;
    if (!trees.every((t) => dist(p, t.pos) > 10)) continue;
    trees.push({ key: `t${ti++}`, pos: p });
  }

  const rocks: Rock[] = [];
  const monolith = (x: number, z: number, big: boolean) =>
    rocks.push({
      pos: { x, z },
      r: big ? 1.6 : 1.1,
      h: big ? 4.2 + rand() * 1.6 : 2.4 + rand() * 1.2,
      kind: "monolith",
      rot: rand() * Math.PI,
      seed: rand(),
    });
  /* flanks of the pass */
  for (const side of [-1, 1]) {
    monolith(side * 6.5, -10, true);
    monolith(side * 8.6, -9.2, false);
    monolith(side * 10.4, -8.0, false);
    monolith(side * 12.0, -6.2, true);
  }

  /* boulders scattered at a subset of cell seeds, kept clear of spawn,
   * tree sites, and the corridor through the pass */
  const clear_of = (p: Vec): boolean =>
    dist(p, spawn) > 5 &&
    trees.every((t) => dist(p, t.pos) > 7) &&
    !(Math.abs(p.x) < 4.5 && p.z > -22 && p.z < 14) /* corridor */;
  for (const c of cells) {
    if (rand() < 0.16 && clear_of(c.pos) && Math.abs(c.pos.x) < bounds - 3 && Math.abs(c.pos.z) < bounds - 3) {
      rocks.push({
        pos: { x: c.pos.x + (rand() - 0.5) * 1.5, z: c.pos.z + (rand() - 0.5) * 1.5 },
        r: 0.6 + rand() * 1.3,
        h: 0.6 + rand() * 0.7,
        kind: "boulder",
        rot: rand() * Math.PI,
        seed: rand(),
      });
    }
  }

  const flora: Flora[] = [];
  for (const c of cells) {
    if (rand() < 0.13 && clear_of(c.pos) && !c.stone && Math.abs(c.pos.x) < bounds - 2 && Math.abs(c.pos.z) < bounds - 2) {
      flora.push({
        pos: { x: c.pos.x + (rand() - 0.5) * 2, z: c.pos.z + (rand() - 0.5) * 2 },
        h: 2.2 + rand() * 2.6,
        seed: rand(),
      });
    }
  }

  return { bounds, cellsPerSide, cellSize, cells, rocks, flora, trees, spawn };
};

const SPEED = 8;
const AVATAR_R = 0.5;

/* Advance the avatar: move, then push out of circle colliders (rocks and
 * tree footprints — the latter queried live, since footprint tracks the
 * expression's current size: shrinking the term IS opening the path). */
export const tick = (
  av: Avatar,
  input: Input,
  dt: number,
  world: World,
  treeRadius: (key: string) => number
): Avatar => {
  const mag = Math.hypot(input.x, input.z);
  if (mag < 1e-6) return av;
  const dir = { x: input.x / mag, z: input.z / mag };
  let x = av.pos.x + dir.x * SPEED * dt;
  let z = av.pos.z + dir.z * SPEED * dt;

  const push = (cx: number, cz: number, cr: number) => {
    const dx = x - cx;
    const dz = z - cz;
    const d = Math.hypot(dx, dz);
    const min = cr + AVATAR_R;
    if (d < min && d > 1e-6) {
      x = cx + (dx / d) * min;
      z = cz + (dz / d) * min;
    }
  };
  for (const r of world.rocks) push(r.pos.x, r.pos.z, r.r * 0.9);
  for (const t of world.trees) push(t.pos.x, t.pos.z, treeRadius(t.key));

  const lim = world.bounds - 1;
  x = Math.max(-lim, Math.min(lim, x));
  z = Math.max(-lim, Math.min(lim, z));
  return { pos: { x, z }, facing: Math.atan2(dir.x, dir.z) };
};
