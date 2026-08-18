/* Motion: retargetable box-snapshot animation layer.
 *
 * Replaces the View Transitions API. Around each model update we measure
 * per-id boxes of the stage nodes before and after, then animate overlay
 * clones from the before-boxes to the after-boxes while the real scene is
 * hidden. The origin of an in-flight animation is whatever is currently
 * displayed, so retargeting mid-flight never jumps.
 *
 * Two drivers share all of the machinery:
 *  - animate(apply): clock-driven, wraps a model update (button clicks).
 *  - manual_start/set/release: pointer-driven (drags). The target boxes
 *    come from a hidden probe (see src/drag/Drag.tsx) instead of the live
 *    DOM. Committing mid-drag just calls animate(): it captures the manual
 *    blend as its origin, so the handoff is seamless.
 *
 * Layer granularity: subtrees that move RIGIDLY (uniform scale + translate,
 * no internal enter/exit) stay whole — one layer, full clone — so filters,
 * blend effects, shadows and descendant selectors apply to the composite
 * exactly as in the live DOM. Only genuinely deforming regions split into
 * per-node shallow layers; those are wrapped in display:contents "context
 * shells" carrying their real ancestor classes so descendant selectors and
 * CSS inheritance keep working, and ancestor filters are copied onto them.
 * See design/captured-geometry.md.
 */

export type Box = {
  x: number;
  y: number;
  w: number;
  h: number;
  font: number;
  /* optional per-layer rotation, degrees (projection rotation edges:
   * comp pills sweep; glyphs stay upright). Driven per frame like x/y. */
  rot?: number;
  /* optional target border-radius; interpolated per corner across the
   * tween (synthetic projection states carry the destination layout's
   * radii — continuity: small t, small shape change) */
  radius?: string;
  /* optional rotation pivot: the layer's center interpolates in POLAR
   * coordinates about this point (true rigid arcs, no waypoint seams) */
  pivot?: { x: number; y: number };
};

export type Measured = {
  el: HTMLElement;
  box: Box;
  depth: number;
  parentId: string | null;
};

type BeforeInfo = {
  box: Box;
  opacity: number;
  depth: number;
  parentId: string | null;
};

type Member = { rel: Box; depth: number; parentId: string | null };

type Layer = {
  el: HTMLElement; // the positioned clone (styles driven per frame)
  mount: HTMLElement; // outermost context shell (what goes in the overlay)
  from: Box;
  to: Box;
  fromOpacity: number;
  toOpacity: number;
  depth: number;
  parentId: string | null;
  members: Map<string, Member> | null; // group layers: contained ids
  /* "translate": size/font constant — base styles set once, per-frame motion
   * via the compositable `translate` property (rasterize once, no repaint).
   * `translate` rather than `transform` so clone animations (pulse-scale
   * etc., which animate transform) compose instead of clobbering it.
   * "box": size changes — left/top/size/font interpolated per frame. */
  mode: "translate" | "box";
  /* per-corner px radii for continuous interpolation (lazily computed on
   * first frame when the target box declares a radius; null = not needed) */
  radii?: { from: number[]; to: number[] } | null;
};

/* Branch-switch spring (dragology's default activePath transition: every
 * closest-branch change blends from the previously displayed scene toward
 * the new live-tracking pure display, 200ms cubic-out). Bounded, decaying
 * memory: the display provably reaches the pure function at expiry. */
type Glide = {
  boxes: Map<string, { box: Box; opacity: number }>;
  start: number;
  duration: number;
};

type Tween = {
  layers: Map<string, Layer>;
  start: number;
  duration: number;
  raf: number;
  /* per-tween easing; easeInOutBack when unset */
  ease?: (x: number) => number;
  /* present while a drag drives t directly; no clock runs */
  manual?: { t: number };
  glide?: Glide;
};

let overlay: HTMLElement | null = null;
let tween: Tween | null = null;

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const lerpBox = (a: Box, b: Box, t: number): Box => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
  w: lerp(a.w, b.w, t),
  h: lerp(a.h, b.h, t),
  font: lerp(a.font, b.font, t),
  ...(a.rot || b.rot ? { rot: lerp(a.rot ?? 0, b.rot ?? 0, t) } : {}),
});

/* A box at ±90° is the same visual as its dim-swapped upright twin; fold
 * captured blends into the nearest-upright form so a handoff after a
 * rotation morph reshapes instead of spinning back. */
const norm_rot = (b: Box): Box => {
  let out = b;
  while (out.rot && Math.abs(out.rot) > 45) {
    const s = out.rot > 0 ? -90 : 90;
    out = {
      ...out,
      x: out.x + out.w / 2 - out.h / 2,
      y: out.y + out.h / 2 - out.w / 2,
      w: out.h,
      h: out.w,
      rot: out.rot + s,
    };
  }
  if (out.rot && Math.abs(out.rot) < 0.5) {
    const { rot: _drop, ...rest } = out;
    out = rest;
  }
  return out;
};

/* Member boxes are stored relative to their group's to-box so they can be
 * reconstructed against any blended box on retarget. */
