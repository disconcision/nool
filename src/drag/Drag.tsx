/* Drag: whole-scene morph dragging (plan steps 2-3).
 *
 * Grabbing a stage node (drag mode on) enumerates the states reachable by
 * applying enabled transforms at that node, renders each candidate into a
 * hidden probe inside #stage, and batch-measures per-id boxes. Probes stay
 * alive for the drag so their elements can be cloned into motion layers.
 *
 * Dragging is closest-of-betweens over the candidates (dragology's algebra
 * on measured boxes): the pointer projects onto the segment from the grab
 * point to each candidate's anchor (the grabbed node's would-be position);
 * the nearest segment wins and its t drives Motion's manual mode, morphing
 * the whole scene toward that candidate. Release past t=0.5 commits (the
 * blend hands off seamlessly to the commit animation); otherwise the scene
 * springs back. See design/captured-geometry.md.
 */
import { render } from "solid-js/web";
import * as Model from "./../Model";
import * as Statics from "./../Statics";
import * as Settings from "./../Settings";
import * as Action from "./../Action";
import * as Exp from "./../syntax/Exp";
import * as ID from "./../syntax/ID";
import * as Motion from "./../motion/Motion";
import { at_path, flip, Transform } from "./../Transform";
import { depth, freshen } from "./../syntax/Node";
import { ViewOnly } from "./../view/ExpView";

export type Candidate = {
  transform: Transform;
  idx: number; // index into tools.transforms
  reversed: boolean;
  site: number[]; // path the transform applies at (the grab or an ancestor)
  exp: Exp.t;
  measured: Map<string, Motion.Measured>;
  dispose: () => void;
  /* grabbed node's box in this candidate (always present: candidates where
   * the grab vanishes are not offered — like the demo, triggers survive) */
  anchor: Motion.Box;
};

/* Must mirror StageView's depth-derived scale. */
const stage_scale = (d: number) => (d == 0 ? 1 : 4 / (d + 1));

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/* Which tools generate drag candidates. Temporarily narrowed to
 * commutativity and distributivity while the interaction is tuned; null
 * means all tools. (The eventual mechanism is the enabled-rules loadout —
 * see design/captured-geometry.md, "Rule gating".) */
const DRAG_TOOL_IDXS: number[] | null = [1, 5, 7];

/* All states reachable by applying an enabled transform (either direction)
 * at the grabbed node OR any of its ancestors, ids preserved, structurally
 * deduplicated. Ancestor sites are what make dragging feel right: commuting
 * a parent doesn't move the parent, it moves its operands — so the operand
 * is what you grab, and its anchor is what travels. (Rules at sites where
 * the grab doesn't move are filtered later by minimum travel.) */
export const enumerate = (
  model: Model.t,
  grabbedId: ID.t
): {
  transform: Transform;
  idx: number;
  reversed: boolean;
  site: number[];
  exp: Exp.t;
}[] => {
  const path = Statics.get(model.stage.info, grabbedId).path;
  const sites: number[][] = [];
  for (let n = path.length; n >= 0; n--) sites.push(path.slice(0, n));
  const out: {
    transform: Transform;
    idx: number;
    reversed: boolean;
    site: number[];
    exp: Exp.t;
  }[] = [];
  for (const site of sites) {
    model.tools.transforms.forEach((t, idx) => {
      if (DRAG_TOOL_IDXS && !DRAG_TOOL_IDXS.includes(idx)) return;
      for (const [transform, reversed] of [
        [t, false],
        [flip(t), true],
      ] as const) {
        const r = at_path(transform, site)(model.stage.exp);
        if (r === "NoMatch") continue;
        const exp = freshen(r); // same normalization a commit would get
        if (out.some((c) => Exp.equals(c.exp, exp))) continue;
        out.push({ transform, idx, reversed, site, exp });
      }
    });
  }
  return out;
};

/* Render a candidate into a hidden probe inside #stage and measure per-id
 * boxes, center-aligned to the live scene (approximating flex centering).
 * The probe stays mounted (hidden) so its elements can be cloned; call
 * dispose() when the drag ends. */
