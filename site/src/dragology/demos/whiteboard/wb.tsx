// nool: copied from declarative-dragging.github.io/page/whiteboard-live/wb.tsx
// (itself from the D2 talk's d2-talk/whiteboard-live/wb.tsx); only the
// imports changed, to point at the vendored Dragology. Used by the
// whiteboard demo (./index.tsx) and the hub's whiteboard (src/home/).

// The whiteboard's tree sketches, live: a Dragology draggable that draws
// `+` trees the way they're drawn on the board (marker glyphs, blue dotted
// edges, the tree growing to the right) and, while a node is held, the
// board's colored, numbered arrows to where each rewrite would take it.
//
// The drag itself is the animate-algebra one: `d.closest` over one
// `d.between([now, rewritten])` per rewrite. Everything drawn here is a
// pure function of state (plus `draggedId`), so the arrows, the lens and
// the tree all blend together under `between`.

import {
  type DragFrame,
  type Draggable,
  type DragInitContext,
  type DragSpec,
  type DragSpecBuilder,
  type DragSpecData,
  getElementPositionCheap,
  Modifier,
  modifier,
  type OpResult,
  type Svgx,
  translate,
  Vec2,
} from "../../lib";
import {
  layeredMerge,
  layeredPrefixIds,
  layeredShiftZIndices,
  layerSvg,
} from "../../svgx/layers";
import {
  allPossibleRewrites,
  rewr,
  type Rewrite,
  type Tree,
} from "../animate-algebra/asts";

// # Ink

export const INK = {
  black: "#1f2125",
  red: "#e23a3f",
  coral: "#ec4b5c",
  orange: "#f08a24",
  teal: "#2bb0a1",
  purple: "#7b4bb8",
  violet: "#5b55cc",
  blue: "#1f6fdc",
  gray: "#9aa0a6",
};

export const HAND = `"Gochi Hand", "Comic Sans MS", cursive`;

// # Rules: the board's four arrows, numbered in this order

export type Rule = {
  key: string;
  /** What the lens labels its arrow with, as on the board */
  short: [string, string?];
  name: string;
  color: string;
  rewrites: Rewrite[];
};

export const RULES: Rule[] = [
  {
    key: "intro-r",
    short: ["i", "r"],
    name: "A → A + 0",
    color: INK.coral,
    rewrites: [rewr("#A", "(+ A (0))")],
  },
  {
    key: "intro-l",
    short: ["i", "l"],
    name: "A → 0 + A",
    color: INK.orange,
    rewrites: [rewr("#A", "(+ (0) A)")],
  },
  {
    key: "commute",
    short: ["↑c"],
    name: "A + B → B + A",
    color: INK.teal,
    rewrites: [rewr("(+ #A #B)", "(+ B A)")],
  },
  {
    key: "elim",
    short: ["↑i"],
    name: "A + 0 → A",
    color: INK.purple,
    rewrites: [rewr("(+ #A (0))", "A"), rewr("(+ (0) #A)", "A")],
  },
  {
    // The board's nested sketch: the root `+` stays put, the inner one
    // swings up to where C was
    key: "assoc",
    short: ["↑a"],
    name: "A + (B + C) → (A + B) + C",
    color: INK.purple,
    rewrites: [
      rewr("(+1 A (+2 B #C))", "(+1 (+2 A B) C)"),
      rewr("(+1 (+2 #A B) C)", "(+1 A (+2 B C))"),
    ],
  },
];

// # Trees

/** Parse "(+ A (+ B 0))". Letters keep their name as id; `+` and 0 get counters. */
export function parseTree(src: string): Tree {
  const toks = src.match(/[()]|[^\s()]+/g) ?? [];
  let i = 0;
  const counts: Record<string, number> = {};
  const fresh = (p: string) => `${p}${(counts[p] = (counts[p] ?? 0) + 1)}`;
  function node(): Tree {
    const tok = toks[i++];
    if (tok === "(") {
      const label = toks[i++];
      const children: Tree[] = [];
      while (toks[i] !== ")") children.push(node());
      i++;
      return { id: fresh(label === "+" ? "p" : "n"), label, children };
    }
    return { id: tok === "0" ? fresh("z") : tok, label: tok, children: [] };
  }
  return node();
}