const rel_of = (m: Box, root: Box): Box => ({
  x: (m.x - root.x) / root.w,
  y: (m.y - root.y) / root.h,
  w: m.w / root.w,
  h: m.h / root.h,
  font: root.font > 0 ? m.font / root.font : 1,
});

const from_rel = (root: Box, r: Box): Box => ({
  x: root.x + r.x * root.w,
  y: root.y + r.y * root.h,
  w: r.w * root.w,
  h: r.h * root.h,
  font: r.font * root.font,
});

/* Analytic stand-in for the old cubic-bezier(0.68, -0.6, 0.32, 1.6) */
const easeInOutBack = (x: number): number => {
  const c1 = 1.70158;
  const c2 = c1 * 1.525;
  return x < 0.5
    ? (Math.pow(2 * x, 2) * ((c2 + 1) * 2 * x - c2)) / 2
    : (Math.pow(2 * x - 2, 2) * ((c2 + 1) * (x * 2 - 2) + c2) + 2) / 2;
};

/* Fast start, gentle landing — for retargeted glow hops, where most of
 * the travel must happen in the few frames before the next key repeat. */
const easeOutCubic = (x: number): number => 1 - Math.pow(1 - x, 3);

const anim_factor = (): number => {
  const v = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--anim-factor")
  );
  return isNaN(v) ? 1 : v;
};

const stage_container = (): HTMLElement | null =>
  document.querySelector("#stage .node-container");

/* Measure per-id boxes under a root; dx/dy shift the recorded coordinates
 * (used to align hidden probes with the live scene). */
export const measure_root = (
  root: HTMLElement,
  dx = 0,
  dy = 0
): Map<string, Measured> => {
  const out = new Map<string, Measured>();
  /* Freeze pulse/hover animations so boxes are measured at rest. */
  root.classList.add("motion-measuring");
  const els = root.querySelectorAll<HTMLElement>('[id^="node-"], [id^="sym-"]');
  for (const el of Array.from(els)) {
    let depth = 0;
    let parentId: string | null = null;
    for (let p = el.parentElement; p && p !== root; p = p.parentElement) {
      if (p.id.startsWith("node-")) {
        depth++;
        if (parentId === null) parentId = p.id;
      }
    }
    const r = el.getBoundingClientRect();
    const font = parseFloat(getComputedStyle(el).fontSize);
    out.set(el.id, {
      el,
      box: { x: r.x + dx, y: r.y + dy, w: r.width, h: r.height, font },
      depth,
      parentId,
    });
  }
  root.classList.remove("motion-measuring");
  return out;
};

const measure = (): Map<string, Measured> => {
  const root = stage_container();
  return root ? measure_root(root) : new Map();
};

const strip_ids = (c: HTMLElement): void => {
  c.removeAttribute("id");
  c.querySelectorAll("[id]").forEach((d) => d.removeAttribute("id"));
};

/* Shallow: the node's own visuals only; layered descendants are stripped. */
const shallow_clone = (el: HTMLElement): HTMLElement => {
  const c = el.cloneNode(true) as HTMLElement;
  c.querySelectorAll('[id^="node-"], [id^="sym-"]').forEach((d) => d.remove());
  strip_ids(c);
  c.classList.add("motion-layer");
  c.dataset.motionId = el.id;
  return c;
};

/* Full: the whole subtree, for rigidly-moving groups. */
const full_clone = (el: HTMLElement): HTMLElement => {
  const c = el.cloneNode(true) as HTMLElement;
  strip_ids(c);
  c.classList.add("motion-layer");
  c.dataset.motionId = el.id;
  return c;
};

const shrink = (b: Box, factor: number): Box => ({
  x: b.x + (b.w * (1 - factor)) / 2,
  y: b.y + (b.h * (1 - factor)) / 2,
  w: b.w * factor,
  h: b.h * factor,
  font: b.font * factor,
});

const set_base_box = (l: Layer): void => {
  const s = l.el.style;
  s.left = `${l.from.x}px`;
  s.top = `${l.from.y}px`;
  s.width = `${l.from.w}px`;
  s.height = `${l.from.h}px`;
  s.fontSize = `${l.from.font}px`;
  if (l.mode === "translate") {
    s.willChange = "translate, rotate, opacity";
  } else {
    s.translate = ""; // clear residue on reused (retargeted) elements
    s.willChange = "";
  }
};

/* CSS border-radius shorthand expansion + px resolution (em against the
 * box's font, % approximated against width). */
const expand_radius = (parts: string[]): string[] =>
  parts.length === 1
    ? [parts[0], parts[0], parts[0], parts[0]]
    : parts.length === 2
    ? [parts[0], parts[1], parts[0], parts[1]]
    : parts.length === 3
    ? [parts[0], parts[1], parts[2], parts[1]]
    : parts.slice(0, 4);

const radius_px = (v: string, w: number, font: number): number =>
  v.endsWith("em")
    ? parseFloat(v) * font
    : v.endsWith("%")
    ? (parseFloat(v) / 100) * w
    : parseFloat(v) || 0;