const probe_candidate = (
  exp: Exp.t,
  settings: Settings.t
): { measured: Map<string, Motion.Measured>; dispose: () => void } | null => {
  const stageEl = document.getElementById("stage");
  const live = stageEl?.querySelector<HTMLElement>(".node-container");
  const main = document.getElementById("main");
  if (!stageEl || !live || !main) return null;
  const host = document.createElement("div");
  host.className = "drag-probe";
  const mainPx = parseFloat(getComputedStyle(main).fontSize);
  host.style.fontSize = `${mainPx * stage_scale(depth(exp))}px`;
  stageEl.appendChild(host);
  const dispose_solid = render(
    () => (
      <div class={`node-container ${settings.projection}`}>
        <ViewOnly node={exp} symbols={settings.symbols} />
      </div>
    ),
    host
  );
  const dispose = () => {
    dispose_solid();
    host.remove();
  };
  const cont = host.firstElementChild as HTMLElement | null;
  if (!cont) {
    dispose();
    return null;
  }
  const lr = live.getBoundingClientRect();
  const pr = cont.getBoundingClientRect();
  const dx = lr.x + lr.width / 2 - (pr.x + pr.width / 2);
  const dy = lr.y + lr.height / 2 - (pr.y + pr.height / 2);
  return { measured: Motion.measure_root(cont, dx, dy), dispose };
};

/* Affordance filter: the grab must be a MOVER in the candidate, not a
 * passenger. If the grabbed node's box maps rigidly through its parent's
 * own displacement (same relative position and scale), the rule relocated
 * an enclosing subtree and the grab merely rode along — that drag belongs
 * to the ancestor (grab it instead). This is the demo's trigger discipline
 * (nodes inside wildcard bindings don't fire rules), derived from measured
 * geometry instead of pattern annotations. */
const grab_is_mover = (
  live: Map<string, Motion.Measured>,
  cand: Map<string, Motion.Measured>,
  grabbedKey: string
): boolean => {
  const lx = live.get(grabbedKey);
  const cx = cand.get(grabbedKey);
  if (!lx || !cx) return true; // vanishes or appears: a genuine participant
  const pKey = lx.parentId;
  if (!pKey) return true;
  const lp = live.get(pKey);
  const cp = cand.get(pKey);
  if (!lp || !cp) return true; // parent restructured: genuine participant
  const s = cp.box.w / Math.max(1e-6, lp.box.w);
  const ex = cp.box.x + (lx.box.x - lp.box.x) * s;
  const ey = cp.box.y + (lx.box.y - lp.box.y) * s;
  const ew = lx.box.w * s;
  const eps = 2;
  const rode_along =
    Math.abs(ex - cx.box.x) < eps &&
    Math.abs(ey - cx.box.y) < eps &&
    Math.abs(ew - cx.box.w) < eps;
  return !rode_along;
};

export const candidates = (model: Model.t, grabbedId: ID.t): Candidate[] => {
  const container = document.querySelector<HTMLElement>(
    "#stage .node-container"
  );
  const live = container ? Motion.measure_root(container) : new Map();
  const key = `node-${grabbedId}`;
  const out: Candidate[] = [];
  for (const c of enumerate(model, grabbedId)) {
    const probe = probe_candidate(c.exp, model.settings);
    if (!probe) continue;
    const anchor = probe.measured.get(key)?.box;
    /* No anchor = the grab is consumed by this rewrite; it has no track to
     * ride. Such rules are reached by grabbing a node that survives (e.g.
     * factoring via the shared factor or the sum, not the product). */
    if (!anchor || !grab_is_mover(live, probe.measured, key)) {
      probe.dispose();
      continue;
    }
    out.push({
      ...c,
      measured: probe.measured,
      dispose: probe.dispose,
      anchor,
    });
  }
  return out;
};

// # Debug visualization: tracks (grab→anchor segments) + anchor dots

let vis: HTMLElement | null = null;

type VisState = {
  lines: SVGLineElement[];
  dots: (HTMLElement | null)[];
  foot: HTMLElement;
  tlabel: HTMLElement;
  a0: { x: number; y: number };
  targets: { ax: number; ay: number }[];
};

let vis_state: VisState | null = null;

const SVGNS = "http://www.w3.org/2000/svg";

