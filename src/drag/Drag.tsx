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
import * as Pat from "./../syntax/Pat";
import { depth, freshen, id_at, subtree_at } from "./../syntax/Node";
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
  /* provenance geometry: which box each created node emerges from (clone
   * vs grow) and which box each consumed node converges into (merge vs
   * absorb). Derived by structural equality against the pre-state —
   * provenance-lite until rewrites record it themselves (see design doc). */
  emerge: Map<string, Motion.EmergeSpec>;
  converge: Map<string, Motion.ConvergeSpec>;
};

/* # Provenance-lite: structural diffing of live vs candidate expressions.
 * A created node that structurally equals an existing (site-scoped) node
 * is a CLONE of it; otherwise it is genuinely new and GROWs from the grab.
 * A removed subtree that structurally equals a surviving candidate subtree
 * MERGEs into it; otherwise it is ABSORBed into the site's replacement. */

const all_subtrees = (e: Exp.t, out: Exp.t[] = []): Exp.t[] => {
  out.push(e);
  if (e.t === "Comp") e.kids.forEach((k) => all_subtrees(k, out));
  return out;
};

const index_by_id = (e: Exp.t, m: Map<number, Exp.t> = new Map()): Map<number, Exp.t> => {
  m.set(e.id, e);
  if (e.t === "Comp") e.kids.forEach((k) => index_by_id(k, m));
  return m;
};

const head_sym = (e: Exp.t): string | null =>
  e.t === "Comp" && e.kids[0]?.t === "Atom" ? e.kids[0].sym : null;

const provenance = (
  liveExp: Exp.t,
  live: Map<string, Motion.Measured>,
  candExp: Exp.t,
  cand: Map<string, Motion.Measured>,
  site: number[],
  grabbedKey: string
): { emerge: Map<string, Motion.EmergeSpec>; converge: Map<string, Motion.ConvergeSpec> } => {
  const emerge = new Map<string, Motion.EmergeSpec>();
  const converge = new Map<string, Motion.ConvergeSpec>();
  const candIdx = index_by_id(candExp);
  const liveIdx = index_by_id(liveExp);
  const siteLive = subtree_at(site, liveExp);
  const siteSubs = siteLive ? all_subtrees(siteLive) : [];
  /* enters (node layers) */
  for (const key of cand.keys()) {
    if (live.has(key) || !key.startsWith("node-")) continue;
    const n = candIdx.get(+key.slice(5));
    if (!n) continue;
    let spec: Motion.EmergeSpec = { source: grabbedKey, mode: "grow" };
    if (n.t === "Atom") {
      const m = siteSubs.find((s) => s.t === "Atom" && Exp.equals(s, n));
      if (m && live.has(`node-${m.id}`))
        spec = { source: `node-${m.id}`, mode: "clone" };
    } else {
      const hs = head_sym(n);
      const m = hs
        ? siteSubs.find((s) => head_sym(s) === hs && live.has(`node-${s.id}`))
        : undefined;
      if (m) {
        spec = { source: `node-${m.id}`, mode: "clone" };
        /* the clone's head separates from the source's head */
        const nh = n.kids[0];
        const mh = (m as Exp.t & { t: "Comp" }).kids[0];
        if (nh && mh && !live.has(`node-${nh.id}`) && live.has(`node-${mh.id}`))
          emerge.set(`node-${nh.id}`, { source: `node-${mh.id}`, mode: "clone" });
      }
    }
    if (!emerge.has(key)) emerge.set(key, spec);
  }
  /* sym layers follow their node's source (sym→sym when possible) */
  for (const key of cand.keys()) {
    if (live.has(key) || !key.startsWith("sym-")) continue;
    const nodeSpec = emerge.get(`node-${key.slice(4)}`);
    if (!nodeSpec) continue;
    const symSrc = `sym-${nodeSpec.source.slice(5)}`;
    emerge.set(key, {
      source: live.has(symSrc) ? symSrc : nodeSpec.source,
      mode: nodeSpec.mode,
    });
  }
  /* exits: per-node, exactly dual to enters. Atoms merge into a
   * site-scoped structural twin; comps merge into a site-scoped same-head
   * comp (their heads following head→head); anything without a
   * counterpart absorbs into the site's replacement. */
  const siteRoot = id_at(site, candExp);
  const siteKey = siteRoot !== undefined ? `node-${siteRoot}` : null;
  const siteCand = subtree_at(site, candExp);
  const siteCandSubs = siteCand ? all_subtrees(siteCand) : [];
  for (const [key] of live) {
    if (cand.has(key) || !key.startsWith("node-")) continue;
    const g = liveIdx.get(+key.slice(5));
    if (!g) continue;
    let spec: Motion.ConvergeSpec | null = null;
    if (g.t === "Atom") {
      const twin = siteCandSubs.find(
        (s) => s.t === "Atom" && Exp.equals(s, g) && cand.has(`node-${s.id}`)
      );
      if (twin) spec = { target: `node-${twin.id}`, mode: "merge" };
    } else {
      const hs = head_sym(g);
      const twin = hs
        ? siteCandSubs.find(
            (s) => head_sym(s) === hs && cand.has(`node-${s.id}`)
          )
        : undefined;
      if (twin) {
        spec = { target: `node-${twin.id}`, mode: "merge" };
        /* the comp's head merges into the twin's head */
        const gh = g.kids[0];
        const th = (twin as Exp.t & { t: "Comp" }).kids[0];
        if (gh && th && !cand.has(`node-${gh.id}`) && cand.has(`node-${th.id}`))
          converge.set(`node-${gh.id}`, {
            target: `node-${th.id}`,
            mode: "merge",
          });
      }
    }
    if (!spec && siteKey && cand.has(siteKey))
      spec = { target: siteKey, mode: "absorb" };
    if (spec && !converge.has(key)) converge.set(key, spec);
  }
  /* sym exits follow their node's target (sym→sym when possible) */
  for (const [key] of live) {
    if (cand.has(key) || !key.startsWith("sym-")) continue;
    const nodeSpec = converge.get(`node-${key.slice(4)}`);
    if (!nodeSpec) continue;
    const symTgt = `sym-${nodeSpec.target.slice(5)}`;
    converge.set(key, {
      target: cand.has(symTgt) ? symTgt : nodeSpec.target,
      mode: nodeSpec.mode,
    });
  }
  return { emerge, converge };
};

