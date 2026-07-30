import * as Stage from "./Stage";
import * as Path from "./syntax/Path";
import * as Statics from "./Statics";

/* Screen-space arrow-key navigation, columnar model.
 *
 * The half-flat projections lay every target out in bands along one
 * axis: columns in TreeLeft (depth grows rightward), rows in TreeTop
 * (depth grows downward), a single line in the linear projections.
 * Movement reads off that structure:
 *
 *  - along the depth axis, rootward: straight to the parent — the one
 *    direction where the tree has a unique answer, so descend-then-
 *    ascend always returns;
 *  - along the depth axis, deeper: hop to the nearest band in that
 *    direction, landing on its least-sideways candidate (near-ties go
 *    to the tree-closest — from the root, a child head beats an
 *    equally-near grandchild);
 *  - across it: scan within the current band to the next candidate;
 *  - when the banded rule finds nothing (band exhausted, the root's
 *    solo band, no bands ahead), fall back to the nearest candidate in
 *    a cone opening in the pressed direction — movement never feels
 *    dead where the screen plainly has something that way.
 *
 * Everything is measured from the rendered stage: nodes are points (an
 * atom its own center, a comp its head's center — the head is where you
 * visually "are"), the depth axis is detected from the spread of the
 * root's kids (siblings fan out along the breadth axis), and a band is
 * the set of points whose depth coordinate matches to within a fraction
 * of the stage font. No per-projection dispatch; the linear projections
 * degenerate to line-order for free.
 */

export type Direction = "up" | "down" | "left" | "right";

type Pt = { x: number; y: number };

type Item = { pt: Pt; path: Path.t };

const VEC: Record<Direction, Pt> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/* Fallback cone half-width: forward offset must exceed this fraction of
 * the sideways offset (~63° half-angle). */
const CONE = 0.5;

/* Candidates within this factor (plus jitter) of the best count as tied. */
const TIE_BAND = 1.15;

/* Position jitter tolerance, px. */
const EPS = 2;

/* Same-band tolerance, as a fraction of the stage font size: bands sit
 * about a head-width apart, members within a couple of pixels. */
const BAND_EM = 0.35;

/* Edges between two nodes along tree paths (via their common prefix). */
const tree_dist = (a: Path.t, b: Path.t): number => {
  let c = 0;
  while (c < a.length && c < b.length && a[c] === b[c]) c++;
  return a.length - c + (b.length - c);
};

const center = (r: DOMRect): Pt => ({
  x: r.x + r.width / 2,
  y: r.y + r.height / 2,
});

/* A node's navigation point: atoms their own center, comps their head's.
 * (Motion-layer clones never match here: their ids are stripped.) */
const point_of = (el: HTMLElement): Pt => {
  const head = el.querySelector<HTMLElement>(":scope > .head");
  return center((head ?? el).getBoundingClientRect());
};

/* Best of scored candidates: nearest, near-ties to the tree-closest. */
const pick = (
  cands: { dist: number; path: Path.t }[],
  from: Path.t
): Path.t | null => {
  if (cands.length === 0) return null;
  const nearest = Math.min(...cands.map((c) => c.dist));
  return cands
    .filter((c) => c.dist <= nearest * TIE_BAND + EPS)
    .reduce((a, b) => {
      const ta = tree_dist(from, a.path);
      const tb = tree_dist(from, b.path);
      return tb < ta || (tb === ta && b.dist < a.dist) ? b : a;
    }).path;
};

const nearest_in_cone = (
  cur: Pt,
  from: Path.t,
  items: Item[],
  dir: Direction
): Path.t | null => {
  const d = VEC[dir];
  const cands: { dist: number; path: Path.t }[] = [];
  for (const it of items) {
    const dx = it.pt.x - cur.x;
    const dy = it.pt.y - cur.y;
    const along = dx * d.x + dy * d.y;
    const ortho = Math.abs(dx * d.y) + Math.abs(dy * d.x);
    if (along <= CONE * ortho || along <= EPS) continue;
    cands.push({ dist: Math.hypot(dx, dy), path: it.path });
  }
  return pick(cands, from);
};

