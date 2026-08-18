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
import * as Sound from "./../Sound";
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

/* Exported: the button path (App.inject) uses the same provenance for
 * click-applied transforms — the site is the selection, the trigger the
 * selected node. Only key-membership is read from the box maps. */
export const provenance = (
  liveExp: Exp.t,
  live: ReadonlyMap<string, unknown>,
  candExp: Exp.t,
  cand: ReadonlyMap<string, unknown>,
  site: number[],
  grabbedKey: string
): { emerge: Map<string, Motion.EmergeSpec>; converge: Map<string, Motion.ConvergeSpec> } => {
  const emerge = new Map<string, Motion.EmergeSpec>();
  const converge = new Map<string, Motion.ConvergeSpec>();
  const candIdx = index_by_id(candExp);
  const liveIdx = index_by_id(liveExp);
  const siteLive = subtree_at(site, liveExp);
  const siteSubs = siteLive ? all_subtrees(siteLive) : [];
  /* HEAD origin, not center origin: when a grow source (or absorb
   * target) is a comp, anchor at its head's box — new material sprouting
   * from a big composite's geometric center reads as a dot materializing
   * amid its children (identity-intro on a large operand was the tell). */
  const head_key_in = (
    idx: Map<number, Exp.t>,
    boxes: ReadonlyMap<string, unknown>,
    key: string
  ): string => {
    const n = idx.get(+key.slice(5));
    return n?.t === "Comp" && n.kids[0] && boxes.has(`node-${n.kids[0].id}`)
      ? `node-${n.kids[0].id}`
      : key;
  };
  const grow_src = head_key_in(liveIdx, live, grabbedKey);
  /* Bystanders are not twins: a comp only clones from / merges into a
   * same-headed comp that itself CHANGED in the rewrite. Without this,
   * double-neg elimination merged its dying negations onto any minus
   * that happened to survive in the site (the mushroom's), and intro
   * cloned its new negations out of it. And comp HEADS never twin-match
   * on their own — they follow their comp (or grow/absorb with it);
   * otherwise the dying glyph flies to an unrelated same-glyph head. */
  const changed_in_rewrite = (id: number): boolean => {
    const l = liveIdx.get(id);
    const c = candIdx.get(id);
    return !l || !c || !Exp.equals(l, c);
  };
  const comp_heads = new Set<number>();
  for (const idx of [candIdx, liveIdx])
    for (const n of idx.values())
      if (n.t === "Comp" && n.kids[0]?.t === "Atom") comp_heads.add(n.kids[0].id);
  /* enters (node layers) */
  for (const key of cand.keys()) {
    if (live.has(key) || !key.startsWith("node-")) continue;
    const n = candIdx.get(+key.slice(5));
    if (!n) continue;
    let spec: Motion.EmergeSpec = { source: grow_src, mode: "grow" };
    if (n.t === "Atom") {
      const m = comp_heads.has(n.id)
        ? undefined
        : siteSubs.find((s) => s.t === "Atom" && Exp.equals(s, n));
      if (m && live.has(`node-${m.id}`))
        spec = { source: `node-${m.id}`, mode: "clone" };
    } else {
      const hs = head_sym(n);
      const m = hs
        ? siteSubs.find(
            (s) =>
              head_sym(s) === hs &&
              live.has(`node-${s.id}`) &&
              changed_in_rewrite(s.id)
          )
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
      const twin = comp_heads.has(g.id)
        ? undefined
        : siteCandSubs.find(
            (s) => s.t === "Atom" && Exp.equals(s, g) && cand.has(`node-${s.id}`)
          );
      if (twin) spec = { target: `node-${twin.id}`, mode: "merge" };
    } else {
      const hs = head_sym(g);
      const twin = hs
        ? siteCandSubs.find(
            (s) =>
              head_sym(s) === hs &&
              cand.has(`node-${s.id}`) &&
              changed_in_rewrite(s.id)
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
      spec = { target: head_key_in(candIdx, cand, siteKey), mode: "absorb" };
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
  settings: Settings.t,
  /* projection pulls probe the SAME exp under a different projection */
  projection: Settings.projection = settings.projection,
  /* optional alignment anchor: position the probe so THIS element's
   * center coincides with the given live point (projection pulls pin
   * the root head — the visible fixed point); default: center-align
   * the whole scene */
  anchor?: { key: string; at: { x: number; y: number } }
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
      <div class={`node-container ${projection}`}>
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
  let dx: number;
  let dy: number;
  const anchorEl = anchor
    ? cont.querySelector<HTMLElement>(`#${CSS.escape(anchor.key)}`)
    : null;
  if (anchor && anchorEl) {
    const ar = anchorEl.getBoundingClientRect();
    dx = anchor.at.x - (ar.x + ar.width / 2);
    dy = anchor.at.y - (ar.y + ar.height / 2);
  } else {
    const lr = live.getBoundingClientRect();
    const pr = cont.getBoundingClientRect();
    dx = lr.x + lr.width / 2 - (pr.x + pr.width / 2);
    dy = lr.y + lr.height / 2 - (pr.y + pr.height / 2);
  }
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

/* Candidate-agnostic display item: the vis draws whatever carries a
 * target, colors, and a label — rewrite candidates and projection pulls
 * both map into this. */
type VisItem = {
  ax: number;
  ay: number;
  color: string; // track + tick stroke
  dotBg: string;
  dotInk?: string; // reversed rules: white field, rule color as ink
  label: () => HTMLElement; // fresh node each call (dot AND t-label use it)
  labelBg: string;
  labelFg: string;
};

type VisState = {
  lines: SVGLineElement[];
  dots: (HTMLElement | null)[];
  foot: HTMLElement;
  tlabel: HTMLElement;
  a0: { x: number; y: number };
  items: VisItem[];
};

let vis_state: VisState | null = null;

/* a pattern's operator multiset (comp heads), for the pluck content */
const pat_ops = (p: Pat.t, out: string[] = []): string[] => {
  if (p.t === "Comp") {
    const h = p.kids[0];
    if (h?.t === "Atom" && h.sym.t === "Const") out.push(h.sym.name);
    p.kids.forEach((k) => pat_ops(k, out));
  }
  return out;
};

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
  window.setTimeout(() => el.classList.remove("drag-glow-flash"), 330);
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

/* rewrite candidates → display items */
const show_vis = (
  grabbedId: ID.t,
  cands: Candidate[],
  targets: { ax: number; ay: number }[],
  a0: { x: number; y: number }
): void =>
  show_vis_items(
    grabbedId,
    cands.map((c, i) => {
      const dark = `hsl(${Math.round(c.idx * 137.508) % 360} 70% 35%)`;
      const solid = track_color({ idx: c.idx, reversed: false });
      return {
        ax: targets[i].ax,
        ay: targets[i].ay,
        color: track_color(c),
        dotBg: c.reversed ? "white" : solid,
        dotInk: c.reversed ? solid : undefined,
        label: () => code_el(c),
        labelBg: c.reversed ? "white" : dark,
        labelFg: c.reversed ? dark : "white",
      };
    }),
    a0
  );

const show_vis_items = (
  grabbedId: ID.t,
  items: VisItem[],
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
  items.forEach((it) => {
    const tg = it;
    const color = it.color;
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
    /* white-field dots mark reversed rules; ink matches the forward dot */
    dot.style.background = it.dotBg;
    dot.style.borderColor = it.dotBg;
    if (it.dotInk) dot.style.color = it.dotInk;
    dot.replaceChildren(it.label());
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
  vis_state = { lines, dots, foot, tlabel, a0, items };
};

const update_vis = (active: number, t: number): void => {
  const s = vis_state;
  if (!s) return;
  s.lines.forEach((ln, i) => ln.classList.toggle("active", i === active));
  s.dots.forEach((d, i) => d?.classList.toggle("active", i === active));
  const it = active >= 0 ? s.items[active] : null;
  if (!it) {
    s.foot.style.display = "none";
    s.tlabel.style.display = "none";
    return;
  }
  const fx = s.a0.x + (it.ax - s.a0.x) * t;
  const fy = s.a0.y + (it.ay - s.a0.y) * t;
  s.foot.style.display = "";
  s.foot.style.left = `${fx}px`;
  s.foot.style.top = `${fy}px`;
  s.foot.style.borderColor = it.color;
  s.foot.classList.toggle("committing", t > COMMIT_T);
  s.tlabel.style.display = "";
  s.tlabel.style.left = `${fx}px`;
  s.tlabel.style.top = `${fy}px`;
  s.tlabel.replaceChildren(
    it.label(),
    ` t=${t.toFixed(2)}${t > COMMIT_T ? " ✓" : ""}`
  );
  s.tlabel.style.background = it.labelBg;
  s.tlabel.style.color = it.labelFg;
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
/* Sticky mechanic: the incumbent track's distance gets this head start
 * before a rival can take over (dragology's `stickiness` option). */
const STICKY_PX = 24;

/* Only one drag at a time: a new grab (or any stuck state) force-ends the
 * previous one. */
let end_current: (() => void) | null = null;

/* e.g. undo mid-drag would yank the world out from under the probes */
export const drag_in_progress = (): boolean => end_current !== null;

/* # Projection pulls (experimental; settings.projectionDrag).
 *
 * The projection STATE MACHINE (design/drag-legibility.md): flat infix is
 * the H-hub, vertical flat the V-hub; trees hang off their hub by fan
 * edges; the hubs connect by rotation about the root. Each edge gets a
 * designed displacement field so the gesture directions stay legible:
 * inline shuffles run ALONG the line, fans run ACROSS it, rotation chords
 * are DIAGONAL. Inline edges use real probes; fan and rotation targets
 * are SYNTHESIZED from the live measurement (phase 1 of the sketch), and
 * the commit's normal animate() handoff supplies phase 2 — the settle
 * into the real committed layout. Rotation rides a two-segment rail
 * through a half-rotation waypoint ("arcs as waypoints": piecewise-linear
 * betweens, no new motion model). Dispatch is RAIL-GAP (dragology's
 * d.closest — see the comment in onMove) over the edges of the CURRENT
 * state only. */
type ProjEdge =
  | { to: Settings.projection; kind: "probe" }
  | { to: Settings.projection; kind: "fan-out"; axis: "x" | "y"; dir: 1 | -1 }
  | { to: Settings.projection; kind: "fan-in"; axis: "x" | "y" }
  | { to: Settings.projection; kind: "rotate"; quarter: 1 | -1 };

const PROJ_EDGES: Record<Settings.projection, ProjEdge[]> = {
  LinearInfix: [
    { to: "LinearPrefix", kind: "probe" },
    { to: "LinearPostfix", kind: "probe" },
    { to: "TreeTop", kind: "fan-out", axis: "y", dir: 1 },
    { to: "LinearInfixV", kind: "rotate", quarter: 1 },
  ],
  LinearPrefix: [{ to: "LinearInfix", kind: "probe" }],
  LinearPostfix: [{ to: "LinearInfix", kind: "probe" }],
  TreeTop: [{ to: "LinearInfix", kind: "fan-in", axis: "y" }],
  LinearInfixV: [
    { to: "LinearInfix", kind: "rotate", quarter: -1 },
    { to: "TreeLeft", kind: "fan-out", axis: "x", dir: 1 },
  ],
  TreeLeft: [{ to: "LinearInfixV", kind: "fan-in", axis: "x" }],
};

/* fixed hues (not golden-angle: these should stay recognizable) */
const PROJ_COLOR: Record<Settings.projection, string> = {
  LinearPrefix: "hsl(205 70% 45%)",
  LinearInfix: "hsl(265 65% 50%)",
  LinearPostfix: "hsl(180 65% 38%)",
  LinearInfixV: "hsl(325 65% 48%)",
  TreeLeft: "hsl(140 60% 38%)",
  TreeTop: "hsl(28 80% 45%)",
};
const PROJ_CODE: Record<Settings.projection, string> = {
  LinearPrefix: "LP",
  LinearInfix: "LI",
  LinearPostfix: "LO",
  LinearInfixV: "LV",
  TreeLeft: "TL",
  TreeTop: "TT",
};
/* destination comp radii, adopted at pull start so pills reshape toward
 * their new arrangement immediately (KEEP IN SYNC with index.css:
 * Linear* comps 1.5em; TreeTop override; TreeLeft uses the .node base) */
const PROJ_RADIUS: Record<Settings.projection, string> = {
  LinearPrefix: "1.5em",
  LinearInfix: "1.5em",
  LinearPostfix: "1.5em",
  LinearInfixV: "1.5em",
  TreeLeft: "3em 1.2em 0.6em 32%",
  TreeTop: "3em 3em 1em 1em",
};

// # Synthetic projection states (derived from the live measurement)

type MMap = Map<string, Motion.Measured>;

const box_center = (b: Motion.Box): { x: number; y: number } => ({
  x: b.x + b.w / 2,
  y: b.y + b.h / 2,
});

const box_union = (boxes: Motion.Box[]): Motion.Box => {
  const x0 = Math.min(...boxes.map((b) => b.x));
  const y0 = Math.min(...boxes.map((b) => b.y));
  const x1 = Math.max(...boxes.map((b) => b.x + b.w));
  const y1 = Math.max(...boxes.map((b) => b.y + b.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0, font: boxes[0].font };
};

/* Comps regrow to contain their moved contents, keeping each side's
 * original padding. Children resolve before parents (depth-descending). */
const regrow_comps = (live: MMap, moved: Map<string, Motion.Box>): void => {
  const kids = new Map<string, string[]>();
  live.forEach((m, id) => {
    if (id.startsWith("node-") && m.parentId)
      kids.set(m.parentId, [...(kids.get(m.parentId) ?? []), id]);
  });
  const comps = [...live.entries()]
    .filter(([id, m]) => id.startsWith("node-") && m.el.classList.contains("comp"))
    .sort((a, b) => b[1].depth - a[1].depth);
  for (const [id, m] of comps) {
    const ch = kids.get(id) ?? [];
    if (ch.length === 0) continue;
    const beforeU = box_union(ch.map((c) => live.get(c)!.box));
    const afterU = box_union(ch.map((c) => moved.get(c)!));
    const b = m.box;
    moved.set(id, {
      ...moved.get(id), // keep radius/rot annotations
      x: afterU.x - (beforeU.x - b.x),
      y: afterU.y - (beforeU.y - b.y),
      w: afterU.w + (b.w - beforeU.w),
      h: afterU.h + (b.h - beforeU.h),
      font: b.font,
    });
  }
};

/* Syms ride their atoms; everything else takes its moved box. */
const finalize_synth = (live: MMap, moved: Map<string, Motion.Box>): MMap => {
  const out: MMap = new Map();
  live.forEach((m, id) => {
    if (id.startsWith("sym-")) {
      const nkey = "node-" + id.slice(4);
      const from = live.get(nkey)?.box;
      const to = moved.get(nkey);
      out.set(id, {
        ...m,
        box:
          from && to
            ? { ...m.box, x: m.box.x + (to.x - from.x), y: m.box.y + (to.y - from.y) }
            : { ...m.box },
      });
    } else {
      out.set(id, { ...m, box: moved.get(id) ?? { ...m.box } });
    }
  });
  return out;
};

/* Heads ride their comp's layer, not their own depth — the root's head
 * stays in the base line while everything deeper fans away from it. */
const fan_level = (m: Motion.Measured): number =>
  m.el.classList.contains("head") ? m.depth - 1 : m.depth;

/* Fan phase 1: "out" shifts every node along `axis` by its level (the
 * all-nodes-stay-in-line intermediate); "in" collapses every node onto
 * the root head's line. Comps regrow around their contents. */
const synth_fan = (
  live: MMap,
  rootKey: string,
  axis: "x" | "y",
  dir: 1 | -1,
  mode: "out" | "in",
  radius: string
): MMap => {
  let unit = 0;
  live.forEach((m) => {
    const cl = m.el.classList;
    if (cl.contains("atom") || cl.contains("head"))
      unit = Math.max(unit, axis === "y" ? m.box.h : m.box.w);
  });
  const step = unit * 1.2;
  let line = 0;
  if (mode === "in")
    live.forEach((m) => {
      if (m.el.classList.contains("head") && m.parentId === rootKey) {
        const c = box_center(m.box);
        line = axis === "y" ? c.y : c.x;
      }
    });
  const moved = new Map<string, Motion.Box>();
  live.forEach((m, id) => {
    if (!id.startsWith("node-")) return;
    const b: Motion.Box = { ...m.box };
    if (!m.el.classList.contains("comp")) {
      if (mode === "out") {
        const off = fan_level(m) * step * dir;
        if (axis === "y") b.y += off;
        else b.x += off;
      } else {
        if (axis === "y") b.y = line - b.h / 2;
        else b.x = line - b.w / 2;
      }
    } else {
      b.radius = radius;
    }
    moved.set(id, b);
  });
  regrow_comps(live, moved);
  return finalize_synth(live, moved);
};

/* Rotation: a RIGID quarter-turn about the root pivot. Every box carries
 * the pivot, so Motion interpolates its center along the true arc (polar
 * path — no waypoint seams); comp pills additionally spin (Box.rot);
 * glyph boxes stay upright — Ferris-wheel motion. */
const synth_rotate = (
  live: MMap,
  rootKey: string,
  deg: number,
  radius: string,
  pivotAt?: { x: number; y: number }
): MMap => {
  const rootBox = live.get(rootKey)?.box;
  const pivot = pivotAt ?? (rootBox ? box_center(rootBox) : { x: 0, y: 0 });
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const moved = new Map<string, Motion.Box>();
  live.forEach((m, id) => {
    if (!id.startsWith("node-")) return;
    const c = box_center(m.box);
    const vx = c.x - pivot.x;
    const vy = c.y - pivot.y;
    const nx = pivot.x + vx * cos - vy * sin;
    const ny = pivot.y + vx * sin + vy * cos;
    const isComp = m.el.classList.contains("comp");
    moved.set(id, {
      x: nx - m.box.w / 2,
      y: ny - m.box.h / 2,
      w: m.box.w,
      h: m.box.h,
      font: m.box.font,
      pivot,
      ...(isComp ? { rot: deg, radius } : {}),
    });
  });
  return finalize_synth(live, moved);
};
const proj_label = (p: Settings.projection) => (): HTMLElement => {
  const span = document.createElement("span");
  span.className = "rule-code";
  span.textContent = PROJ_CODE[p];
  return span;
};

/* Phase 2 of a projection commit: the seed's flex direction can change,
 * teleporting the flanks (noolbox, seed icon). FLIP them: measure before
 * the commit, invert after, glide to rest. (Sizes still snap — the
 * noolbox reshapes under .TreeTop — translate-only for now.) */
const flip_flanks = (els: HTMLElement[], before: DOMRect[]): void => {
  els.forEach((el, i) => {
    const b = before[i];
    const a = el.getBoundingClientRect();
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (Math.abs(dx) + Math.abs(dy) < 1) return;
    el.style.transition = "none";
    el.style.transform = `translate(${dx}px, ${dy}px)`;
    void el.offsetWidth;
    el.style.transition =
      "transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.25s ease";
    el.style.transform = "";
    const done = (ev: TransitionEvent): void => {
      if (ev.propertyName !== "transform") return;
      el.style.removeProperty("transition");
      el.style.removeProperty("transform");
      el.removeEventListener("transitionend", done);
    };
    el.addEventListener("transitionend", done);
  });
};

/* Single-stage fan experiment: fan edges probe the REAL target layout and
 * the drag rides straight there — no intermediate all-in-line state, no
 * phase-2 settle (direct, but per-node rail directions get mixed). Flip
 * to false for the staged fan-then-settle choreography. */
const FAN_SINGLE_STAGE = true;

/* carry destination comp radii onto a measured target so pills reshape
 * continuously across the pull instead of popping at the reveal */
const decorate_radius = (m: MMap, radius: string): MMap => {
  m.forEach((v, id) => {
    if (id.startsWith("node-") && v.el.classList.contains("comp"))
      v.box.radius = radius;
  });
  return m;
};

const grab_projection = (
  model: Model.t,
  inject: Action.Inject,
  grabbedId: ID.t,
  e: PointerEvent
): void => {
  end_current?.();
  const container = document.querySelector<HTMLElement>(
    "#stage .node-container"
  );
  if (!container) return;
  const live = Motion.measure_root(container);
  const key = `node-${grabbedId}`;
  const rootKey = `node-${model.stage.exp.id}`;
  /* the root's head glyph is the gesture family's fixed point: fan/tree
   * targets pin it in place and rotation pivots on it, so the visible
   * operator never moves during a pull (the commit's retarget then does
   * the repositioning as its own stage). Inline edges are the exception:
   * they MOVE the head, so they keep whole-scene centering. */
  let rootHead: { key: string; at: { x: number; y: number } } | undefined;
  live.forEach((m, id) => {
    if (m.el.classList.contains("head") && m.parentId === rootKey)
      rootHead = { key: id, at: box_center(m.box) };
  });
  const liveBox = live.get(key)?.box;
  const rel = liveBox
    ? {
        x: (e.clientX - liveBox.x) / Math.max(1, liveBox.w),
        y: (e.clientY - liveBox.y) / Math.max(1, liveBox.h),
      }
    : { x: 0.5, y: 0.5 };
  const a0 = { x: e.clientX, y: e.clientY };

  const cands = (PROJ_EDGES[model.settings.projection] ?? [])
    .map((edge) => {
      let segments: MMap[];
      let dispose: (() => void) | undefined;
      switch (edge.kind) {
        case "probe": {
          const probe = probe_candidate(model.stage.exp, model.settings, edge.to);
          if (!probe) return null;
          segments = [decorate_radius(probe.measured, PROJ_RADIUS[edge.to])];
          dispose = probe.dispose;
          break;
        }
        case "fan-out":
        case "fan-in": {
          if (FAN_SINGLE_STAGE) {
            const probe = probe_candidate(
              model.stage.exp,
              model.settings,
              edge.to,
              rootHead
            );
            if (!probe) return null;
            segments = [decorate_radius(probe.measured, PROJ_RADIUS[edge.to])];
            dispose = probe.dispose;
            break;
          }
          segments = [
            edge.kind === "fan-out"
              ? synth_fan(live, rootKey, edge.axis, edge.dir, "out", PROJ_RADIUS[edge.to])
              : synth_fan(live, rootKey, edge.axis, 1, "in", PROJ_RADIUS[edge.to]),
          ];
          break;
        }
        case "rotate":
          /* single segment: the polar path (Box.pivot) makes the arc
           * exact — no waypoints, no retarget seams */
          segments = [
            synth_rotate(
              live,
              rootKey,
              90 * edge.quarter,
              PROJ_RADIUS[edge.to],
              rootHead?.at
            ),
          ];
          break;
      }
      const end = segments[segments.length - 1].get(key)?.box;
      if (!end) {
        dispose?.();
        return null;
      }
      const ax = end.x + rel.x * end.w;
      const ay = end.y + rel.y * end.h;
      /* a handle can only drive edges it travels along */
      if (Math.hypot(ax - a0.x, ay - a0.y) < MIN_TRAVEL) {
        dispose?.();
        return null;
      }
      return { edge, segments, dispose, ax, ay };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  const rails = cands.map((c) => {
    const vx = c.ax - a0.x;
    const vy = c.ay - a0.y;
    const len = Math.hypot(vx, vy);
    return { vx, vy, len };
  });

  /* flanks recede while the layout morph sprawls (see index.css) */
  const seed = document.getElementById("seed");
  seed?.classList.add("projection-pulling");

  if (model.settings.dragDebug)
    show_vis_items(
      grabbedId,
      cands.map((c) => ({
        ax: c.ax,
        ay: c.ay,
        color: PROJ_COLOR[c.edge.to],
        dotBg: PROJ_COLOR[c.edge.to],
        label: proj_label(c.edge.to),
        labelBg: PROJ_COLOR[c.edge.to],
        labelFg: "white",
      })),
      a0
    );

  let engaged = false;
  let active = -1;
  let activeT = 0;
  let pointer = { x: e.clientX, y: e.clientY };
  const mechanic = model.settings.dragMechanic;

  const commit_flip = (to: Settings.projection): void => {
    const flanks = [
      document.getElementById("noolbox"),
      document.querySelector<HTMLElement>("#seed .icon2"),
    ].filter((el): el is HTMLElement => el !== null);
    const before = flanks.map((el) => el.getBoundingClientRect());
    inject({ t: "setProjection", projection: to });
    flip_flanks(flanks, before);
  };

  const teardown = (): void => {
    end_current = null;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    seed?.classList.remove("projection-pulling");
    clear_vis();
    Sound.drag_sound_stop();
  };

  /* # Blend: no tracks, no dispatch — the scene is a weighted mixture
   * over [base, ...candidate states] (inverse-square weights on distance
   * to each state's anchor: at the grab point the base owns everything;
   * approaching an anchor hands it the scene). Drop rule = dragology's:
   * nearest anchor at release (base nearest = no commit). */
  const target_of = (c: (typeof cands)[number]): MMap =>
    c.segments[c.segments.length - 1];
  let set_weights: ((w: number[]) => void) | null = null;
  const blend_move = (): void => {
    if (!set_weights) return;
    const anchors = [a0, ...cands.map((c) => ({ x: c.ax, y: c.ay }))];
    const raw = anchors.map(
      (p) => 1 / (Math.hypot(pointer.x - p.x, pointer.y - p.y) ** 2 + 400)
    );
    const sum = raw.reduce((a, b) => a + b, 0);
    const weights = raw.map((r) => r / sum);
    set_weights(weights);
    let mi = 0;
    weights.forEach((w, i) => {
      if (i > 0 && w > weights[mi]) mi = i;
    });
    activeT = mi > 0 ? weights[mi] / (weights[mi] + weights[0]) : 0;
    active = mi - 1;
    update_vis(active, activeT);
    Sound.drag_sound_set(1 - weights[0]);
  };

  const set_active = (i: number, t: number): void => {
    if (i !== active) {
      active = i;
      /* Classic/Sticky: memoryless targets (dragology semantics) with the
       * default branch-switch spring gliding the display across switches */
      Motion.manual_start(target_of(cands[i]), { origin: live, glide: true });
      /* layout-only pull: content multisets are empty, so the plucks are
       * the bare-variable note — a soft tick, deliberately unlike rules */
      if (model.settings.sound) Sound.drag_sound_start([], []);
    }
    activeT = t;
    Motion.manual_set(t);
    update_vis(active, t);
    Sound.drag_sound_set(t);
  };

  const onMove = (ev: PointerEvent): void => {
    pointer = { x: ev.clientX, y: ev.clientY };
    if (!engaged && Math.hypot(pointer.x - a0.x, pointer.y - a0.y) >= ENGAGE_PX) {
      engaged = true;
      if (mechanic === "Blend") {
        set_weights = Motion.manual_field([live, ...cands.map(target_of)]);
        if (model.settings.sound) Sound.drag_sound_start([], []);
      }
    }
    if (!engaged) return;
    if (mechanic === "Blend") {
      blend_move();
      return;
    }
    /* Rail-gap dispatch (dragology's d.closest): perpendicular distance
     * to each rail's clamped projection. Direction-sensitive from the
     * first pixel — endpoint-Voronoi (tried) biases toward NEAR targets,
     * whose cells engulf every initial direction; a far target only won
     * past the endpoint bisector, ~halfway up its own rail. Collinear
     * rails of different lengths stratify naturally: past the short
     * target its projection clamps and its gap grows, so the long rail
     * takes over. */
    const stickiness = mechanic === "Sticky" ? STICKY_PX : 0;
    let best = -1;
    let bestD = Infinity;
    let bestT = 0;
    cands.forEach((_, i) => {
      const r = rails[i];
      const t = clamp01(
        ((pointer.x - a0.x) * r.vx + (pointer.y - a0.y) * r.vy) /
          (r.len * r.len)
      );
      const d =
        Math.hypot(
          pointer.x - (a0.x + t * r.vx),
          pointer.y - (a0.y + t * r.vy)
        ) - (i === active ? stickiness : 0);
      if (d < bestD) {
        bestD = d;
        best = i;
        bestT = t;
      }
    });
    if (best >= 0) set_active(best, bestT);
  };

  const onUp = (): void => {
    teardown();
    if (mechanic === "Blend") {
      if (engaged && set_weights) {
        /* dragology's drop rule: nearest anchor wins */
        const anchors = [a0, ...cands.map((c) => ({ x: c.ax, y: c.ay }))];
        let mi = 0;
        let md = Infinity;
        anchors.forEach((p, i) => {
          const d = Math.hypot(pointer.x - p.x, pointer.y - p.y);
          if (d < md) {
            md = d;
            mi = i;
          }
        });
        if (mi > 0) commit_flip(cands[mi - 1].edge.to);
        else Motion.manual_release();
      }
    } else if (engaged && active >= 0 && activeT > COMMIT_T) {
      commit_flip(cands[active].edge.to);
    } else if (engaged && active >= 0) {
      Motion.manual_release();
    }
    cands.forEach((c) => c.dispose?.());
  };

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
  end_current = onUp;
};

export const grab = (
  model: Model.t,
  inject: Action.Inject,
  grabbedId: ID.t,
  e: PointerEvent
): void => {
  if (model.settings.projectionDrag)
    return grab_projection(model, inject, grabbedId, e);
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

  const mechanic = model.settings.dragMechanic;
  /* Classic/Sticky are MEMORYLESS (dragology semantics): track switches
   * re-originate at the grab-time base, so the display is a pure function
   * of pointer position. Rails keeps capture-the-blend — its knob is
   * deliberately continuous, and switches only happen at the hub where
   * the blend ≈ the base anyway. */
  const base_live =
    mechanic === "Rails"
      ? null
      : (() => {
          const c = document.querySelector<HTMLElement>(
            "#stage .node-container"
          );
          return c ? Motion.measure_root(c) : null;
        })();

  const set_active = (i: number, t: number): void => {
    if (i !== active) {
      active = i;
      Motion.manual_start(cands[i].measured, {
        emerge: cands[i].emerge,
        converge: cands[i].converge,
        origin: base_live ?? undefined,
        glide: true,
      });
      /* drag plucks; content = the rule's operator multisets, walked
       * source → result across the quarter points (see Sound.tsx) */
      if (model.settings.sound)
        Sound.drag_sound_start(
          pat_ops(cands[i].transform.source),
          pat_ops(cands[i].transform.result)
        );
    }
    activeT = t;
    Motion.manual_set(t);
    update_vis(active, t);
    tool_glow(active >= 0 ? cands[active].idx : null, t);
    Sound.drag_sound_set(t);
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

  /* Closest-family dispatch: per-frame nearest-segment — dragology's
   * d.closest gap metric (perpendicular distance to the clamped
   * projection). `stickiness` gives the incumbent a head start
   * (dragology's option; 0 = the demo's memoryless default). */
  const closest_move = (stickiness: number): void => {
    let best = -1;
    let bestD = Infinity;
    let bestT = 0;
    rails.forEach((r, i) => {
      if (!r.ok) return;
      const t = proj_t(pointer, i);
      const d = perp_d(pointer, i, t) - (i === active ? stickiness : 0);
      if (d < bestD) {
        bestD = d;
        best = i;
        bestT = t;
      }
    });
    if (best >= 0) set_active(best, bestT);
  };

  if (mechanic === "Rails") raf = requestAnimationFrame(rails_step);

  const onMove = (ev: PointerEvent): void => {
    pointer = { x: ev.clientX, y: ev.clientY };
    if (!engaged && Math.hypot(pointer.x - a0.x, pointer.y - a0.y) >= ENGAGE_PX)
      engaged = true;
    if (!engaged) return;
    if (mechanic !== "Rails")
      /* Blend has no rewrite-drag form (candidate node sets differ);
       * it behaves as Classic here */
      closest_move(mechanic === "Sticky" ? STICKY_PX : 0);
  };

  const onUp = (): void => {
    end_current = null;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    cancelAnimationFrame(raf);
    clear_vis();
    Sound.drag_sound_stop();
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