const layer_radii = (l: Layer): Layer["radii"] => {
  if (l.to.radius === undefined) return null;
  const cs = getComputedStyle(l.el);
  const from = [
    cs.borderTopLeftRadius,
    cs.borderTopRightRadius,
    cs.borderBottomRightRadius,
    cs.borderBottomLeftRadius,
  ].map((v) => radius_px(v.split(" ")[0], l.from.w, l.from.font));
  const to = expand_radius(l.to.radius.trim().split(/\s+/)).map((v) =>
    radius_px(v, l.to.w, l.to.font)
  );
  return { from, to };
};

const glide_ease = (x: number): number => 1 - Math.pow(1 - x, 3); // cubic-out

const glide_s = (g: Glide): number =>
  glide_ease(clamp01((performance.now() - g.start) / g.duration));

/* The pure blend for a layer at t — including the polar path when the
 * target carries a pivot (the center sweeps the arc; size/rot lerp). */
const pure_box = (l: Layer, t: number): Box => {
  const b = lerpBox(l.from, l.to, t);
  const P = l.to.pivot;
  if (P) {
    const c0x = l.from.x + l.from.w / 2;
    const c0y = l.from.y + l.from.h / 2;
    const c1x = l.to.x + l.to.w / 2;
    const c1y = l.to.y + l.to.h / 2;
    const a0 = Math.atan2(c0y - P.y, c0x - P.x);
    let da = Math.atan2(c1y - P.y, c1x - P.x) - a0;
    if (da > Math.PI) da -= 2 * Math.PI;
    if (da < -Math.PI) da += 2 * Math.PI;
    const r = lerp(
      Math.hypot(c0x - P.x, c0y - P.y),
      Math.hypot(c1x - P.x, c1y - P.y),
      t
    );
    const a = a0 + da * t;
    b.x = P.x + r * Math.cos(a) - b.w / 2;
    b.y = P.y + r * Math.sin(a) - b.h / 2;
  }
  return b;
};

/* The DISPLAYED box/opacity: the pure blend, pulled toward the
 * branch-switch snapshot while a glide is decaying. */
const display_of = (
  id: string,
  l: Layer,
  t: number,
  g: Glide | undefined
): { box: Box; opacity: number } => {
  const box = pure_box(l, t);
  const opacity = clamp01(lerp(l.fromOpacity, l.toOpacity, t));
  const gb = g?.boxes.get(id);
  if (!g || !gb) return { box, opacity };
  const s = glide_s(g);
  return {
    box: lerpBox(box, gb.box, 1 - s),
    opacity: lerp(opacity, gb.opacity, 1 - s),
  };
};

const apply_frame = (layers: Map<string, Layer>, t: number): void => {
  const glide = tween && layers === tween.layers ? tween.glide : undefined;
  for (const [id, l] of layers.entries()) {
    const d = display_of(id, l, t, glide);
    const b = d.box;
    const s = l.el.style;
    if (l.mode === "translate") {
      s.translate = `${b.x - l.from.x}px ${b.y - l.from.y}px`;
    } else {
      s.left = `${b.x}px`;
      s.top = `${b.y}px`;
      s.width = `${b.w}px`;
      s.height = `${b.h}px`;
      s.fontSize = `${b.font}px`;
    }
    /* the standalone rotate property composes with both the translate
     * property and transform-animating clone styles */
    s.rotate = b.rot ? `${b.rot}deg` : "";
    if (l.radii === undefined) l.radii = layer_radii(l);
    if (l.radii)
      s.borderRadius = l.radii.from
        .map((f, i) => `${lerp(f, l.radii!.to[i], t)}px`)
        .join(" ");
    s.opacity = `${d.opacity}`;
  }
};

const layer_mode = (from: Box, to: Box): "translate" | "box" =>
  Math.abs(from.w - to.w) < 0.5 &&
  Math.abs(from.h - to.h) < 0.5 &&
  Math.abs(from.font - to.font) < 0.5
    ? "translate"
    : "box";

const eased_now = (tw: Tween): number =>
  tw.manual
    ? tw.manual.t
    : (tw.ease ?? easeInOutBack)(
        clamp01((performance.now() - tw.start) / tw.duration)
      );

const ensure_overlay = (): HTMLElement | null => {
  /* The overlay lives INSIDE the (hidden) stage container so clones keep
   * the full cascade context; layers punch back through with
   * visibility:visible. */
  const container = stage_container();
  if (!container) return null;
  if (!overlay || !overlay.isConnected) {
    overlay = document.createElement("div");
    overlay.id = "motion-overlay";
  }
  if (overlay.parentElement !== container) container.appendChild(overlay);
  return overlay;
};

/* The real content is dimmed (opacity ~0) rather than visibility-hidden so
 * its texture stays rasterized: revealing it at teardown is then a pure
 * compositor operation instead of a full repaint (which measured ~120ms). */
const set_stage_dimmed = (dimmed: boolean): void => {
  const c = stage_container();
  if (c) c.classList.toggle("motion-dimmed", dimmed);
};

/* Cached selection glow styling, for morphing to "unselected". */
let sel_style: { outline: string; boxShadow: string; radius: string } | null =
  null;

const finish = (): void => {
  if (tween) {
    cancelAnimationFrame(tween.raf);
    tween = null;
  }
  if (overlay) overlay.replaceChildren();
  set_stage_dimmed(false);
  stage_container()?.classList.remove("selection-morphing");
};