function* nodesOf(
  tree: Tree,
  parent: Tree | null = null,
): Generator<{ node: Tree; parent: Tree | null }> {
  yield { node: tree, parent };
  for (const c of tree.children) yield* nodesOf(c, tree);
}

export type Option = { rule: Rule; tree: Tree };

const optionCache = new WeakMap<Tree, Map<string, Option[]>>();

/**
 * Every rewrite of `tree` that dragging node `id` can do. Cached, so the
 * drag spec and the arrows see the very same trees (new nodes get fresh
 * ids each time rewrites run).
 */
export function optionsFor(tree: Tree, id: string): Option[] {
  let byId = optionCache.get(tree);
  if (!byId) optionCache.set(tree, (byId = new Map()));
  let opts = byId.get(id);
  if (!opts) {
    opts = RULES.flatMap((rule) =>
      allPossibleRewrites(tree, rule.rewrites, id).map((t) => ({
        rule,
        tree: t,
      })),
    );
    byId.set(id, opts);
  }
  return opts;
}

// # Layout: the board's sideways trees. Depth goes right, a node's first
// child is up and to the right, its second down and to the right, and
// subtrees are pushed apart just enough that no two nodes at the same
// depth are closer than one row.

export const ROW = 116;
export const COL = 58;

type Sub = {
  rel: Map<string, { d: number; y: number }>;
  top: number[];
  bot: number[];
};

function subLayout(t: Tree): Sub {
  if (t.children.length === 0)
    return { rel: new Map([[t.id, { d: 0, y: 0 }]]), top: [0], bot: [0] };
  const kids = t.children.map(subLayout);
  const offs: number[] = [];
  const mTop: number[] = [];
  const mBot: number[] = [];
  kids.forEach((k, i) => {
    let off = 0;
    if (i > 0) {
      off = -Infinity;
      for (let d = 0; d < Math.min(mBot.length, k.top.length); d++)
        off = Math.max(off, mBot[d] + 1 - k.top[d]);
    }
    offs.push(off);
    k.top.forEach((v, d) => {
      mTop[d] = mTop[d] === undefined ? v + off : Math.min(mTop[d], v + off);
      mBot[d] =
        mBot[d] === undefined
          ? k.bot[d] + off
          : Math.max(mBot[d], k.bot[d] + off);
    });
  });
  const py = (offs[0] + offs[offs.length - 1]) / 2;
  const rel = new Map([[t.id, { d: 0, y: 0 }]]);
  kids.forEach((k, i) => {
    for (const [id, p] of k.rel)
      rel.set(id, { d: p.d + 1, y: p.y + offs[i] - py });
  });
  return {
    rel,
    top: [0, ...mTop.map((v) => v - py)],
    bot: [0, ...mBot.map((v) => v - py)],
  };
}

const layoutCache = new WeakMap<Tree, Map<string, Vec2>>();

/** Where each node of `tree` sits, with the root at (0, 0). */
export function layout(tree: Tree): Map<string, Vec2> {
  let pos = layoutCache.get(tree);
  if (!pos) {
    pos = new Map();
    for (const [id, p] of subLayout(tree).rel)
      pos.set(id, Vec2(p.d * COL, p.y * ROW));
    layoutCache.set(tree, pos);
  }
  return pos;
}

// # Glyphs: marker strokes, about 44 tall, centered on the node