const ensure_vis = (): HTMLElement => {
  if (vis && vis.isConnected) return vis;
  vis = document.createElement("div");
  vis.id = "drag-vis";
  document.body.appendChild(vis);
  return vis;
};

const clear_vis = (): void => {
  vis?.replaceChildren();
  vis_state = null;
};

const hue_of = (i: number, n: number): number =>
  Math.round((i * 360) / Math.max(1, n));

const show_vis = (
  grabbedId: ID.t,
  cands: Candidate[],
  targets: { ax: number; ay: number }[],
  a0: { x: number; y: number }
): void => {
  const v = ensure_vis();
  v.replaceChildren();
  const cur = document.getElementById(`node-${grabbedId}`)?.getBoundingClientRect();
  if (cur) {
    const box = document.createElement("div");
    box.className = "grab-box";
    box.style.left = `${cur.x}px`;
    box.style.top = `${cur.y}px`;
    box.style.width = `${cur.width}px`;
    box.style.height = `${cur.height}px`;
    v.appendChild(box);
  }
  /* tracks: one segment per reachable candidate, tick at the commit point */
  const svg = document.createElementNS(SVGNS, "svg");
  v.appendChild(svg);
  const lines: SVGLineElement[] = [];
  const dots: (HTMLElement | null)[] = [];
  cands.forEach((c, i) => {
    const tg = targets[i];
    const hue = hue_of(i, cands.length);
    const reachable = Math.hypot(tg.ax - a0.x, tg.ay - a0.y) >= MIN_TRAVEL;
    const line = document.createElementNS(SVGNS, "line");
    line.setAttribute("x1", `${a0.x}`);
    line.setAttribute("y1", `${a0.y}`);
    line.setAttribute("x2", `${tg.ax}`);
    line.setAttribute("y2", `${tg.ay}`);
    line.setAttribute("stroke", `hsl(${hue} 70% 45%)`);
    line.classList.add("track");
    if (!reachable) line.classList.add("unreachable");
    svg.appendChild(line);
    lines.push(line);
    if (reachable) {
      /* commit-threshold tick, perpendicular at t = COMMIT_T */
      const mx = a0.x + (tg.ax - a0.x) * COMMIT_T;
      const my = a0.y + (tg.ay - a0.y) * COMMIT_T;
      const len = Math.hypot(tg.ax - a0.x, tg.ay - a0.y);
      const px = (-(tg.ay - a0.y) / len) * 5;
      const py = ((tg.ax - a0.x) / len) * 5;
      const tick = document.createElementNS(SVGNS, "line");
      tick.setAttribute("x1", `${mx - px}`);
      tick.setAttribute("y1", `${my - py}`);
      tick.setAttribute("x2", `${mx + px}`);
      tick.setAttribute("y2", `${my + py}`);
      tick.setAttribute("stroke", `hsl(${hue} 70% 45%)`);
      tick.classList.add("track-tick");
      svg.appendChild(tick);
    }
    const dot = document.createElement("div");
    dot.className = "anchor-dot";
    dot.style.left = `${tg.ax}px`;
    dot.style.top = `${tg.ay}px`;
    dot.style.background = `hsl(${hue} 70% 45%)`;
    dot.style.borderColor = `hsl(${hue} 70% 45%)`;
    dot.textContent = `${c.idx}${c.reversed ? "ʳ" : ""}`;
    v.appendChild(dot);
    dots.push(dot);
  });
  /* projection foot + live t readout, shown while a candidate is active */
  const foot = document.createElement("div");
  foot.className = "track-foot";
  foot.style.display = "none";
  v.appendChild(foot);
  const tlabel = document.createElement("div");
  tlabel.className = "t-label";
  tlabel.style.display = "none";
  v.appendChild(tlabel);
  vis_state = { lines, dots, foot, tlabel, a0, targets };
};