/* What is currently displayed — the mid-flight blend if a tween is active,
 * else the live DOM. Group members are reconstructed from their stored
 * group-relative boxes. Consumes (cancels) any active tween. */
const capture_before = (): {
  before: Map<string, BeforeInfo>;
  exit_sources: Map<string, HTMLElement>;
  prev: Tween | null;
  /* true when `before` came from a consumed full morph's overlay layers —
   * their els may be adopted as exit clones. False when `before` is a live
   * measurement (no tween, or only the synthetic glow was in flight). */
  reuse_exits: boolean;
  /* mid-flight box of an interrupted selection-glow layer, for retargeting */
  glow_box: Box | null;
} => {
  const before = new Map<string, BeforeInfo>();
  const exit_sources = new Map<string, HTMLElement>();
  const prev = tween;
  let glow_box: Box | null = null;
  if (prev) {
    const t = eased_now(prev);
    for (const [id, l] of prev.layers) {
      if (id === "@selection") {
        /* synthetic glow layer, not a node: capture its blend so the next
         * selection morph can pick up where it left off, but keep it out
         * of the node before-state */
        glow_box = lerpBox(l.from, l.to, t);
        continue;
      }
      const d = display_of(id, l, t, prev.glide);
      const op = d.opacity;
      if (op < 0.01 && l.toOpacity === 0) continue; // fully-faded exit: drop
      const blend = norm_rot(d.box);
      before.set(id, { box: blend, opacity: op, depth: l.depth, parentId: l.parentId });
      exit_sources.set(id, l.el);
      if (l.members)
        for (const [mid, m] of l.members)
          before.set(mid, {
            box: from_rel(blend, m.rel),
            opacity: op,
            depth: m.depth,
            parentId: m.parentId,
          });
    }
    cancelAnimationFrame(prev.raf);
    tween = null;
  }
  const reuse_exits = before.size > 0;
  if (!reuse_exits) {
    /* No real node layers in flight — the live DOM is fully painted and
     * authoritative. (Capturing a glow-only tween's layers here instead
     * made every node read as an enter: the stage dimmed and faded back
     * in on each rapid selection change.) */
    for (const [id, m] of measure()) {
      before.set(id, { box: m.box, opacity: 1, depth: m.depth, parentId: m.parentId });
      exit_sources.set(id, m.el);
    }
  }
  return { before, exit_sources, prev, reuse_exits, glow_box };
};

/* Provenance-driven enter/exit geometry (the demo's emergeFrom/emergeMode,
 * adapted). Two enter modes: "clone" (a duplicate of an existing node —
 * appears full-size AT its original and separates) and "grow" (genuinely
 * new — scales up from almost nothing at its source). Two exit modes:
 * "merge" (an identical twin survives — travels to coincide with it, no
 * fade) and "absorb" (genuinely deleted — shrinks into its target while
 * fading). */
export type EmergeSpec = { source: string; mode: "clone" | "grow" };
export type ConvergeSpec = { target: string; mode: "merge" | "absorb" };
export type EmergeOpts = {
  emerge?: Map<string, EmergeSpec>;
  converge?: Map<string, ConvergeSpec>;
  /* memoryless drags (dragology semantics): the tween's origin is THIS
   * state — the grab-time base — not the captured in-flight blend. Track
   * switches become crisp re-evaluations of a pure function instead of
   * accumulating history. (Capture-the-blend remains the default: it is
   * what commits and clock morphs landing mid-flight want.) */
  origin?: Map<string, Measured>;
  /* with origin: spring from the previously displayed scene toward the
   * new pure display (dragology's default branch transition) */
  glide?: boolean;
  /* skip rigid-subtree grouping (weight-field driving needs every node
   * individually addressable) */
  flat?: boolean;
};

/* Build the flat layer set morphing `before` (blend/live boxes) into
 * `after` (measured target: live DOM or a hidden probe). */
