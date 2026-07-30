/* Drag: candidate enumeration + hidden-mount measurement (plan step 2).
 *
 * On grabbing a stage node (drag mode on), we enumerate the states reachable
 * by applying enabled transforms at the grabbed node, render each candidate
 * into a hidden probe mounted inside #stage, and batch-measure per-id boxes.
 * Ids are PRESERVED across enumeration (unlike PreView, which freshens
 * everything) because id correspondence is what will drive the morph.
 *
 * For now this is investigative: a debug overlay shows where the grabbed
 * node would land in each candidate (its "anchor"), which is the geometry
 * dragology's between/closest machinery navigates. Actual drag-to-apply is
 * plan step 3. See design/captured-geometry.md.
 */
import { render } from "solid-js/web";
import * as Model from "./../Model";
import * as Statics from "./../Statics";
import * as Settings from "./../Settings";
import * as Exp from "./../syntax/Exp";
import * as ID from "./../syntax/ID";
import { at_path, flip, Transform } from "./../Transform";
import { depth, freshen } from "./../syntax/Node";
import { ViewOnly } from "./../view/ExpView";

export type Box = { x: number; y: number; w: number; h: number };

export type Candidate = {
  transform: Transform;
  idx: number; // index into tools.transforms
  reversed: boolean;
  exp: Exp.t;
  boxes: Map<string, Box>;
  /* grabbed node's box in this candidate; null if the grab vanishes there */
  anchor: Box | null;
};

/* Must mirror StageView's depth-derived scale. */
const stage_scale = (d: number) => (d == 0 ? 1 : 4 / (d + 1));

/* All states reachable by applying an enabled transform (either direction)
 * at the grabbed node, ids preserved, structurally deduplicated. */
export const enumerate = (
  model: Model.t,
  grabbedId: ID.t
): { transform: Transform; idx: number; reversed: boolean; exp: Exp.t }[] => {
  const path = Statics.get(model.stage.info, grabbedId).path;
  const out: { transform: Transform; idx: number; reversed: boolean; exp: Exp.t }[] =
    [];
  model.tools.transforms.forEach((t, idx) => {
    for (const [transform, reversed] of [
      [t, false],
      [flip(t), true],
    ] as const) {
      const r = at_path(transform, path)(model.stage.exp);
      if (r === "NoMatch") continue;
      const exp = freshen(r); // same normalization a commit would get
      if (out.some((c) => Exp.equals(c.exp, exp))) continue;
      out.push({ transform, idx, reversed, exp });
    }
  });
  return out;
};

/* Render a candidate into a hidden probe inside #stage and measure per-id
 * boxes, center-aligned to the live scene (approximating flex centering). */
export const measure_candidate = (
  exp: Exp.t,
  settings: Settings.t
): Map<string, Box> => {
  const out = new Map<string, Box>();
  const stageEl = document.getElementById("stage");
  const live = stageEl?.querySelector<HTMLElement>(".node-container");
  const main = document.getElementById("main");
  if (!stageEl || !live || !main) return out;
  const host = document.createElement("div");
  host.className = "drag-probe";
  const mainPx = parseFloat(getComputedStyle(main).fontSize);
  host.style.fontSize = `${mainPx * stage_scale(depth(exp))}px`;
  stageEl.appendChild(host);
  const dispose = render(
    () => (
      <div class={`node-container ${settings.projection}`}>
        <ViewOnly node={exp} symbols={settings.symbols} />
      </div>
    ),
    host
  );
  const cont = host.firstElementChild as HTMLElement | null;
  if (cont) {
    const lr = live.getBoundingClientRect();
    const pr = cont.getBoundingClientRect();
    const dx = lr.x + lr.width / 2 - (pr.x + pr.width / 2);
    const dy = lr.y + lr.height / 2 - (pr.y + pr.height / 2);
    host
      .querySelectorAll<HTMLElement>('[id^="node-"], [id^="sym-"]')
      .forEach((el) => {
        const r = el.getBoundingClientRect();
        out.set(el.id, { x: r.x + dx, y: r.y + dy, w: r.width, h: r.height });
      });
  }
  dispose();
  host.remove();
  return out;
};

export const candidates = (model: Model.t, grabbedId: ID.t): Candidate[] =>
  enumerate(model, grabbedId).map((c) => {
    const boxes = measure_candidate(c.exp, model.settings);
    return { ...c, boxes, anchor: boxes.get(`node-${grabbedId}`) ?? null };
  });

// # Debug visualization (step 2): anchor dots while the pointer is down

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

export const grab = (model: Model.t, grabbedId: ID.t, _e: PointerEvent): void => {
  const cands = candidates(model, grabbedId);
  console.table(
    cands.map((c) => ({
      tool: c.idx,
      dir: c.reversed ? "reverse" : "forward",
      anchor: c.anchor
        ? `${Math.round(c.anchor.x)},${Math.round(c.anchor.y)}`
        : "(grab vanishes)",
      nodes: c.boxes.size,
    }))
  );
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
    const hue = Math.round((i * 360) / Math.max(1, cands.length));
    /* fall back to the candidate root's box when the grab vanishes there */
    const rootId = `node-${c.exp.id}`;
    const target = c.anchor ?? c.boxes.get(rootId) ?? null;
    if (!target) return;
    const dot = document.createElement("div");
    dot.className = "anchor-dot" + (c.anchor ? "" : " vanishing");
    dot.style.left = `${target.x + target.w / 2}px`;
    dot.style.top = `${target.y + target.h / 2}px`;
    dot.style.background = c.anchor ? `hsl(${hue} 70% 45%)` : "transparent";
    dot.style.borderColor = `hsl(${hue} 70% 45%)`;
    dot.textContent = `${c.idx}${c.reversed ? "ʳ" : ""}`;
    v.appendChild(dot);
  });
  window.addEventListener("pointerup", clear_vis, { once: true });
};
