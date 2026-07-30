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
  /* grabbed node's box in this candidate; null if the grab vanishes there */
  anchor: Motion.Box | null;
  /* fallback: candidate root box (used when the grab vanishes) */
  root: Motion.Box | null;
};

/* Must mirror StageView's depth-derived scale. */
const stage_scale = (d: number) => (d == 0 ? 1 : 4 / (d + 1));

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

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

export const candidates = (model: Model.t, grabbedId: ID.t): Candidate[] => {
  const out: Candidate[] = [];
  for (const c of enumerate(model, grabbedId)) {
    const probe = probe_candidate(c.exp, model.settings);
    if (!probe) continue;
    out.push({
      ...c,
      measured: probe.measured,
      dispose: probe.dispose,
      anchor: probe.measured.get(`node-${grabbedId}`)?.box ?? null,
      root: probe.measured.get(`node-${c.exp.id}`)?.box ?? null,
    });
  }
  return out;
};

// # Debug visualization: anchor dots while grabbing

let vis: HTMLElement | null = null;

const ensure_vis = (): HTMLElement => {
  if (vis && vis.isConnected) return vis;
  vis = document.createElement("div");
  vis.id = "drag-vis";
  document.body.appendChild(vis);
  return vis;
};

const clear_vis = (): void => {
  vis?.replaceChildren();
};

const show_vis = (
  grabbedId: ID.t,
  cands: Candidate[],
  targets: ({ ax: number; ay: number } | null)[]
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
  cands.forEach((c, i) => {
    const tg = targets[i];
    if (!tg) return;
    const hue = Math.round((i * 360) / Math.max(1, cands.length));
    const dot = document.createElement("div");
    dot.className = "anchor-dot" + (c.anchor ? "" : " vanishing");
    dot.style.left = `${tg.ax}px`;
    dot.style.top = `${tg.ay}px`;
    dot.style.background = c.anchor ? `hsl(${hue} 70% 45%)` : "transparent";
    dot.style.borderColor = `hsl(${hue} 70% 45%)`;
    dot.textContent = `${c.idx}${c.reversed ? "ʳ" : ""}`;
    v.appendChild(dot);
  });
};

// # The drag itself

/* Candidates whose anchor displacement is below this are unreachable by
 * projection and are skipped (coincident-anchor conflicts land here too). */
const MIN_TRAVEL = 12;
const ENGAGE_PX = 4;
const COMMIT_T = 0.5;

export const grab = (
  model: Model.t,
  inject: Action.Inject,
  grabbedId: ID.t,
  e: PointerEvent
): void => {
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
  const targets = cands.map((c) => {
    const box = c.anchor ?? c.root;
    if (!box) return null;
    return { ax: box.x + rel.x * box.w, ay: box.y + rel.y * box.h };
  });
  show_vis(grabbedId, cands, targets);
  console.table(
    cands.map((c, i) => ({
      tool: c.idx,
      dir: c.reversed ? "reverse" : "forward",
      target: targets[i] ? `${Math.round(targets[i]!.ax)},${Math.round(targets[i]!.ay)}` : "-",
      travel: targets[i]
        ? Math.round(Math.hypot(targets[i]!.ax - a0.x, targets[i]!.ay - a0.y))
        : 0,
      nodes: c.measured.size,
    }))
  );

  let engaged = false;
  let active = -1;
  let lastT = 0;

  const onMove = (ev: PointerEvent): void => {
    const p = { x: ev.clientX, y: ev.clientY };
    if (!engaged) {
      if (Math.hypot(p.x - a0.x, p.y - a0.y) < ENGAGE_PX) return;
      engaged = true;
    }
    /* closest-of-betweens: project the pointer onto each grab→anchor
     * segment; nearest segment wins, its parameter is the blend t */
    let best = -1;
    let bestD = Infinity;
    let bestT = 0;
    targets.forEach((tg, i) => {
      if (!tg) return;
      const vx = tg.ax - a0.x;
      const vy = tg.ay - a0.y;
      const len2 = vx * vx + vy * vy;
      if (len2 < MIN_TRAVEL * MIN_TRAVEL) return;
      const t = clamp01(((p.x - a0.x) * vx + (p.y - a0.y) * vy) / len2);
      const d = Math.hypot(p.x - (a0.x + t * vx), p.y - (a0.y + t * vy));
      if (d < bestD) {
        bestD = d;
        best = i;
        bestT = t;
      }
    });
    if (best < 0) return;
    if (best !== active) {
      active = best;
      Motion.manual_start(cands[best].measured);
    }
    lastT = bestT;
    Motion.manual_set(bestT);
  };

  const onUp = (): void => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    clear_vis();
    if (engaged && active >= 0) {
      if (lastT > COMMIT_T) {
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
};