const build_layers = (
  before: Map<string, BeforeInfo>,
  after: Map<string, Measured>,
  exit_sources: Map<string, HTMLElement>,
  reuse_exit_els: boolean,
  opts?: EmergeOpts
): Map<string, Layer> => {
  /* Adjacency for the after and before structures. */
  const after_kids = new Map<string | null, string[]>();
  for (const [id, m] of after) {
    const arr = after_kids.get(m.parentId) ?? [];
    arr.push(id);
    after_kids.set(m.parentId, arr);
  }
  const before_kids = new Map<string | null, string[]>();
  for (const [id, b] of before) {
    const arr = before_kids.get(b.parentId) ?? [];
    arr.push(id);
    before_kids.set(b.parentId, arr);
  }
  const descendants = (id: string, kids: Map<string | null, string[]>): string[] => {
    const out = [id];
    for (const k of kids.get(id) ?? []) out.push(...descendants(k, kids));
    return out;
  };

  /* A subtree is rigid when every before-descendant survives in place and
   * every member's box maps through the root's (uniform) scale+translate. */
  const subtree_rigid = (rootId: string): string[] | null => {
    if (opts?.flat) return null;
    const rb = before.get(rootId);
    const ra = after.get(rootId);
    if (!rb || !ra || rb.box.w <= 0 || rb.box.h <= 0) return null;
    const sw = ra.box.w / rb.box.w;
    const sh = ra.box.h / rb.box.h;
    if (Math.abs(sw - sh) > 0.02) return null;
    const members = descendants(rootId, after_kids);
    if (descendants(rootId, before_kids).length !== members.length) return null;
    for (const id of members) {
      const b = before.get(id);
      const a = after.get(id);
      if (!b || !a || b.opacity < 0.999) return null;
      if (
        Math.abs(ra.box.x + (b.box.x - rb.box.x) * sw - a.box.x) > 1 ||
        Math.abs(ra.box.y + (b.box.y - rb.box.y) * sh - a.box.y) > 1 ||
        Math.abs(b.box.w * sw - a.box.w) > 1 ||
        Math.abs(b.box.h * sh - a.box.h) > 1 ||
        Math.abs(b.box.font * sw - a.box.font) > 1
      )
        return null;
    }
    return members;
  };

  /* Context shells: display:contents wrappers carrying the real ancestor
   * classes, so descendant selectors and inheritance work on clones. */
  const parent_chain = (parentId: string | null): string[] => {
    const chain: string[] = [];
    for (let p = parentId; p; ) {
      chain.push(p);
      p = after.get(p)?.parentId ?? before.get(p)?.parentId ?? null;
    }
    return chain; // innermost first
  };
  const mount_with_shells = (
    layerEl: HTMLElement,
    parentId: string | null
  ): HTMLElement => {
    let mount = layerEl;
    for (const p of parent_chain(parentId)) {
      const src = after.get(p)?.el;
      const shell = document.createElement("div");
      shell.className = (src ? src.className + " " : "") + "motion-shell";
      shell.appendChild(mount);
      mount = shell;
    }
    return mount;
  };

  /* Ancestor filters don't reach clones through display:contents shells;
   * copy them onto the layer (pixel-wise color filters compose well). */
  const with_ancestor_filters = (
    layerEl: HTMLElement,
    sourceEl: HTMLElement | null,
    parentId: string | null
  ): void => {
    const ancestor_fs: string[] = [];
    for (const p of parent_chain(parentId)) {
      const el = after.get(p)?.el;
      if (!el) continue;
      const f = getComputedStyle(el).filter;
      if (f && f !== "none") ancestor_fs.push(f);
    }
    if (ancestor_fs.length === 0) return; // own class filter already applies
    const own =
      sourceEl && sourceEl.isConnected ? getComputedStyle(sourceEl).filter : "";
    layerEl.style.filter = [own !== "none" ? own : "", ...ancestor_fs]
      .filter(Boolean)
      .join(" ");
  };

  const layers = new Map<string, Layer>();

  const walk = (id: string): void => {
    const a = after.get(id)!;
    const b = before.get(id);
    const group = b ? subtree_rigid(id) : null;
    if (group && group.length > 1) {
      const el = full_clone(a.el);
      with_ancestor_filters(el, a.el, a.parentId);
      const members = new Map<string, Member>();
      for (const mid of group) {
        if (mid === id) continue;
        const m = after.get(mid)!;
        members.set(mid, {
          rel: rel_of(m.box, a.box),
          depth: m.depth,
          parentId: m.parentId,
        });
      }
      layers.set(id, {
        el,
        mount: mount_with_shells(el, a.parentId),
        from: b!.box,
        to: a.box,
        fromOpacity: b!.opacity,
        toOpacity: 1,
        depth: a.depth,
        parentId: a.parentId,
        members,
        mode: layer_mode(b!.box, a.box),
      });
      return;
    }
    const el = shallow_clone(a.el);
    with_ancestor_filters(el, a.el, a.parentId);
    /* enters with an emerge source start at (clone) or grow out of (grow)
     * the source's box, fully visible — creation reads as pulling out or
     * scaling up, not fading in */
    const spec = b ? undefined : opts?.emerge?.get(id);
    const srcBox = spec ? before.get(spec.source)?.box : undefined;
    const from = b
      ? b.box
      : srcBox
      ? spec!.mode === "grow"
        ? shrink(srcBox, 0.15)
        : srcBox
      : shrink(a.box, 0.5);
    layers.set(id, {
      el,
      mount: mount_with_shells(el, a.parentId),
      from,
      to: a.box,
      fromOpacity: b ? b.opacity : srcBox ? 1 : 0,
      toOpacity: 1,
      /* emerging nodes sit slightly behind established ones, so creation
       * reads as coming out from behind */
      depth: !b && srcBox ? a.depth - 0.4 : a.depth,
      parentId: a.parentId,
      members: null,
      mode: layer_mode(from, a.box),
    });
    for (const k of after_kids.get(id) ?? []) walk(k);
  };
  for (const r of after_kids.get(null) ?? []) walk(r);

  /* Exits: per-node layers, exactly dual to enters. With a converge target,
   * merges travel to coincide with the surviving twin (full opacity) and
   * absorptions shrink into the target's box (full opacity — the dual of
   * grow); nothing fades. Without provenance (click-path), fall back to
   * fade-in-place. */
  for (const [id, b] of before) {
    if (after.has(id)) continue;
    const src = exit_sources.get(id);
    if (!src) continue;
    const el = reuse_exit_els ? src : shallow_clone(src);
    with_ancestor_filters(el, null, b.parentId);
    const cv = opts?.converge?.get(id);
    const tgtBox = cv ? after.get(cv.target)?.box : undefined;
    layers.set(id, {
      el,
      mount: mount_with_shells(el, b.parentId),
      from: b.box,
      to: tgtBox
        ? cv!.mode === "absorb"
          ? shrink(tgtBox, 0.15)
          : tgtBox
        : shrink(b.box, 0.8),
      fromOpacity: b.opacity,
      toOpacity: tgtBox ? 1 : 0,
      /* Nudge below same-depth survivors: when a wrapper is eliminated its
       * child takes its old depth, and the receding ghost (often a large
       * tinted box) must paint UNDER the arriving content, not over it. */
      depth: b.depth - 0.25,
      parentId: b.parentId,
      members: null,
      mode: "box",
    });
  }

  return layers;
};