/* Prefer-the-grabbed-copy (the demo's rule, done at the candidate level):
 * if a rewrite consumed the grabbed subtree but kept a structural twin
 * (merge rules pick an arbitrary copy's ids), splice the grabbed subtree —
 * ids and all — over the twin. The grab then survives, both copies afford
 * the drag, and the OTHER copy becomes the exit that merges into it. Sound
 * because we commit the exact candidate exp. */
const replace_by_id = (e: Exp.t, targetId: number, repl: Exp.t): Exp.t => {
  if (e.id === targetId) return repl;
  if (e.t === "Atom") return e;
  const kids = e.kids.map((k) => replace_by_id(k, targetId, repl));
  return kids.every((k, i) => k === e.kids[i]) ? e : { ...e, kids };
};

const prefer_grab = (
  candExp: Exp.t,
  site: number[],
  liveGrab: Exp.t | undefined
): Exp.t => {
  if (!liveGrab) return candExp;
  if (index_by_id(candExp).has(liveGrab.id)) return candExp; // grab survives
  const siteCand = subtree_at(site, candExp);
  const twin = siteCand
    ? all_subtrees(siteCand).find((s) => Exp.equals(s, liveGrab))
    : undefined;
  return twin ? replace_by_id(candExp, twin.id, liveGrab) : candExp;
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
      /* per-rule loadout toggles (the circles beside the rules) */
      if (!model.tools.dragActive[idx]) return;
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

/* # Pattern-level moverhood (see design/captured-geometry.md)
 *
 * The affordance filter reads the grab's role out of the rule's own
 * patterns. Matching the source pattern against the site classifies the
 * grabbed node as matched structure (a pattern comp/const), the root of
 * a variable's binding, or strictly inside one. Inside-a-binding nodes
 * are passengers (they ride; grab the binding's root instead). Everyone
 * else moves iff their pattern-level position differs between source and
 * result — positions are pattern paths annotated with the pattern ids
 * they descend through, and multi-occurrence variables/nodes compare
 * their whole occurrence sets. So the shared factor in distribute/factor
 * is a mover in BOTH directions (its occurrence set changes shape),
 * while a rewrite's fixed points (the root plus under commute or
 * associate) stay parked; consumed/created grabs always participate. */

type GrabRole =
  | { t: "structure"; pid: number }
  | { t: "binding"; name: string }
  | { t: "inside" }
  | null;

const contains_id = (e: Exp.t, id: ID.t): boolean =>
  e.id === id || (e.t === "Comp" && e.kids.some((k) => contains_id(k, id)));

/* Walk pattern and (matching) exp in parallel to classify the grab. */
const grab_role = (pat: Pat.t, exp: Exp.t, id: ID.t): GrabRole => {
  if (pat.t === "Atom" && pat.sym.t === "Var") {
    if (exp.id === id) return { t: "binding", name: pat.sym.name };
    return contains_id(exp, id) ? { t: "inside" } : null;
  }
  if (exp.id === id) return { t: "structure", pid: pat.id };
  if (pat.t === "Comp" && exp.t === "Comp")
    for (let i = 0; i < pat.kids.length && i < exp.kids.length; i++) {
      const r = grab_role(pat.kids[i], exp.kids[i], id);
      if (r) return r;
    }
  return null;
};

/* Every occurrence's annotated path, per variable name and pattern id. */
const pat_positions = (
  p: Pat.t
): { vars: Map<string, string[]>; nodes: Map<number, string[]> } => {
  const vars = new Map<string, string[]>();
  const nodes = new Map<number, string[]>();
  const go = (n: Pat.t, path: string): void => {
    if (n.t === "Atom" && n.sym.t === "Var")
      vars.set(n.sym.name, [...(vars.get(n.sym.name) ?? []), path]);
    else nodes.set(n.id, [...(nodes.get(n.id) ?? []), path]);
    if (n.t === "Comp")
      n.kids.forEach((k, i) => go(k, `${path}${n.id}.${i}/`));
  };
  go(p, "");
  return { vars, nodes };
};

const occ_key = (paths: string[] | undefined): string =>
  paths ? [...paths].sort().join("|") : "∅";

const grab_is_mover = (
  t: Transform,
  site: Exp.t | undefined,
  grabbedId: ID.t
): boolean => {
  if (!site) return true;
  const role = grab_role(t.source, site, grabbedId);
  if (role === null) return true; // outside the match: genuine participant
  if (role.t === "inside") return false;
  const src = pat_positions(t.source);
  const res = pat_positions(t.result);
  return role.t === "binding"
    ? occ_key(src.vars.get(role.name)) !== occ_key(res.vars.get(role.name))
    : occ_key(src.nodes.get(role.pid)) !== occ_key(res.nodes.get(role.pid));
};

export const candidates = (model: Model.t, grabbedId: ID.t): Candidate[] => {
  const container = document.querySelector<HTMLElement>(
    "#stage .node-container"
  );
  const live = container ? Motion.measure_root(container) : new Map();
  const key = `node-${grabbedId}`;
  const liveGrab = index_by_id(model.stage.exp).get(grabbedId);
  const out: Candidate[] = [];
  for (const raw of enumerate(model, grabbedId)) {
    const c = { ...raw, exp: prefer_grab(raw.exp, raw.site, liveGrab) };
    const probe = probe_candidate(c.exp, model.settings);
    if (!probe) continue;
    const anchor = probe.measured.get(key)?.box;
    /* No anchor = the grab is consumed by this rewrite; it has no track to
     * ride. Such rules are reached by grabbing a node that survives (e.g.
     * factoring via the shared factor or the sum, not the product). */
    if (
      !anchor ||
      !grab_is_mover(c.transform, subtree_at(c.site, model.stage.exp), grabbedId)
    ) {
      probe.dispose();
      continue;
    }
    const { emerge, converge } = provenance(
      model.stage.exp,
      live,
      c.exp,
      probe.measured,
      c.site,
      key
    );
    out.push({
      ...c,
      measured: probe.measured,
      dispose: probe.dispose,
      anchor,
      emerge,
      converge,
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

/* Rails live in a separate negative-z layer BEHIND the stage — the
 * translucent node pills let them show through — while dots and readouts
 * stay in the top layer. */
let vis_rails: HTMLElement | null = null;
const ensure_rails = (): HTMLElement => {
  if (vis_rails && vis_rails.isConnected) return vis_rails;
  vis_rails = document.createElement("div");
  vis_rails.id = "drag-vis-rails";
  document.body.appendChild(vis_rails);
  return vis_rails;
};

const clear_vis = (): void => {
  vis?.replaceChildren();
  vis_rails?.replaceChildren();
  vis_state = null;
  tool_glow(null, 0);
};

/* # Noolbox rule glow — while a drag rides a rail, the rule it would
 * enact lights up with the rule-press flashbang (.transform-view:active's
 * pink drop-shadow + brightness), scaled continuously by the rail
 * parameter, with a soft smoothstepped bump crossing COMMIT_T; a
 * committed drag flashes the full effect. Driven imperatively (like the
 * overlay): per-frame model round-trips for a decoration would be waste,
 * and filter values can't ride a CSS custom property. */
let glow_el: HTMLElement | null = null;
let glow_g = 0;
const fades = new Map<HTMLElement, number>(); // fading row -> raf id
const glow_strength = (t: number): number => {
  const s = Math.max(0, Math.min(1, (t - (COMMIT_T - 0.08)) / 0.16));
  return Math.min(1, Math.max(0, t) + 0.3 * s * s * (3 - 2 * s));
};
const glow_filter = (g: number): string =>
  `drop-shadow(0 0 ${(1.2 * g).toFixed(2)}em ` +
  `rgb(255 153 153 / ${g.toFixed(3)})) ` +
  `brightness(${(1 + 0.45 * g).toFixed(3)})`;
const cancel_fade = (el: HTMLElement): void => {
  const raf = fades.get(el);
  if (raf !== undefined) {
    cancelAnimationFrame(raf);
    fades.delete(el);
  }
};
const finish_fade = (el: HTMLElement): void => {
  cancel_fade(el);
  el.classList.remove("drag-glow");
  el.style.removeProperty("filter");
};
/* Exit: exponential decay whose half-life GROWS as it runs — a rapid
 * falloff that genuinely levels off (a constant half-life reads as a
 * uniform wipe: brightness perception is roughly logarithmic). Fades are
 * per-row, so a rail change never hard-clears the previous rule. */
const fade_glow = (el: HTMLElement, from: number): void => {
  cancel_fade(el);
  let g = from;
  const start = performance.now();
  let last = start;
  const step = (): void => {
    if (!fades.has(el)) return;
    const now = performance.now();
    /* growing half-life: rapid at first, easing into an afterglow tail
     * that fully clears in about a second */
    const half_life = Math.min(40 + 0.5 * (now - start), 200);
    g *= Math.pow(2, -(now - last) / half_life);
    last = now;
    if (g < 0.005) return finish_fade(el);
    el.style.filter = glow_filter(g);
    fades.set(el, requestAnimationFrame(step));
  };
  fades.set(el, requestAnimationFrame(step));
};
const tool_glow = (idx: number | null, t: number): void => {
  const el =
    idx === null ? null : document.getElementById(`transform-${idx}`);
  if (glow_el && glow_el !== el) fade_glow(glow_el, glow_g);
  glow_el = el;
  glow_g = el ? glow_strength(t) : 0;
  if (!el) return;
  cancel_fade(el); // reacquired mid-fade: live glow takes over
  el.classList.add("drag-glow");
  el.style.filter = glow_filter(glow_g);
};
const flash_tool = (idx: number): void => {
  const el = document.getElementById(`transform-${idx}`);
  if (!el) return;
  el.classList.remove("drag-glow-flash");
  void el.offsetWidth; // restart the animation if re-flashed
  el.classList.add("drag-glow-flash");
  window.setTimeout(() => el.classList.remove("drag-glow-flash"), 950);
};

/* Track color is keyed to the RULE (toolbox index, golden-angle spread),
 * not the candidate's position in this grab's list — the same transform
 * is the same color across grabs and projections. Reversed applications
 * share the rule's hue, lightened. */
const track_color = (c: { idx: number; reversed: boolean }): string =>
  `hsl(${Math.round(c.idx * 137.508) % 360} 70% ${c.reversed ? 62 : 45}%)`;

/* Rule code from the transform's name: first-word initial (inverse takes
 * V, leaving I to identity) plus the first operator glyph. Rendered as
 * the letter with one compact column beside it — reversal r superscript
 * over the operator subscript. Unnamed transforms fall back to their
 * toolbox index. */
const OP_GLYPH: Record<string, string> = { plus: "+", times: "×", neg: "−" };
const code_el = (c: Candidate): HTMLElement => {
  const name = c.transform.name;
  const span = document.createElement("span");
  span.className = "rule-code";
  if (!name) {
    span.textContent = `${c.idx}${c.reversed ? "ʳ" : ""}`;
    return span;
  }
  const [head, ...rest] = name.split("_");
  span.append(head === "inverse" ? "V" : head[0].toUpperCase());
  const op = rest.map((w) => OP_GLYPH[w]).find(Boolean) ?? "";
  if (op || c.reversed) {
    const stack = document.createElement("span");
    stack.className = "code-stack";
    const sup = document.createElement("span");
    sup.textContent = c.reversed ? "r" : "";
    const sub = document.createElement("span");
    sub.textContent = op;
    stack.append(sup, sub);
    span.append(stack);
  }
  return span;
};

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
  ensure_rails().replaceChildren(svg);
  const lines: SVGLineElement[] = [];
  const dots: (HTMLElement | null)[] = [];
  cands.forEach((c, i) => {
    const tg = targets[i];
    const color = track_color(c);
    const reachable = Math.hypot(tg.ax - a0.x, tg.ay - a0.y) >= MIN_TRAVEL;
    const line = document.createElementNS(SVGNS, "line");
    line.setAttribute("x1", `${a0.x}`);
    line.setAttribute("y1", `${a0.y}`);
    line.setAttribute("x2", `${tg.ax}`);
    line.setAttribute("y2", `${tg.ay}`);
    line.setAttribute("stroke", color);
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
      tick.setAttribute("stroke", color);
      tick.classList.add("track-tick");
      svg.appendChild(tick);
    }
    const dot = document.createElement("div");
    dot.className = "anchor-dot";
    dot.style.left = `${tg.ax}px`;
    dot.style.top = `${tg.ay}px`;
    /* reversed: inverted — all-white dot, the rule's solid color as ink
     * (the white field is the reversal marker; ink matches the forward
     * dot) */
    const solid = track_color({ idx: c.idx, reversed: false });
    dot.style.background = c.reversed ? "white" : solid;
    dot.style.borderColor = c.reversed ? "white" : solid;
    if (c.reversed) dot.style.color = solid;
    dot.replaceChildren(code_el(c));
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
  const c = cands[active];
  s.foot.style.display = "";
  s.foot.style.left = `${fx}px`;
  s.foot.style.top = `${fy}px`;
  s.foot.style.borderColor = track_color(c);
  s.foot.classList.toggle("committing", t > COMMIT_T);
  s.tlabel.style.display = "";
  s.tlabel.style.left = `${fx}px`;
  s.tlabel.style.top = `${fy}px`;
  s.tlabel.replaceChildren(
    code_el(c),
    ` t=${t.toFixed(2)}${t > COMMIT_T ? " ✓" : ""}`
  );
  const dark = `hsl(${Math.round(c.idx * 137.508) % 360} 70% 35%)`;
  s.tlabel.style.background = c.reversed ? "white" : dark;
  s.tlabel.style.color = c.reversed ? dark : "white";
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
  const exp_at_grab = model.stage.exp;
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
      Motion.manual_start(cands[i].measured, {
        emerge: cands[i].emerge,
        converge: cands[i].converge,
      });
    }
    activeT = t;
    Motion.manual_set(t);
    update_vis(cands, active, t);
    tool_glow(active >= 0 ? cands[active].idx : null, t);
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
        flash_tool(c.idx);
        /* animate() captures the manual blend as its origin. Commit the
         * EXACT candidate exp: re-deriving the rewrite would mint different
         * fresh ids for created nodes, and the handoff would see the
         * almost-faded-in nodes as exits plus identical enters — a double
         * pop. (Fallback re-derives if the exp changed mid-drag.) */
        inject({
          t: "transformNode",
          idx: -1,
          transform: c.transform,
          f: (cur) =>
            cur === exp_at_grab ? c.exp : at_path(c.transform, c.site)(cur),
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
