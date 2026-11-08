import { compact } from "./view/SettingsView";

/* Compact-layout stage fit.
 *
 * On phones the stage shares a small screen with the seed and the noolbox
 * (or its spine), and some states don't fit at the base scale — linear
 * projections run far wider than tall, and the folded-box boost
 * (--stage-boost) makes everything bigger on purpose. This shrinks the
 * stage (never enlarges it) just enough that the whole stack fits inside
 * #seed, via --stage-fit on #seed, which StageView's font-size and Drag's
 * probe both multiply in.
 *
 * Runs synchronously after each state change, before Motion's "after"
 * measurement (Motion.set_after_apply), so a refit morphs with the
 * rewrite instead of jumping after it; and on resize. Desktop: no-op (the
 * variable is removed). */

const MARGIN = 10; // px kept clear at the seed's edges
const EPS = 0.01;

const current = (seed: HTMLElement): number =>
  parseFloat(seed.style.getPropertyValue("--stage-fit")) || 1;

export const refit = (): void => {
  const seed = document.getElementById("seed");
  const stage = document.getElementById("stage");
  const cont = stage?.querySelector<HTMLElement>(":scope > .node-container");
  if (!seed || !stage || !cont) return;
  if (!compact()) {
    if (seed.style.getPropertyValue("--stage-fit"))
      seed.style.removeProperty("--stage-fit");
    return;
  }
  const cur = current(seed);
  const cs = getComputedStyle(seed);
  const column = cs.flexDirection.startsWith("column");
  const gap = parseFloat(column ? cs.rowGap : cs.columnGap) || 0;
  /* the seed's content box */
  const sr = seed.getBoundingClientRect();
  const availW =
    sr.width -
    parseFloat(cs.paddingLeft) -
    parseFloat(cs.paddingRight) -
    2 * MARGIN;
  const availH =
    sr.height -
    parseFloat(cs.paddingTop) -
    parseFloat(cs.paddingBottom) -
    2 * MARGIN;
  /* the stage at fit 1 (its size is proportional to the fit) */
  const cr = cont.getBoundingClientRect();
  const natW = cr.width / cur;
  const natH = cr.height / cur;
  if (natW <= 0 || natH <= 0) return;
  /* everything else in the stack, along the stack direction */
  let others = 0;
  let count = 0;
  for (const el of Array.from(seed.children) as HTMLElement[]) {
    if (el === stage) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue; // display:none
    if (getComputedStyle(el).position === "fixed") continue;
    others += column ? r.height : r.width;
    count++;
  }
  const along = (column ? availH : availW) - others - gap * count;
  const across = column ? availW : availH;
  const fit = Math.min(
    1,
    along / (column ? natH : natW),
    across / (column ? natW : natH)
  );
  const next = Math.max(0.25, fit);
  if (Math.abs(next - cur) < EPS) return;
  if (next >= 1 - EPS) seed.style.removeProperty("--stage-fit");
  else seed.style.setProperty("--stage-fit", next.toFixed(3));
};