const mount_layers = (layers: Map<string, Layer>, dim: boolean): boolean => {
  const ov = ensure_overlay();
  if (!ov) return false;
  const ordered = [...layers.values()].sort((a, b) => a.depth - b.depth);
  ov.replaceChildren(...ordered.map((l) => l.mount));
  if (dim) set_stage_dimmed(true);
  for (const l of layers.values()) set_base_box(l);
  return true;
};

const start_clock = (duration: number, immediate = false): void => {
  if (!tween) return;
  tween.duration = duration;
  const step = (): void => {
    if (!tween) return;
    const x = (performance.now() - tween.start) / tween.duration;
    if (x >= 1) {
      apply_frame(tween.layers, 1);
      finish();
      return;
    }
    apply_frame(tween.layers, (tween.ease ?? easeInOutBack)(clamp01(x)));
    tween.raf = requestAnimationFrame(step);
  };
  /* Immediate: no warm-up, for cheap single-layer tweens that may only
   * get a frame or two before being retargeted again (key repeat). */
  if (immediate) {
    tween.raf = requestAnimationFrame(step);
    return;
  }
  /* The first painted frame pays the layer rasterization cost (tens of ms).
   * Start the clock only after it has presented — otherwise the first
   * visible frame lands mid-curve and the animation's opening is skipped. */
  tween.raf = requestAnimationFrame(() => {
    if (!tween) return;
    tween.raf = requestAnimationFrame(() => {
      if (!tween) return;
      tween.start = performance.now();
      step();
    });
  });
};

const run_tween = (
  layers: Map<string, Layer>,
  duration: number,
  dim: boolean,
  opts?: { ease?: (x: number) => number; immediate?: boolean }
): void => {
  if (!mount_layers(layers, dim)) return;
  tween = { layers, start: performance.now(), duration, raf: 0, ease: opts?.ease };
  apply_frame(layers, 0);
  start_clock(duration, opts?.immediate);
};

/* Run a model update, animating stage nodes from where they are displayed
 * now to where the update puts them. `apply` must update the DOM
 * synchronously (solid store writes do). `mk_opts`, when given, supplies
 * emerge/converge provenance for the morph from the before/after box
 * maps — the click-path twin of the drag path's candidate provenance. */