const update_vis = (cands: Candidate[], active: number, t: number): void => {
  const s = vis_state;
  if (!s) return;
  s.lines.forEach((ln, i) => ln.classList.toggle("active", i === active));
  s.dots.forEach((d, i) => d?.classList.toggle("active", i === active));
  const tg = active >= 0 ? s.targets[active] : null;
  if (!tg) {
    s.foot.style.display = "none";
    s.tlabel.style.display = "none";
    return;
  }
  const fx = s.a0.x + (tg.ax - s.a0.x) * t;
  const fy = s.a0.y + (tg.ay - s.a0.y) * t;
  const hue = hue_of(active, cands.length);
  s.foot.style.display = "";
  s.foot.style.left = `${fx}px`;
  s.foot.style.top = `${fy}px`;
  s.foot.style.borderColor = `hsl(${hue} 70% 45%)`;
  s.foot.classList.toggle("committing", t > COMMIT_T);
  const c = cands[active];
  s.tlabel.style.display = "";
  s.tlabel.style.left = `${fx}px`;
  s.tlabel.style.top = `${fy}px`;
  s.tlabel.textContent = `${c.idx}${c.reversed ? "ʳ" : ""} t=${t.toFixed(2)}${
    t > COMMIT_T ? " ✓" : ""
  }`;
  s.tlabel.style.background = `hsl(${hue} 70% 35%)`;
};

// # The drag itself

/* Candidates whose anchor displacement is below this are unreachable by
 * projection and are skipped (coincident-anchor conflicts land here too). */
const MIN_TRAVEL = 12;
const ENGAGE_PX = 4;
const COMMIT_T = 0.5;
/* The knob counts as "at the hub" (free to change rails) within this many
 * px of the grab point. */
const HUB_PX = 10;
/* Max knob speed along the rails, px per frame (~120Hz). Fast enough to
 * feel 1:1 under the pointer; slow enough that flowing out of the hub onto
 * a new rail reads as motion, not teleportation. */
const KNOB_SPEED = 20;

/* Only one drag at a time: a new grab (or any stuck state) force-ends the
 * previous one. */
let end_current: (() => void) | null = null;

