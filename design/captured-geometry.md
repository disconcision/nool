# Draggable nool: captured geometry over CSS layout

Living architectural record for the `draggable` branch. This is both an
implementation plan and a report-in-progress on a general question:

> What does it take to drive dragology-style speculative drag interfaces from
> **captured** geometry (DOM layout measured after the fact) rather than
> **internalized** geometry (a layout model the program owns, as in SVG or a
> custom engine)?

Reference implementation: the `animate-algebra` demo in the dragology repo
(`draggable-diagrams/src/demos/animate-algebra/tree.tsx`), which is
"draggable nool" rendered in React+SVG.

Update this document as decisions are made or reversed. Keep the decision log
append-only; strike out reversed decisions rather than deleting them.

## Thesis (running)

- Dragology's engine needs surprisingly little from its rendering substrate:
  `render(state) → per-id layers`, a way to resolve a point per layer, a lerp
  over layers, and hit-testing. SVG's only real contribution is that geometry
  is readable *without mounting* — positions live in transform attributes.
- For **discrete** drag specs (`closest` over `between`s of fixed states — the
  nool interaction), candidates are enumerated and rendered once per drag at
  pointerdown; per-frame work is pure math (Delaunay-weighted lerp of
  already-rendered trees keyed by id). Only `d.vary` (continuous optimization)
  renders per frame (~200×/frame), and nool doesn't need it.
- Therefore captured geometry is viable: batch-measure K candidate states in
  hidden mounts at pointerdown; never measure per frame. The feared
  "render the scene many times per frame" problem does not arise for discrete
  rewrites.
- The capture layer is an **adapter, not a compromise**: the drag/animation
  system is written against "per-id boxes + shallow visual content", and the
  box *source* is pluggable — gBCR over CSS today, a JS layout function later,
  a 3D projection eventually. Internalization becomes a gradual migration
  behind a stable interface, not a rewrite. SVG is a sidetrack: it demands the
  full internalization cost up front (hand layout, no text metrics, port all
  styling) while being the least capable target and off the road to 3D.
- Slogan version: dragology hoists actual elements because SVG has no layout
  to disturb. In CSS, *the clone is the price of hoisting, and the
  computed-style snapshot is the price of the cascade.* Capture turns layout
  outputs into transform inputs; flattening turns the cascade into a snapshot.

## How dragology actually works (facts that shaped the design)

Established by code survey of the engine (2026-07-29):

- Geometry is fully analytic; the engine never measures the DOM. An element's
  position in a state = a local anchor point pushed through accumulated
  `translate/rotate/scale` transform strings from the unmounted element tree.
- `d.between` over N states: N renders at drag start, Delaunay triangulation
  of anchor positions, per-frame pointer→barycentric weights→N-ary lerp of
  whole trees matched by id. Enter/exit = opacity fades; `dragologyEmergeFrom`
  fabricates a synthetic "before" so new nodes grow out of their source.
- Animation: no springs — a frozen whole-tree snapshot of *whatever is
  currently on screen* (origin) blended toward a live-recomputed target on an
  easing clock. Retargeting re-snapshots the current blend as the new origin:
  jank-free by construction. This is the retargetability that view
  transitions lack.
- Drop: behavior runs once at release; nearest candidate anchor wins; settle
  tweens from on-screen pixels to the drop state. `withSnapRadius(_, {chain})`
  re-enumerates from the committed state mid-drag (event-scale, not
  frame-scale).
- The algebra demo's spec: grab node → pattern-match rewrites whose
  `#`-trigger is the grabbed node → 
  `d.closest(cands.map(c => d.between([cur, c]))).withSnapRadius(1, {chain:true})`.
  Node identity survives rewrites (wildcard bindings keep ids; the dragged
  node's id survives preferentially); duplicating rewrites give copies fresh
  ids + `emergeFrom` provenance.
- Even the SVG demo hand-computes box layout in JS. SVG provides readback,
  not layout.

## Decision log

- **2026-07-29 — Whole-scene morph, not floating.** Drag feel is `between`
  (the entire scene interpolates toward the candidate), emphatically not
  `withFloating`. Happily also the cheaper option (no floating-layer algebra).
- **2026-07-29 — Capture-first, internalize-by-degrees, SVG never.**
  Rationale in Thesis. First internalization step, when it comes, is the
  hybrid: measure leaf glyph metrics (cacheable per symbol × size), compose
  boxes analytically. Triggers that would make internalization due:
  continuous `vary`-style interactions; layouts CSS can't express (radial,
  force-directed, curved connectors); animating layout itself at 60fps; 3D.
- **2026-07-29 — Flattened clone overlay, not in-place nested FLIP.**
  For repositioning, nesting buys nothing: every element's blended global box
  is directly computable and that's all a transform needs. Nesting in CSS is
  load-bearing for three things a morph must override anyway:
  1. *Layout coupling* — parent geometry derives from children in flow.
     In-place compensation fights recomputed layout every frame; parent size
     change forces a choice between scale-faking (distorts radii/glyphs) and
     real width/height animation (reflow that re-couples children).
  2. *Stacking* — an element can't escape an ancestor's stacking context, and
     every transformed ancestor is one; crossing subtrees (commute) and
     raise-the-grabbed-node need free per-layer z (dragology `stackingPath`).
  3. *Opacity* — parent opacity multiplies onto children; identity
     elimination (op fades, operand survives and departs) is impossible
     in-place without ad hoc reparenting — which *is* flattening.
  Failure-mode asymmetry: in-place fails *continuously* (mid-flight jitter
  from compensation vs layout, plus fragility to any reactive rebuild);
  overlay fails *at the boundaries* (a pop if clones aren't pixel-identical),
  which is a bounded engineering problem. nool's DOM is flattening-friendly:
  comp heads are their own id'd nodes, so a comp's shallow clone is just the
  rounded-rect background; glyphs travel as their own layers.
- **2026-07-29 — View transitions out; one retargetable tween layer for
  clicks and drags.** The current inject serializes all interaction behind an
  active transition (~0.5s hover queue) — fatal for drag. Replacement:
  dragology's origin/target scheme in box space (origin = current on-screen
  boxes, target = measured boxes of new state, retarget = re-snapshot).
  Button clicks and drags are the same mechanism driven by clock vs pointer.