export const animate = (
  apply: () => void,
  enabled: boolean,
  mk_opts?: (
    before: ReadonlyMap<string, unknown>,
    after: ReadonlyMap<string, unknown>
  ) => EmergeOpts
): void => {
  if (!enabled || typeof document === "undefined") {
    apply();
    finish();
    return;
  }

  const pre_selected =
    stage_container()?.querySelector(".node.selected")?.id ?? null;

  const { before, exit_sources, prev, reuse_exits, glow_box } =
    capture_before();

  apply();

  const after = measure();

  /* Keep the selection glow styling cached while a selected node exists —
   * but not mid-morph: the selection-morphing class suppresses the live
   * glow, so capturing then would cache an invisible style and rapid
   * selection changes would travel an invisible outline. */
  const post_selected_el =
    stage_container()?.querySelector<HTMLElement>(".node.selected") ?? null;
  const post_selected = post_selected_el?.id ?? null;
  if (
    post_selected_el &&
    !stage_container()?.classList.contains("selection-morphing")
  ) {
    const cs = getComputedStyle(post_selected_el);
    sel_style = {
      outline: cs.outline,
      boxShadow: cs.boxShadow,
      radius: cs.borderRadius,
    };
  }

  /* No-change guard: skip the overlay when geometry is undisturbed. A pure
   * selection change still gets a morph: a synthetic glow layer travels
   * from the old selected node's box to the new one's (the live glow is
   * suppressed meanwhile), recreating the old view-transition effect.
   * `before` is a live measurement whenever reuse_exits is false, so the
   * comparison is meaningful even when a glow-only tween was consumed. */
  if (!reuse_exits) {
    let changed = after.size !== before.size;
    if (!changed) {
      /* 1.5px: selection border/outline changes jiggle boxes by ~1px; a
       * full morph for that is invisible-but-costly, and it would shadow
       * the selection-glow morph below. */
      for (const [id, m] of after) {
        const b = before.get(id);
        if (
          !b ||
          Math.abs(b.box.x - m.box.x) > 1.5 ||
          Math.abs(b.box.y - m.box.y) > 1.5 ||
          Math.abs(b.box.w - m.box.w) > 1.5 ||
          Math.abs(b.box.h - m.box.h) > 1.5
        ) {
          changed = true;
          break;
        }
      }
    }
    if (!changed) {
      /* Run the glow morph when the selection changed, or when an
       * interrupted glow still needs to finish traveling (e.g. held
       * arrow keys at the edge of the tree re-trigger no-op updates). */
      if ((pre_selected !== post_selected || glow_box) && sel_style) {
        /* Retarget from the interrupted glow's mid-flight box when there
         * is one, so rapid selection changes read as one continuous
         * outline chasing the selection. */
        const root_box = main_box();
        const from_box =
          glow_box ??
          (pre_selected ? before.get(pre_selected)?.box : undefined) ??
          root_box;
        const to_box =
          (post_selected ? after.get(post_selected)?.box : undefined) ??
          root_box;
        if (from_box || to_box) {
          stage_container()?.classList.add("selection-morphing");
          /* Retargets (key repeat) get a short, fast-starting hop with no
           * warm-up — un-scaled by anim factor, since keeping up with the
           * input is responsiveness, not spectacle. The outline then rides
           * about a hop behind and settles when the keys stop. */
          const retarget = !!glow_box;
          run_tween(
            new Map([["@selection", mk_selection_layer(from_box, to_box)]]),
            retarget ? 120 : 200 * anim_factor(),
            false,
            retarget ? { ease: easeOutCubic, immediate: true } : undefined
          );
          return;
        }
      }
      /* Consumed a tween but ran nothing in its place: tear down so the
       * live DOM (and its selection glow) isn't left suppressed. */
      if (prev) finish();
      return;
    }
  }

  const layers = build_layers(
    before,
    after,
    exit_sources,
    reuse_exits,
    mk_opts?.(before, after)
  );
  /* When a full morph MOVES the selection between nodes, the glow rides
   * it as its own layer: clones bake in the post-state's .selected
   * decoration, which would otherwise flash fully-formed on a node still
   * mid-flight (factoring: a times turns white instantly, then travels).
   * Suppress the baked decoration (selection-morphing — heads' pulse
   * included, see CSS) and fly the glow frame from the old selected box
   * to the new one; it lands exactly as the live decoration returns at
   * teardown. Unselecting morphs (undo) send it out to the window, per
   * the root metaphor. A STATIONARY selection (commute at the selected
   * node: same node, only its children rearrange) keeps its baked
   * decoration riding the clone — that's the truthful rendering, and
   * suppressing it read as the highlight flickering off. */
  if (sel_style && (pre_selected !== post_selected || glow_box)) {
    const root_box = main_box();
    const from_box =
      glow_box ??
      (pre_selected ? before.get(pre_selected)?.box : undefined) ??
      root_box;
    const to_box =
      (post_selected ? after.get(post_selected)?.box : undefined) ?? root_box;
    if (from_box || to_box) {
      layers.set("@selection", mk_selection_layer(from_box, to_box));
      stage_container()?.classList.add("selection-morphing");
    }
  }
  run_tween(layers, 250 * anim_factor(), true);
};

/* With no node selected the root (#main — the whole window) IS the
 * selection: glows expand out to the window's box on unselect and shrink
 * back down from it on select. (The outline ends up just past the
 * viewport edge, where #main's own permanent white outline conceptually
 * lives.) */
const main_box = (): Box | undefined => {
  const el = document.getElementById("main");
  if (!el) return undefined;
  const r = el.getBoundingClientRect();
  return {
    x: r.x,
    y: r.y,
    w: r.width,
    h: r.height,
    font: parseFloat(getComputedStyle(el).fontSize),
  };
};

const mk_selection_layer = (
  from_box: Box | undefined,
  to_box: Box | undefined
): Layer => {
  const el = document.createElement("div");
  el.className = "motion-layer motion-selection";
  if (sel_style) {
    el.style.outline = sel_style.outline;
    el.style.boxShadow = sel_style.boxShadow;
    el.style.borderRadius = sel_style.radius;
  }
  el.dataset.motionId = "@selection";
  const from = from_box ?? to_box!;
  const to = to_box ?? from_box!;
  return {
    el,
    mount: el,
    from,
    to,
    fromOpacity: from_box ? 1 : 0,
    toOpacity: to_box ? 1 : 0,
    depth: 999,
    parentId: null,
    members: null,
    mode: layer_mode(from, to),
  };
};

// # Manual (pointer-driven) mode — drags

/* Begin a pointer-driven morph from the current display toward `after`
 * (typically a hidden-probe measurement of a candidate state). Retargeting
 * to a different candidate mid-drag: just call again — the current blend
 * becomes the new origin. */