/* The selection to move to for an arrow press, or null for no move. */
export const next = (stage: Stage.t, dir: Direction): Path.t | null => {
  const container = document.querySelector<HTMLElement>(
    "#stage .node-container"
  );
  if (!container) return null;
  /* Nothing selected: the first press steps from the window into the
   * root of the tree, whatever the direction. */
  if (stage.selection === "unselected") return [];
  const cur_el = container.querySelector<HTMLElement>(
    '.node.selected[id^="node-"]'
  );
  if (!cur_el) return [];
  const cur = point_of(cur_el);
  const from = stage.selection;

  const all: Item[] = [];
  const items: Item[] = []; // all minus the current node
  for (const el of Array.from(
    container.querySelectorAll<HTMLElement>('.node[id^="node-"]')
  )) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue; // hidden probe/measure els
    const id = parseInt(el.id.slice("node-".length), 10);
    const item = { pt: point_of(el), path: Statics.get(stage.info, id).path };
    all.push(item);
    if (el !== cur_el) items.push(item);
  }
  if (items.length === 0) return null;

  /* Siblings spread out along the breadth axis; the depth axis — the
   * one bands quantize — is the other. Detected from the spread of the
   * root's kids. (In the linear projections the kids spread on x and
   * the "depth" axis degenerates to y: its single band is the whole
   * line, cross-hops find no other band, and within-band scanning is
   * exactly line order.) */
  let axis: "x" | "y" = "x";
  const kids = all.filter((i) => i.path.length === 1);
  if (kids.length > 0) {
    const range = (vals: number[]): number =>
      Math.max(...vals) - Math.min(...vals);
    axis = range(kids.map((k) => k.pt.x)) > range(kids.map((k) => k.pt.y))
      ? "y"
      : "x";
  }
  const depth = (p: Pt): number => (axis === "x" ? p.x : p.y);
  const breadth = (p: Pt): number => (axis === "x" ? p.y : p.x);
  const d = VEC[dir];
  const depth_sign = axis === "x" ? d.x : d.y;
  const band_px =
    BAND_EM * parseFloat(getComputedStyle(container).fontSize) || 16;

  if (depth_sign !== 0) {
    /* Rootward, the tree has exactly one right answer: the parent. The
     * geometric hop lands there anyway whenever bands are generation-
     * aligned; this makes the wobbly cases exact (TreeTop's sibling
     * rows start at different depths, so the nearest band above can
     * hold only a far-sideways sibling while the parent sits a band
     * further). Rootward-ness is read from the geometry: the arrow
     * points toward the root's end of the depth axis. In the linear
     * projections the root shares the single band and no direction is
     * ever rootward. */
    const root = all.find((i) => i.path.length === 0);
    if (root && from.length > 0) {
      const d_root = depth(root.pt) - depth(cur);
      if (Math.abs(d_root) > band_px && Math.sign(d_root) === depth_sign) {
        return from.slice(0, -1);
      }
    }
    /* Band hop: nearest band in the pressed direction, least-sideways
     * candidate within it. */
    const ahead = items.filter(
      (i) => (depth(i.pt) - depth(cur)) * depth_sign > band_px
    );
    if (ahead.length > 0) {
      const min_d = Math.min(
        ...ahead.map((i) => Math.abs(depth(i.pt) - depth(cur)))
      );
      const res = pick(
        ahead
          .filter((i) => Math.abs(depth(i.pt) - depth(cur)) <= min_d + band_px)
          .map((i) => ({
            dist: Math.abs(breadth(i.pt) - breadth(cur)),
            path: i.path,
          })),
        from
      );
      if (res) return res;
    }
  } else {
    /* Scan within the current band. */
    const breadth_sign = axis === "x" ? d.y : d.x;
    const res = pick(
      items
        .filter(
          (i) =>
            Math.abs(depth(i.pt) - depth(cur)) <= band_px &&
            (breadth(i.pt) - breadth(cur)) * breadth_sign > EPS
        )
        .map((i) => ({
          dist: Math.abs(breadth(i.pt) - breadth(cur)),
          path: i.path,
        })),
      from
    );
    if (res) return res;
  }
  /* The banded rule found nothing: diagonal fallback. */
  return nearest_in_cone(cur, from, items, dir);
};