## The substrate contract (what the overlay implements)

Per drag (or per click-animation):

- `enumerate(grabbedId) → candidateStates[]` — via rule matching with trigger
  annotations (see prerequisites).
- `measure(state) → SnapshotMap: id → {box, scale, styleSnapshot, shallowContent}`
  — render state into a hidden container (same width, computed-style capture),
  batched gBCR reads, dispose. Solid's synchronous `render()` makes this a
  clean single-beat operation.
- `overlay(snapshots) → per-id flat layers` — shallow clones (element minus
  id'd descendants), absolutely positioned, explicit px font-size, z from
  depth + grabbed-status.
- per frame: `weights(pointer) → blend(boxes, opacities)` — transform +
  width/height + opacity on flat layers only; zero scene layout.
- boundary discipline: build overlay + hide base in one frame; at settle end,
  swap back only when the re-rendered base measures identical.

## Prerequisites in nool (mostly also the cleanup the code needs anyway)

1. **DOM stability**: views are invoked as plain function calls, so any store
   write (including tool hover) rebuilds the whole stage DOM; expression
   `<Index>` keys by position so `#node-N` migrates between elements. Fix:
   real component boundaries, id-keyed `<For>`. The Elm architecture (single
   store, whole-model update) stays; only the boundaries change.
2. **Remove view transitions** (Animate.tsx dynamic assignment, inject
   branching, hover deferral) in favor of the box-tween layer.
3. **Trigger annotations on rules**: nool patterns anchor at the selected
   path; dragging needs "grab node X → which (rule, site, variant) fire".
   Design task, not plumbing — feel depends on which grab-points each
   conceptual rule exposes (op vs operand vs sideways variants).
4. **`freshen` → emerge provenance**: duplicating rules currently give copies
   anonymous fresh ids (reads as vanish+appear). Record `emergeFrom` instead.
   Prior art: the commented-out delayed-freshen block in Update.tsx.
5. **Mid-drag hygiene**: a `dragging` class suppressing hover `scale:1.02`,
   pulse keyframes, `:active` wobble (precedent: `.notransition` switches).
6. Scale quirks capture handles automatically (but internalization would have
   to model): `#stage` font-size = 4/(depth+1)em (depth-changing rewrites
   re-zoom the scene — the box lerp morphs it smoothly); toolbox at 0.4em vs
   stage if cross-boundary drags ever happen.

## Rule gating (game design, sketch)

- One tool per *conceptual* rewrite; trigger-variant fan-out (pull-op /
  pull-operand / sideways) lives inside the tool, not as separate toggles
  (the demo's checkboxes are intentionally over-granular).
- Acquisition: pick up / put down transforms (earned by beating levels);
  separately, enable/disable among owned tools; possibly curated presets of
  non-conflicting loadouts.
- **Conflict has an operational definition**: two enabled rules conflict when
  some grab yields candidates whose anchor targets are geometrically too
  close to disambiguate (cf. the demo marking pull-sideways as conflicting
  with commutativity). So conflict is checkable at enumeration time from
  measured candidate geometry — can warn on loadouts, or only flag actual
  ambiguous grabs contextually.

## Plan

1. Stability + VT removal + box-snapshot tween layer, proven on existing
   *button* clicks (a win even if drag stalls).
2. Hidden-mount candidate measurement: pointerdown → enumerate (via existing
   `PreView.do_transforms` / `Pat.matches_at_id`) → measure → visualize
   anchors.
3. Overlay + `between` over one id-pure rule (commute) to validate feel.
4. closest-of-betweens + snap + chain; then emerge for identity/distribute.

## Open questions

- Trigger-annotation surface for the 9 rules: which grab-points per rule?
- Anchor semantics: dragology uses the grab point in the dragged element's
  local frame; with boxes we'll approximate via relative offset within the
  box — revisit if it feels off for wide nodes.
- Drop choice: dragology picks nearest candidate *anchor*, not max blend
  weight — keep or align? (They can disagree; with measured geometry maybe
  more often.)
- Overlay coordinate root and scroll handling; theme/dark-mode context
  container for clones.
- How chain re-measurement interacts with the depth-rescale (scene zoom
  mid-chain).

## Report notes (capture-vs-internalize observations as they accrue)

- (seed) Costs unique to capture: clone fidelity tax (computed-style
  snapshot), boundary-swap discipline, re-measure on resize/font-load,
  no continuous optimization (`vary`) without per-frame mounting.
- (seed) Costs unique to internalize: own text metrics, reimplement the
  cascade's conveniences (theming, hover styling), port every layout mode,
  lose free browser layout for everything else in the app.
- (seed) Both need: stable ids across states, emerge provenance, retargetable
  origin/target tweening, trigger-annotated rules.