const GLYPHS: Record<string, string> = {
  "+": "M -19 1 L 19 -1 M 0 -21 L 1 21",
  A: "M -15 22 L -15 -3 C -15 -17 -8 -23 0 -23 C 8 -23 15 -17 15 -3 L 15 22 M -15 1 L 15 0",
  B: "M -13 -21 L -13 22 M -13 -21 L 0 -21 C 16 -21 16 0 0 0 L -13 0 M 0 0 C 19 0 19 22 0 22 L -13 22",
  C: "M 15 -13 C 9 -22 -2 -24 -9 -19 C -19 -12 -19 12 -9 19 C -2 24 9 22 15 13",
  D: "M -13 -21 L -13 22 M -13 -21 L -2 -21 C 22 -21 22 22 -2 22 L -13 22",
  "0": "M 1 -21 C 14 -21 19 -10 19 0 C 19 12 12 21 0 21 C -12 21 -19 12 -19 0 C -19 -11 -12 -21 3 -19",
};

function glyph(label: string, color: string): Svgx {
  return (
    <path
      d={GLYPHS[label] ?? GLYPHS["0"]}
      fill="none"
      stroke={color}
      strokeWidth={7}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

/** A small hand-drawn ring, like the board's blue "o"s */
function smallO(color: string, r = 4): Svgx {
  return <circle r={r} fill="none" stroke={color} strokeWidth={2.6} />;
}

// # Arrows

/**
 * A marker arrow from `a` to `b`, trimmed back from both ends and
 * shifted `side` px to the right of its direction of travel (so a pair
 * of arrows that swap two nodes sit side by side, as on the board).
 */
function arrowPath(
  a: Vec2,
  b: Vec2,
  { trimA = 26, trimB = 26, side = 7, head = 10 } = {},
): { d: string; mid: Vec2; normal: Vec2 } | null {
  const len = a.dist(b);
  if (len < 6) return null;
  const u = b.sub(a).norm();
  const n = u.perp();
  const room = len - 14;
  const k = Math.min(1, room / (trimA + trimB));
  const p = a.add(u.mul(trimA * k), n.mul(side));
  const q = b.sub(u.mul(trimB * k)).add(n.mul(side));
  const h = Math.min(head, p.dist(q) * 0.45);
  const l = q.sub(u.rotateDeg(28).mul(h));
  const r = q.sub(u.rotateDeg(-28).mul(h));
  const f = (v: Vec2) => `${v.x.toFixed(1)} ${v.y.toFixed(1)}`;
  return {
    d: `M ${f(p)} L ${f(q)} M ${f(l)} L ${f(q)} L ${f(r)}`,
    mid: p.lerp(q, 0.5),
    normal: n,
  };
}

/** A wobbly hand-drawn circle */
function wobblyCircle(c: Vec2, r: number, seed = 1.3): string {
  const N = 72;
  const pts: string[] = [];
  for (let k = 0; k <= N + 4; k++) {
    const a = (k / N) * 2 * Math.PI + seed;
    const rr =
      r *
      (1 +
        0.014 * Math.sin(3 * a + seed * 2) +
        0.009 * Math.sin(7 * a + seed)) *
      (k > N ? 1 + (k - N) * 0.006 : 1);
    pts.push(
      `${(c.x + Math.cos(a) * rr).toFixed(1)} ${(c.y + Math.sin(a) * rr).toFixed(1)}`,
    );
  }
  return `M ${pts.join(" L ")}`;
}

function label(
  [main, sub]: [string, string?],
  at: Vec2,
  color: string,
  size = 21,
): Svgx {
  return (
    <text
      transform={translate(at)}
      textAnchor="middle"
      dominantBaseline="central"
      fontFamily={HAND}
      fontSize={size}
      fill={color}
    >
      {main}
      {sub && (
        <tspan fontSize={size * 0.7} dy={size * 0.3}>
          {sub}
        </tspan>
      )}
    </text>
  );
}

// # State

export type WBState = {
  tree: Tree;
  /**
   * The tree the current drag started from. Arrows are drawn from here,
   * so every state a drag blends between draws the same arrows; dropping
   * catches it up with `tree`.
   */
  origin: Tree;
  /** The node the lens follows, and the one drawn in red */
  focus: string;
};

export function initialState(src: string, focus = "A"): WBState {
  const tree = parseTree(src);
  return { tree, origin: tree, focus };
}

const LENS_DOT = "lens-dot";

export type WBOptions = {
  /** Where the root sits, in canvas coordinates */
  root: Vec2;
  /** Which arrows to draw while a node is held */
  arrows: "all" | "dragged" | "none";
  /** Also draw the focus node's arrows (and ghosts) while nothing is held */
  idleArrows?: boolean;
  /** Number the dragged node's arrows, as on the board */
  numbers?: boolean;
  /** Blue "o"s (and new dotted edges) where the dragged node would land */
  ghosts?: boolean;
  /** A drag-space lens: the held node's moves, radiating from its center */
  lens?: { c: Vec2; r: number; k?: number };
  /** Draw Dragology's view of the drag (pointer, projection, gap), in ink */
  inkDebug?: { specAt: Vec2 };
  /** How far from its center a node can be grabbed (28 by default; more for fingers) */
  hitR?: number;
};

// # The draggable

export function wbDraggable(o: WBOptions): Draggable<WBState> {
  return ({ state, d, draggedId }) => {
    const pos = layout(state.tree);
    const at = (id: string, p = pos) => p.get(id)!.add(o.root);

    // The tree node being dragged (the lens dot drags the focus)
    const held =
      draggedId === LENS_DOT
        ? state.focus
        : draggedId !== null && pos.has(draggedId)
          ? draggedId
          : null;
    const red = held ?? state.focus;
    // Whose arrows to draw: the held node's, or at rest maybe the focus's
    const shown = held ?? (o.idleArrows ? state.focus : null);

    const els: Svgx[] = [];

    // Edges: blue dots from each node's center to its parent's
    for (const { node, parent } of nodesOf(state.tree)) {
      if (!parent) continue;
      els.push(
        <line
          id={`e-${node.id}`}
          dragologyZIndex={-3}
          {...at(parent.id).xy1()}
          {...at(node.id).xy2()}
          stroke={INK.blue}
          strokeWidth={4.2}
          strokeLinecap="round"
          strokeDasharray="0.01 11"
        />,
      );
    }

    // Arrows from where the held node started to where each rewrite takes it
    const opts = shown && state.origin ? optionsFor(state.origin, shown) : [];
    const originPos = layout(state.origin);
    const reached = opts.findIndex((op) => op.tree === state.tree);
    opts.forEach((op, i) => {
      const optPos = layout(op.tree);
      const color = op.rule.color;
      const isReached = i === reached;
      const ink = reached === -1 ? 0.8 : isReached ? 1 : 0.14;

      if (o.ghosts) {
        const p = optPos.get(shown!)!.add(o.root);
        els.push(
          <g
            id={`gh-${i}`}
            dragologyZIndex={-2}
            transform={translate(p)}
            opacity={ink}
          >
            {smallO(INK.blue, 5)}
          </g>,
        );
        // A new parent (an intro's `+`): dot in its edge, as on the board
        const parentId = [...nodesOf(op.tree)].find((x) => x.node.id === shown)
          ?.parent?.id;
        if (parentId && !originPos.has(parentId)) {
          els.push(
            <line
              id={`ge-${i}`}
              dragologyZIndex={-3}
              {...optPos.get(parentId)!.add(o.root).xy1()}
              {...p.xy2()}
              stroke={INK.blue}
              strokeWidth={4.2}
              strokeLinecap="round"
              strokeDasharray="0.01 11"
              opacity={0.75 * ink}
            />,
          );
        }
      }

      if (o.arrows === "none") return;
      for (const [id, from] of originPos) {
        const to = optPos.get(id);
        if (!to) continue;
        const mine = id === shown;
        if (!mine && (o.arrows === "dragged" ? !isReached : false)) continue;
        // Stop short of whatever glyph sits where the arrow lands now
        const occupied = [...originPos].some(
          ([other, p]) => other !== id && p.dist(to) < 4,
        );
        const path = arrowPath(from.add(o.root), to.add(o.root), {
          trimA: mine ? 27 : 24,
          trimB: occupied ? 25 : 10,
          side: mine ? 8 : 7,
        });
        if (!path) continue;
        const opacity = mine
          ? ink
          : o.arrows === "dragged"
            ? isReached
              ? 1
              : 0
            : ink;
        els.push(
          <g id={`ar-${i}-${id}`} dragologyZIndex={-1} opacity={opacity}>
            <path
              className="ink-draw"
              pathLength={1}
              d={path.d}
              fill="none"
              stroke={color}
              strokeWidth={mine ? 3.6 : 3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {mine &&
              o.numbers &&
              label(
                [String(i + 1)],
                path.mid.add(path.normal.mul(16)),
                color,
                22,
              )}
          </g>,
        );
      }
    });

    // Nodes
    for (const { node } of nodesOf(state.tree)) {
      const isHeld = node.id === held;
      els.push(
        <g
          id={node.id}
          transform={translate(at(node.id))}
          dragologyZIndex={isHeld ? 5 : 0}
          dragologyEmergeFrom={node.emergeFrom}
          dragologyOnDrag={() => dragSpec(d, state, node.id, o)}
          style={{ cursor: "grab" }}
        >
          <circle r={o.hitR ?? 28} fill="transparent" />
          {node.children.length === 0 &&
            node.label !== "0" &&
            smallO(INK.blue, 3.4)}
          {glyph(node.label, node.id === red ? INK.red : INK.black)}
          {node.label === "0" && smallO(INK.blue, 3.4)}
        </g>,
      );
    }

    if (o.lens) els.push(...drawLens(o, state, d, held));

    return <g>{els}</g>;
  };
}

/**
 * The board's radial sketch: a lens showing just the moves of one node,
 * from its center. Its dot is draggable too: it sits wherever the node
 * has moved to relative to where the drag started, so dragging it is the
 * same drag as dragging the node, and the tree blends along with it.
 */
function drawLens(
  o: WBOptions,
  state: WBState,
  d: DragSpecBuilder<WBState>,
  held: string | null,
): Svgx[] {
  // `k` magnifies: the dot still follows the pointer, the tree moves 1/k as far
  const { c, r, k = 1 } = o.lens!;
  const who = held ?? state.focus;
  const originPos = layout(state.origin);
  const from = originPos.get(who);
  const now = layout(state.tree).get(who);
  const opts = from ? optionsFor(state.origin, who) : [];
  const reached = opts.findIndex((op) => op.tree === state.tree);
  const els: Svgx[] = [
    <path
      id="lens-ring"
      dragologyZIndex={-4}
      d={wobblyCircle(c, r)}
      fill="none"
      stroke={INK.blue}
      strokeWidth={5}
      strokeLinecap="round"
    />,
    <g id="lens-home" dragologyZIndex={-2} transform={translate(c)}>
      <circle
        r={13}
        fill="none"
        stroke={INK.gray}
        strokeWidth={2}
        strokeDasharray="3 5"
      />
    </g>,
  ];
  opts.forEach((op, i) => {
    const delta = layout(op.tree).get(who)!.sub(from!).mul(k);
    const tip = c.add(delta);
    const ink = reached === -1 ? 0.85 : i === reached ? 1 : 0.18;
    const path = arrowPath(c, tip, { trimA: 16, trimB: 11, side: 0, head: 11 });
    els.push(
      <g id={`lens-ar-${i}`} dragologyZIndex={-1} opacity={ink}>
        {path && (
          <path
            d={path.d}
            fill="none"
            stroke={INK.blue}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        <circle {...tip.cxy()} r={7.5} fill={INK.red} />
        {path &&
          label(
            op.rule.short,
            c
              .add(delta.mul(0.62))
              .add(path.normal.mul(path.normal.y > 0.2 ? 16 : -16)),
            INK.blue,
            20,
          )}
      </g>,
    );
  });
  const dot = from && now ? c.add(now.sub(from).mul(k)) : c;
  els.push(
    <g
      id={LENS_DOT}
      transform={translate(dot)}
      dragologyZIndex={6}
      dragologyOnDrag={() => dragSpec(d, state, state.focus, o)}
      style={{ cursor: "grab" }}
    >
      <circle r={22} fill="transparent" />
      <circle r={13} fill="#fbfbf9" stroke={INK.red} strokeWidth={4.5} />
      <circle r={5.5} fill={INK.blue} />
    </g>,
  );
  return els;
}

// # The drag: closest of betweens, one per rewrite

function dragSpec(
  d: DragSpecBuilder<WBState>,
  state: WBState,
  id: string,
  o: WBOptions,
): DragSpec<WBState> {
  const targets: WBState[] = optionsFor(state.tree, id).map((op) => ({
    tree: op.tree,
    origin: state.tree,
    focus: id,
  }));
  if (targets.length === 0) return d.between([state]);
  let spec = d
    .closest(
      targets.map((t) => d.between([state, t])),
      { lockPast: 20 },
    )
    .onDrop((s) => ({ ...s, origin: s.tree }));
  if (o.inkDebug)
    spec = spec.with(
      inkDebug(
        targets,
        optionsFor(state.tree, id).map((op) => op.rule),
        o.inkDebug.specAt,
      ),
    );
  return spec;
}

// # Dragology's view, in ink
//
// A modifier that draws what the drag is doing each frame: the line each
// `between` slides the held point along, which one `closest` picked, where
// the point is projected to, and its gap to the pointer, plus the spec,
// handwritten, with the live branch marked.

let inkCount = 0;

class InkDebugOp extends Modifier<WBState> {
  readonly name = "inkDebug";
  readonly start: Vec2 | null;
  readonly ends: (Vec2 | null)[];
  readonly prefix = `ink-${inkCount++}-`;

  constructor(
    ctx: DragInitContext<WBState>,
    inner: DragSpecData<WBState>,
    targets: WBState[],
    readonly rules: Rule[],
    readonly specAt: Vec2,
  ) {
    super(ctx, inner);
    this.start = getElementPositionCheap(ctx, ctx.startState);
    this.ends = targets.map((t) => getElementPositionCheap(ctx, t));
  }

  frame(frame: DragFrame): OpResult<WBState> {
    const result = this.inner.run(frame);
    // e.g. "onDrop/closest/2/between"
    const m = /closest\/(\d+)/.exec(result.activePath);
    const active = m ? parseInt(m[1]) : -1;
    const overlay = this.draw(
      frame.pointer,
      result.grabPos,
      result.gap,
      active,
    );
    const layer = layeredShiftZIndices(
      layeredPrefixIds(layerSvg(<g>{overlay}</g>), this.prefix),
      2000000,
    );
    return { ...result, preview: () => layeredMerge(result.preview(), layer) };
  }

  // Every mark has an id of its own (so its own layer) and the same shape
  // every frame: the drop spring blends the last frame's marks away, and
  // Dragology can only blend elements that match.
  draw(
    pointer: Vec2,
    grab: Vec2 | undefined,
    gap: number,
    active: number,
  ): Svgx {
    const { start, ends, rules, specAt } = this;
    const els: Svgx[] = [];
    if (start) {
      ends.forEach((end, i) => {
        if (!end) return;
        const on = i === active;
        els.push(
          <line
            id={`seg-${i}`}
            {...start.xy1()}
            {...end.xy2()}
            stroke={on ? rules[i].color : INK.black}
            strokeWidth={on ? 4 : 2.2}
            strokeLinecap="round"
            strokeDasharray={on ? "1 0" : "1 8"}
            opacity={on ? 0.9 : 0.45}
          />,
          <circle
            id={`end-${i}`}
            {...end.cxy()}
            r={on ? 7 : 4.5}
            fill="none"
            stroke={on ? rules[i].color : INK.black}
            strokeWidth={2.5}
            opacity={on ? 1 : 0.5}
          />,
        );
      });
    }
    const g = grab ?? start ?? pointer;
    const color = rules[active]?.color ?? INK.black;
    const n = pointer.sub(g).perp().norm();
    els.push(
      <line
        id="gap"
        {...pointer.xy1()}
        {...g.xy2()}
        stroke={INK.black}
        strokeWidth={2}
        strokeDasharray="5 5"
        strokeLinecap="round"
      />,
      <circle id="grab" {...g.cxy()} r={6.5} fill={color} />,
      <path
        id="pointer"
        transform={translate(pointer)}
        d="M -7 -7 L 7 7 M 7 -7 L -7 7"
        stroke={INK.black}
        strokeWidth={3}
        strokeLinecap="round"
      />,
      <g id="gap-label" opacity={gap > 14 ? 1 : 0}>
        {label(
          [`gap ${Math.round(gap)}`],
          pointer.lerp(g, 0.5).add(n.mul(n.y > 0 ? 16 : -16)),
          INK.black,
          18,
        )}
      </g>,
    );
    // The spec, handwritten
    const lh = 25;
    const line = (
      id: string,
      text: string,
      i: number,
      color: string,
      opacity = 1,
    ) => (
      <text
        id={id}
        transform={translate(specAt.add(Vec2(0, i * lh)))}
        fontFamily={HAND}
        fontSize={20}
        fill={color}
        opacity={opacity}
        dominantBaseline="central"
      >
        {text}
      </text>
    );
    els.push(line("spec-open", "d.closest([", 0, INK.black, 0.8));
    rules.forEach((rule, i) => {
      const on = i === active;
      els.push(
        line(
          `spec-${i}`,
          `d.between([now, ${rule.name}]),`,
          i + 1,
          on ? rule.color : INK.black,
          on ? 1 : 0.35,
        ),
      );
    });
    els.push(
      line("spec-close", "])", rules.length + 1, INK.black, 0.8),
      <path
        id="spec-mark"
        transform={translate(
          specAt.add(Vec2(-26, (Math.max(active, 0) + 1) * lh)),
        )}
        d="M 0 0 l 14 0 m -6 -6 l 6 6 l -6 6"
        stroke={color}
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={active >= 0 ? 1 : 0}
      />,
    );
    return <g>{els}</g>;
  }
}

const inkDebug = modifier(InkDebugOp);

// # Fitting a tree in a box

/**
 * Where to put the root, and how much to zoom, so that a tree and
 * everywhere its first moves could take it (or just `focus`'s moves) fit
 * in a `w`×`h` box (or the circle inscribed in it).
 */
export function fitTree(
  tree: Tree,
  w: number,
  h: number,
  {
    pad = 30,
    circle = false,
    maxZoom = 2.4,
    focus,
  }: { pad?: number; circle?: boolean; maxZoom?: number; focus?: string } = {},
): { root: Vec2; zoom: number; w: number; h: number } {
  const pts: Vec2[] = [...layout(tree).values()];
  for (const { node } of nodesOf(tree))
    if (focus === undefined || node.id === focus)
      for (const op of optionsFor(tree, node.id))
        pts.push(layout(op.tree).get(node.id)!);
  const lo = Vec2(
    Math.min(...pts.map((p) => p.x)),
    Math.min(...pts.map((p) => p.y)),
  );
  const hi = Vec2(
    Math.max(...pts.map((p) => p.x)),
    Math.max(...pts.map((p) => p.y)),
  );
  const mid = lo.lerp(hi, 0.5);
  let zoom: number;
  if (circle) {
    const rad = Math.max(...pts.map((p) => p.dist(mid))) + pad;
    zoom = Math.min(maxZoom, Math.min(w, h) / 2 / rad);
  } else {
    zoom = Math.min(
      maxZoom,
      w / (hi.x - lo.x + 2 * pad),
      h / (hi.y - lo.y + 2 * pad),
    );
  }
  const lw = w / zoom;
  const lh = h / zoom;
  return { root: Vec2(lw / 2, lh / 2).sub(mid), zoom, w: lw, h: lh };
}
