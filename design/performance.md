# Performance at scale — the walls and their fixes

Audit of the post-draggable architecture against large trees
(2026-07-31). Nothing here bites at current demo sizes; this doc exists
so that when something starts hitching, the diagnosis and the fix are
already written down. Costs below scale with **visible** node count —
see "Folding is the perf feature" at the end.

The good news first: the update path is sound. ExpView renders real
components with `<For>` keyed on kid object identity, so a rewrite only
churns the DOM it touches; Statics/freshen/persist/history are linear
with small constants; nothing in the hot paths is accidentally
quadratic. The walls are all constant-factor or locality problems.

## Wall 1: grab-time candidate probing (will hitch first)

Drag.candidates(): every candidate rewrite eagerly gets a FULL hidden
render of the entire resulting expression (probe_candidate → ViewOnly →
layout) plus a per-node measure pass, at pointerdown. Candidate count ≈
grab depth × active rules × 2 directions; each enumerated match also
pays a whole-tree freshen and an Exp.equals dedup against prior
candidates. All probes stay mounted (visibility:hidden still occupies
the layout tree) for the whole drag.

Cost model: O(candidates × n) at pointerdown, plus k extra tree copies
weighing down every layout during the drag.

Fixes, in order of value:
- **Site-local probes.** A rewrite at `site` only changes the subtree
  there; probe the candidate subtree in a context shell instead of the
  whole expression, splice measured boxes over the live measurement of
  the unchanged remainder.
- Lazy probing: probe on approach (when a candidate's anchor enters
  some radius) instead of all-at-pointerdown.
- Cache probes keyed by (site, rule, direction) across grabs of the
  same expression state.
- Loadout gating already bounds the rule factor — folders/per-world
  loadouts (see binary.md) keep it bounded as the rule count grows.

Trigger: pointerdown-to-first-frame > ~100ms in drag mode.

## Wall 2: Motion measures globally, morphs can layer-explode

Motion measures EVERY `node-`/`sym-` element before and after every
animated update (two forced-layout sweeps), regardless of how local the
rewrite is. The layer model is already smart — rigid subtrees stay
single full-clone layers; translate-mode layers rasterize once — but a
root-adjacent rewrite of a big tree makes a large deforming region:
many box-mode layers, each interpolating left/top/size/font per frame
(per-layer layout+paint every frame).

Fixes:
- **Site-scoped capture**: the action knows its site; measure and
  layer-split only within the site's enclosing region and treat
  everything outside as one rigid group (it is one, by construction).
- Cap box-mode layer count; beyond the cap, coarsen: promote whole
  subtrees to single layers even if slightly non-rigid (small interior
  error beats frame drops).

Trigger: morphs visibly stutter on large rewrites; profiler shows
per-frame layout inside the overlay.

## Wall 3: shadow paint (the known one)

Stacked per-node box-shadows/gradients/text-shadows; already measurable
at ~30 nodes (hence Shift+S/Shift+D and the shadow-strategy
reevaluation pinned in pinned.md — nine-slice sprite etc.). At
hundreds of visible nodes this is the difference between fluid and
slideshow, on every repaint of the stage layer.

Fixes: pinned.md owns the real redesign (pre-baked sprites). Cheap
interim: auto-degrade — flip to the cheapshadows tier when visible node
count exceeds a budget, restore below it. Also consider
content-visibility for offscreen/clipped regions if scrolling stages
ever exist.

Trigger: any repaint-heavy interaction (hover sweeps, morph teardowns)
slows as node count grows; DevTools paint profiler dominated by
shadow rasterization.

## Wall 4: hover churn

`.node:hover:not(:has(.node:hover))` scale + `filter: brightness()` on
hover: every mousemove across the tree does :has() invalidation walks
and repaints the hovered subtree (filter creates/destroys a temp
layer). Imperceptible now; measurable at high node counts. (The
world-tree branch additionally had px translate-nudges on innermost
hover — rejected, do not port.)

Fixes: drop the :has() variants for a plain innermost-only effect via
a JS-set class on pointerover (one class toggle, no selector walk), or
accept ancestor-scale and delete the :has rules; prefer transform/
opacity-only hover effects (no filter).

Trigger: mousemove across a big tree shows style-recalc spikes.

## Smaller notes

- Preview strip (selection mode): each matching rule renders a full
  copy of the SELECTED subtree — selecting near the root of a big tree
  renders k big trees. Gate by subtree size or render previews
  simplified/truncated.
- Candidate/preview dedup are O(k²·n) (pairwise Exp.equals) — fine
  while k is small; revisit if loadouts grow.
- Persist serializes the whole model per action (debounced) — linear,
  fine; revisit only if worlds get huge.

## Folding is the perf feature

World-tree's fold system projects the tree BEFORE render
(Projector.project_folds): folded content produces no DOM, no paint,
no measure targets, no probe weight, no hover surface. Every wall
above scales with the visible projection, not the world. Folding a
big region is semantic content-visibility — so "collapse the tree and
still have good performance" is not a compromise, it's the design.
Port notes when folds land: a folded pill is exactly a rigid Motion
group (morphs as a unit, free); drag enumeration should skip sites
inside folds (matching semantics decision in binary.md applies);
world-tree's projected_width recomputed the projection twice per
render for a console.log — don't inherit that.
