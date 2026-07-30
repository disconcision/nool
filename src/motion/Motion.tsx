/* Motion: retargetable box-snapshot animation layer.
 *
 * Replaces the View Transitions API. Around each model update we measure
 * per-id boxes of the stage nodes before and after, then animate flat
 * overlay clones from the before-boxes to the after-boxes while the real
 * scene is hidden. The origin of an in-flight animation is whatever is
 * currently displayed, so retargeting mid-flight never jumps. Layers are
 * flat (never nested) — see design/captured-geometry.md for why.
 */

export type Box = { x: number; y: number; w: number; h: number; font: number };

type Measured = { el: HTMLElement; box: Box; depth: number };

type Layer = {
  el: HTMLElement;
  from: Box;
  to: Box;
  fromOpacity: number;
  toOpacity: number;
  depth: number;
};

type Tween = {
  layers: Map<string, Layer>;
  start: number;
  duration: number;
  raf: number;
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
});

/* Analytic stand-in for the old cubic-bezier(0.68, -0.6, 0.32, 1.6) */
const easeInOutBack = (x: number): number => {
  const c1 = 1.70158;
  const c2 = c1 * 1.525;
  return x < 0.5
    ? (Math.pow(2 * x, 2) * ((c2 + 1) * 2 * x - c2)) / 2
    : (Math.pow(2 * x - 2, 2) * ((c2 + 1) * (x * 2 - 2) + c2) + 2) / 2;
};

const anim_factor = (): number => {
  const v = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--anim-factor")
  );
  return isNaN(v) ? 1 : v;
};

const stage_container = (): HTMLElement | null =>
  document.querySelector("#stage .node-container");

const node_depth = (el: HTMLElement, root: HTMLElement): number => {
  let d = 0;
  for (let p = el.parentElement; p && p !== root; p = p.parentElement)
    if (p.id.startsWith("node-")) d++;
  return d;
};

const measure = (): Map<string, Measured> => {
  const out = new Map<string, Measured>();
  const root = stage_container();
  if (!root) return out;
  const els = root.querySelectorAll<HTMLElement>('[id^="node-"], [id^="sym-"]');
  for (const el of Array.from(els)) {
    const r = el.getBoundingClientRect();
    const font = parseFloat(getComputedStyle(el).fontSize);
    out.set(el.id, {
      el,
      box: { x: r.x, y: r.y, w: r.width, h: r.height, font },
      depth: node_depth(el, root),
    });
  }
  return out;
};

/* A layer shows a node's own visuals only; id'd descendants are their own
 * layers, so they are stripped from the clone. Ids are stripped so clones
 * never shadow the real elements. */