export const grab = (
  model: Model.t,
  inject: Action.Inject,
  grabbedId: ID.t,
  e: PointerEvent
): void => {
  end_current?.();
  const cands = candidates(model, grabbedId);
  const live = document.getElementById(`node-${grabbedId}`)?.getBoundingClientRect();
  /* grab offset within the node, mapped proportionally into each candidate's
   * anchor box (the poor man's local-frame anchor) */
  const rel = live
    ? {
        x: (e.clientX - live.x) / Math.max(1, live.width),
        y: (e.clientY - live.y) / Math.max(1, live.height),
      }
    : { x: 0.5, y: 0.5 };
  const a0 = { x: e.clientX, y: e.clientY };
  const targets = cands.map((c) => ({
    ax: c.anchor.x + rel.x * c.anchor.w,
    ay: c.anchor.y + rel.y * c.anchor.h,
  }));
  /* Debug overlay (rails, anchor dots, t readout) — toggleable. update_vis
   * degrades to a no-op when show_vis hasn't run. */
  if (model.settings.dragDebug) {
    show_vis(grabbedId, cands, targets, a0);
    console.table(
      cands.map((c, i) => ({
        tool: c.idx,
        dir: c.reversed ? "reverse" : "forward",
        target: `${Math.round(targets[i].ax)},${Math.round(targets[i].ay)}`,
        travel: Math.round(
          Math.hypot(targets[i].ax - a0.x, targets[i].ay - a0.y)
        ),
        nodes: c.measured.size,
      }))
    );
  }

  /* # The knob-on-rails mechanic.
   *
   * The drag state is not "which candidate is nearest the pointer" (a
   * classifier — discontinuous at its decision boundaries) but the position
   * of a knob on a star-shaped rail network joined at the grab point. The
   * pointer doesn't set the state, it PULLS on it: each frame the knob
   * chases the pointer's projection along its current rail at bounded
   * speed, and may change rails only at the hub. Continuity is by
   * construction; commitment far from the hub is topology, not a tuned
   * threshold. */
  const rails = targets.map((tg) => {
    const vx = tg.ax - a0.x;
    const vy = tg.ay - a0.y;
    const len = Math.hypot(vx, vy);
    return { vx, vy, len, ok: len >= MIN_TRAVEL };
  });
  const proj_t = (p: { x: number; y: number }, i: number): number => {
    const r = rails[i];
    return clamp01(
      ((p.x - a0.x) * r.vx + (p.y - a0.y) * r.vy) / (r.len * r.len)
    );
  };
  const perp_d = (p: { x: number; y: number }, i: number, t: number): number => {
    const r = rails[i];
    return Math.hypot(p.x - (a0.x + t * r.vx), p.y - (a0.y + t * r.vy));
  };
  /* Best rail to flow onto from the hub: pointer must pull beyond the hub
   * radius on it; nearest by perpendicular distance wins. */
  const outward_rail = (p: { x: number; y: number }): number => {
    let best = -1;
    let bestD = Infinity;
    rails.forEach((r, i) => {
      if (!r.ok) return;
      const t = proj_t(p, i);
      if (t * r.len <= HUB_PX) return;
      const d = perp_d(p, i, t);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  };

  let engaged = false;
  let active = -1; // current rail / active candidate
  let activeT = 0; // blend parameter on it
  let pointer = { x: e.clientX, y: e.clientY };
  let raf = 0;

  const set_active = (i: number, t: number): void => {
    if (i !== active) {
      active = i;
      Motion.manual_start(cands[i].measured);
    }
    activeT = t;
    Motion.manual_set(t);
    update_vis(cands, active, t);
  };

  /* Rails: the knob chases the pointer along its current rail at bounded
   * speed; rails change only at the hub. Runs on its own clock. */
  const rails_step = (): void => {
    if (engaged) {
      if (active < 0) {
        const j = outward_rail(pointer);
        if (j >= 0) set_active(j, 0);
      } else {
        /* At the hub, rails may be changed freely — and this must be
         * checked BEFORE chasing: a diagonal pull toward another rail
         * usually still projects positively onto the current one, and the
         * knob would exit the hub along the wrong rail. */
        const knobPx = activeT * rails[active].len;
        if (knobPx <= HUB_PX) {
          const j = outward_rail(pointer);
          if (j >= 0 && j !== active)
            set_active(j, Math.min(knobPx / rails[j].len, 1));
        }
        /* chase the pointer's projection along the current rail */
        const tTar = proj_t(pointer, active);
        const dPx = (tTar - activeT) * rails[active].len;
        const move = Math.max(-KNOB_SPEED, Math.min(KNOB_SPEED, dPx));
        set_active(active, clamp01(activeT + move / rails[active].len));
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__knob = {
      rail: active,
      t: +activeT.toFixed(3),
      engaged,
      px: { ...pointer },
      frames: (((window as any).__knob?.frames as number) ?? 0) + 1,
    };
    raf = requestAnimationFrame(rails_step);
  };

  /* Closest: memoryless per-frame nearest-segment dispatch (the original,
   * pre-stickiness behavior) — kept for comparison via the mechanic
   * toggle. Jumps at decision boundaries are inherent to it. */
  const closest_move = (): void => {
    let best = -1;
    let bestD = Infinity;
    let bestT = 0;
    rails.forEach((r, i) => {
      if (!r.ok) return;
      const t = proj_t(pointer, i);
      const d = perp_d(pointer, i, t);
      if (d < bestD) {
        bestD = d;
        best = i;
        bestT = t;
      }
    });
    if (best >= 0) set_active(best, bestT);
  };

  const mechanic = model.settings.dragMechanic;
  if (mechanic === "Rails") raf = requestAnimationFrame(rails_step);

  const onMove = (ev: PointerEvent): void => {
    pointer = { x: ev.clientX, y: ev.clientY };
    if (!engaged && Math.hypot(pointer.x - a0.x, pointer.y - a0.y) >= ENGAGE_PX)
      engaged = true;
    if (engaged && mechanic === "Closest") closest_move();
  };

  const onUp = (): void => {
    end_current = null;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    cancelAnimationFrame(raf);
    clear_vis();
    if (engaged && active >= 0) {
      if (activeT > COMMIT_T) {
        const c = cands[active];
        /* animate() captures the manual blend as its origin: seamless */
        inject({
          t: "transformNode",
          idx: -1,
          transform: c.transform,
          f: at_path(c.transform, c.site),
        });
      } else {
        Motion.manual_release();
      }
    }
    cands.forEach((c) => c.dispose());
  };

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
  end_current = onUp;
};