export const manual_start = (
  after: Map<string, Measured>,
  opts?: EmergeOpts
): boolean => {
  let before: Map<string, BeforeInfo>;
  let exit_sources: Map<string, HTMLElement>;
  let reuse_exits: boolean;
  let pending_glide: Glide["boxes"] | undefined;
  if (opts?.origin) {
    /* memoryless: discard the in-flight tween, originate at the base —
     * but first snapshot the displayed scene for the branch-switch
     * spring (dragology's default activePath transition) */
    if (tween) {
      if (opts.glide && tween.manual) {
        const t = eased_now(tween);
        pending_glide = new Map();
        for (const [id, l] of tween.layers)
          pending_glide.set(id, display_of(id, l, t, tween.glide));
      }
      cancelAnimationFrame(tween.raf);
      tween = null;
    }
    before = new Map();
    exit_sources = new Map();
    opts.origin.forEach((m, id) => {
      before.set(id, {
        box: m.box,
        opacity: 1,
        depth: m.depth,
        parentId: m.parentId,
      });
      exit_sources.set(id, m.el);
    });
    reuse_exits = false;
  } else {
    ({ before, exit_sources, reuse_exits } = capture_before());
  }
  if (before.size === 0) {
    /* a silent false here leaves the previous overlay frozen — if the
     * "stuck mid-blend drag" ever recurs, look for this warning */
    console.warn("manual_start: empty before-capture; drag will not animate");
    return false;
  }
  const layers = build_layers(before, after, exit_sources, reuse_exits, opts);
  if (!mount_layers(layers, true)) {
    console.warn("manual_start: overlay mount failed; drag will not animate");
    return false;
  }
  tween = {
    layers,
    start: performance.now(),
    duration: 1,
    raf: 0,
    manual: { t: 0 },
  };
  if (pending_glide) {
    tween.glide = {
      boxes: pending_glide,
      start: performance.now(),
      duration: 200,
    };
    start_glide_clock();
  }
  apply_frame(layers, 0);
  return true;
};

/* The spring must advance even when the pointer is still: run a small
 * clock while a glide is decaying, re-applying at the current manual t. */
const start_glide_clock = (): void => {
  const tw = tween;
  if (!tw) return;
  const step = (): void => {
    if (tween !== tw || !tw.manual || !tw.glide) return;
    if (performance.now() - tw.glide.start >= tw.glide.duration) {
      tw.glide = undefined;
      apply_frame(tw.layers, tw.manual.t);
      return;
    }
    apply_frame(tw.layers, tw.manual.t);
    tw.raf = requestAnimationFrame(step);
  };
  tw.raf = requestAnimationFrame(step);
};

export const manual_set = (t: number): void => {
  if (!tween?.manual) return;
  tween.manual.t = clamp01(t);
  apply_frame(tween.layers, tween.manual.t);
};

/* Weight-field driving (the Blend mechanic): no tracks, no dispatch — the
 * scene is a weighted mixture over states[0] (the base) and the candidate
 * states. Layers build once (flat: every node individually driven); the
 * returned setter writes each layer's `to` as the mixture and pins t=1, so
 * the ordinary machinery (release back to base, commit picking up the
 * blend as its origin) keeps working unchanged. All states must share the
 * same node set (projection pulls do; rewrites do not). */
export const manual_field = (
  states: Map<string, Measured>[]
): ((weights: number[]) => void) | null => {
  const base = states[0];
  if (!manual_start(states[1] ?? base, { origin: base, flat: true }))
    return null;
  const tw = tween!;
  for (const l of tw.layers.values()) {
    l.mode = "box"; // sizes vary under the mixture
    l.el.style.willChange = "";
    l.el.style.translate = "";
  }
  return (weights: number[]): void => {
    if (tween !== tw || !tw.manual) return;
    for (const [id, l] of tw.layers) {
      let x = 0;
      let y = 0;
      let w = 0;
      let h = 0;
      let font = 0;
      let rot = 0;
      states.forEach((s, i) => {
        const b = (s.get(id) ?? base.get(id))?.box;
        if (!b) return;
        const wt = weights[i];
        x += wt * b.x;
        y += wt * b.y;
        w += wt * b.w;
        h += wt * b.h;
        font += wt * b.font;
        rot += wt * (b.rot ?? 0);
      });
      l.to = { x, y, w, h, font, ...(rot ? { rot } : {}) };
    }
    tw.manual.t = 1;
    apply_frame(tw.layers, 1);
  };
};

export const manual_t = (): number => tween?.manual?.t ?? 0;

/* Release without committing: clock-tween from the current blend back to
 * where things were. (To commit, just inject the action — animate() picks
 * the blend up as its origin.) */
export const manual_release = (): void => {
  if (!tween?.manual) return;
  const t = tween.manual.t;
  for (const [id, l] of tween.layers.entries()) {
    const d = display_of(id, l, t, tween.glide);
    l.to = l.from;
    l.toOpacity = l.fromOpacity;
    l.from = d.box;
    l.fromOpacity = d.opacity;
    l.mode = layer_mode(l.from, l.to);
    set_base_box(l);
  }
  tween.glide = undefined;
  tween.manual = undefined;
  tween.start = performance.now();
  apply_frame(tween.layers, 0);
  start_clock(200 * anim_factor());
};