const shallow_clone = (el: HTMLElement): HTMLElement => {
  const c = el.cloneNode(true) as HTMLElement;
  c.querySelectorAll('[id^="node-"], [id^="sym-"]').forEach((d) => d.remove());
  c.removeAttribute("id");
  c.querySelectorAll("[id]").forEach((d) => d.removeAttribute("id"));
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

const apply_frame = (layers: Map<string, Layer>, t: number): void => {
  for (const l of layers.values()) {
    const b = lerpBox(l.from, l.to, t);
    const s = l.el.style;
    s.left = `${b.x}px`;
    s.top = `${b.y}px`;
    s.width = `${b.w}px`;
    s.height = `${b.h}px`;
    s.fontSize = `${b.font}px`;
    s.opacity = `${clamp01(lerp(l.fromOpacity, l.toOpacity, t))}`;
  }
};

const eased_now = (tw: Tween): number =>
  easeInOutBack(clamp01((performance.now() - tw.start) / tw.duration));

const ensure_overlay = (): HTMLElement | null => {
  if (overlay && overlay.isConnected) return overlay;
  const main = document.getElementById("main");
  if (!main) return null;
  overlay = document.createElement("div");
  overlay.id = "motion-overlay";
  main.appendChild(overlay);
  return overlay;
};

const set_stage_hidden = (hidden: boolean): void => {
  const c = stage_container();
  if (c) c.style.visibility = hidden ? "hidden" : "";
};

const finish = (): void => {
  if (tween) {
    cancelAnimationFrame(tween.raf);
    tween = null;
  }
  if (overlay) overlay.replaceChildren();
  set_stage_hidden(false);
};

/* Run a model update, animating stage nodes from where they are displayed
 * now to where the update puts them. `apply` must update the DOM
 * synchronously (solid store writes do). */
export const animate = (apply: () => void, enabled: boolean): void => {
  if (!enabled || typeof document === "undefined") {
    apply();
    finish();
    return;
  }

  /* Before: what is currently displayed — the mid-flight blend if a tween
   * is active, else the live DOM. Exit layers need a visual source that
   * outlives the update: the previous clone, or a live element reference
   * (still cloneable after solid detaches it). */
  const before = new Map<
    string,
    { box: Box; opacity: number; depth: number }
  >();
  const exit_sources = new Map<string, HTMLElement>();
  const prev = tween;
  if (prev) {
    const t = eased_now(prev);
    for (const [id, l] of prev.layers) {
      const op = clamp01(lerp(l.fromOpacity, l.toOpacity, t));
      if (op < 0.01 && l.toOpacity === 0) continue; // fully-faded exit: drop
      before.set(id, { box: lerpBox(l.from, l.to, t), opacity: op, depth: l.depth });
      exit_sources.set(id, l.el);
    }
    cancelAnimationFrame(prev.raf);
    tween = null;
  } else {
    for (const [id, m] of measure()) {
      before.set(id, { box: m.box, opacity: 1, depth: m.depth });
      exit_sources.set(id, m.el);
    }
  }

  apply();

  const after = measure();

  /* No-change guard: skip the overlay when geometry is undisturbed. */
  if (!prev) {
    let changed = after.size !== before.size;
    if (!changed) {
      for (const [id, m] of after) {
        const b = before.get(id);
        if (
          !b ||
          Math.abs(b.box.x - m.box.x) > 0.5 ||
          Math.abs(b.box.y - m.box.y) > 0.5 ||
          Math.abs(b.box.w - m.box.w) > 0.5 ||
          Math.abs(b.box.h - m.box.h) > 0.5
        ) {
          changed = true;
          break;
        }
      }
    }
    if (!changed) return;
  }

  const ov = ensure_overlay();
  if (!ov) return;

  const layers = new Map<string, Layer>();
  for (const [id, m] of after) {
    const b = before.get(id);
    layers.set(id, {
      el: shallow_clone(m.el),
      from: b ? b.box : shrink(m.box, 0.5),
      to: m.box,
      fromOpacity: b ? b.opacity : 0,
      toOpacity: 1,
      depth: m.depth,
    });
  }
  for (const [id, b] of before) {
    if (after.has(id)) continue;
    const src = exit_sources.get(id);
    if (!src) continue;
    layers.set(id, {
      el: prev ? src : shallow_clone(src), // prev layers are already clones
      from: b.box,
      to: shrink(b.box, 0.8),
      fromOpacity: b.opacity,
      toOpacity: 0,
      depth: b.depth,
    });
  }

  /* Flat stacking: parents (shallower) paint below children (deeper). */
  const ordered = [...layers.values()].sort((a, b) => a.depth - b.depth);
  ov.replaceChildren(...ordered.map((l) => l.el));
  set_stage_hidden(true);

  tween = {
    layers,
    start: performance.now(),
    duration: 250 * anim_factor(),
    raf: 0,
  };
  apply_frame(layers, 0);

  const step = (): void => {
    if (!tween) return;
    const x = (performance.now() - tween.start) / tween.duration;
    if (x >= 1) {
      apply_frame(tween.layers, 1);
      finish();
      return;
    }
    apply_frame(tween.layers, easeInOutBack(clamp01(x)));
    tween.raf = requestAnimationFrame(step);
  };
  tween.raf = requestAnimationFrame(step);
};
