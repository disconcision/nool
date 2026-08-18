# TODO — consolidated index

Single place to find remaining work. Detail lives in the referenced docs;
items listed in full here are NOT recorded elsewhere.

## Recorded elsewhere (see those files for detail)

- **design/captured-geometry.md** — plan step 4 "Still open": chaining
  (multi-rewrite drags); Pat-level provenance, execution half (rewrites record
  correspondence — subsumes comp-match ambiguity and clone-source edge
  cases; the affordance half — pattern-level moverhood — landed
  2026-07-30, restoring the factor-via-shared-die gesture symmetrically);
  near-collinear rail acquisition tie-breaks. Also its findings entry
  "Rule gating (game design, sketch)".
- **design/pinned.md** — shadow strategy reevaluation (nine-slice sprite
  etc.) + Shift+D default decision; drag overlap legibility (shadow + scale
  on held subtree, dim the rest); toolbox motion (tool flips snap; extend
  motion layer to pat-* ids); mobile gaps (touch toolbox scroll, landscape
  crampedness, touch equivalents for keyboard/debug shortcuts).
- **design/sound.md** — the channel model (meaning → audio channel), the
  plucks decision, the derivation ladder (size delta → operator multiset →
  pattern melody), pan sketch; open: undo/redo sound.
- **design/drag-target-decomposition.md** — tree-edit vs layout-reaction
  in drag targets; site-frame rail correction (open, next) and staged
  choreography (open, designed experiment); figs/rail-variants.png.
- **design/binary.md** — binary moon arithmetic plan (snoc convention,
  corrected rule set, classifier-not-types, digit rendering, macro
  outlook); reference prototype is the world-tree branch (PR #3,
  port-don't-merge).
- **design/performance.md** — the four scaling walls (grab probing,
  global motion measurement, shadow paint, hover churn) with fixes and
  bite-triggers; folding-as-projection is the collapse-perf answer.
- **design/drag-legibility.md** — ambiguity taxonomy (coincident /
  directional / undraggable), detection tiers, static vs dynamic
  indication, control-vs-display geometry (rail fanning), loadout
  presets, projection legibility + quasi-modal projection drags,
  provenance moverhood, chain ("pass-off") as future toggle. Subsumes
  the game-track "loadout conflict detection" sketch.

## Midterm track (world-tree successor — being scoped with Andrew)

- Binary rules + digit rendering + classifier (design/binary.md).
- Folds/quasifolds + folders on BOTH stage and noolbox; fold state
  likely as syntax-level annotation (erased by matching/equality) —
  decision pending; fold-down must reach EXACTLY the current UI (no
  persistent "⋯" chrome; seed click as the reveal/hide toggle for
  top-level fold handles on both sides is the candidate gesture).
- Fold-matching semantics: folding signals keep-whole intent —
  variables may bind folded subtrees; structural matching inside folds
  shouldn't fire silently (either gated out or fold-breaking).
- Multiple stages / world tree: nomenclature leaning — the world tree
  is everything rooted at the seed (noolbox + stage + eventually
  settings), folders within both sides.
- Some ability to create new stages, sooner rather than later (full
  builder ergonomics deferred; "is building a sequence of rewrites?"
  question parked — note the unsurfaced maker tools in Tools.tsx
  `_init` already model building as hole-filling rewrites).
- Macro recorder (speculative until designed): dragology derive-by-diff
  (before/after snapshot → rule, both directions), not action-sequence
  replay; macros are ordinary Rewrites, hence toolbox citizens.
- Projection machine follow-ups (drag-legibility.md): per-edge
  enable/disable surface for the projection transformations; whether
  flat infix becomes the standard/default mode; root-pinning across
  commits (recentering loses mental context — sigil-anchor territory);
  tree-up / tree-right to complete the rose.

## Not recorded elsewhere (canonical here)

### Decisions awaiting Andrew
- Drag mechanic: 4-way comparison toggle (second top-left icon), round
  2 — Classic · Sticky · Rails · Blend (see drag-legibility.md Rounds
  5–6; the memoryless-vs-memory and track-vs-field axes). ALL modes
  committed intact 2026-08-09 — committed ≠ decided; the verdict is
  still open. Until it lands: new drag features target Classic first,
  other mechanics opt in explicitly; unexercised modes have no tests
  and can rot silently, so re-check each before comparing. Also still
  switchable: FAN_SINGLE_STAGE in Drag.tsx (single-stage vs staged fan
  choreography). After the verdict, delete the losers.
- (superseded history) Round 1 of the toggle was Rails · Closest ·
  Sticky · Snap; Snap and its bullseye icon are deleted. Analysis vs the dragology demo
  (2026-08-03): the demo's dispatch is d.closest of two-state d.betweens
  with stickiness 0 + withSnapRadius(1, {chain:true}); for two-state
  betweens its gap = perpendicular distance to the clamped projection
  and its drop rule = nearest endpoint, so nool's CLOSEST at COMMIT_T
  0.5 is already the exact analog minus the snap layer. Sticky adds
  dragology's stickiness hysteresis (STICKY_PX); Snap adds the
  snap-radius click-into-place (SNAP_PX) WITHOUT the chain half —
  chaining (commit mid-drag, re-enumerate, keep pulling) remains the
  real delta and is already the top open item in captured-geometry.md.
  Eventually: pick one mechanic, delete the rest.
- Other dragology combinators noted as candidate experiments, unbuilt:
  whenFar background (pull far from all tracks → disengage/cancel
  affordance, with gapIn/gapOut hysteresis); between `sharpness` (ease
  the blend toward endpoints); withFloating ghost as a whenFar fallback
  only (whole-scene morph stays the committed feel — floating rejected
  as the primary); d.vary is the internalization trigger, out of scope.
- Debug defaults when tuning ends: drag-debug overlay currently ON by
  default; Shift+S / Shift+D toggles and `window.__knob` debug global
  should be removed or gated.

### Game-design track (mechanism sketch in captured-geometry.md)
- Rule ACQUISITION: pick up / put down transforms, earned via levels
  (loadout toggles are only the enable/disable half).
- Loadout conflict detection: geometric-ambiguity checking at enumeration
  (coincident/near-coincident anchors), warnings or disambiguation;
  curated presets.
- Loadout persistence: tools.dragActive resets on restart (Escape) and
  isn't persisted across sessions.

### Polish (Andrew's observations, not yet acted on)
- Noolbox recess lip: the bottom turquoise line reads thicker than the
  top edge; the top has a nice cast shadow below (maybe wants slightly
  more) but lacks a brightness lip on its upper part. Subtle and easy to
  overdo — parked. (An edge fade-out was tried and reverted: it dissolved
  the hard lines that make the recess read as a slot; but the current
  hard cutoff is also "close but imperfect".)
- Noolbox exact-fit height (no truncated bottom row) would need
  JS-driven resizing with a moving bottom lip, or elastic inter-rule
  gaps — both judged worse than truncation for now; see discussion.

### Pending verdicts / watches
- Shift+A harmony experiment (sound.md): keep or delete after listening.
- Sound pan (concept 3, sound.md): queued, unbuilt.
- Adjacent-possible previews: PARKED 2026-08-03 — toggle removed from
  the settings panel (it also wasn't rendering, cause undiagnosed, and
  Andrew judged the current form not useful). Code retained end to end:
  PreView.tsx, settings.preview + TogglePreview, the SeedView Show.
  Revisit as a redesign, not a re-enable.
- Stuck-mid-tween drag state (reported, never reproduced in three
  scripted chaos campaigns): guards landed — if it recurs, check the
  console for "manual_start: empty before-capture" and whether
  window.__knob.frames is still advancing; either datum bisects the
  hypothesis space.
- Die loses blue tint during merge flights: diagnosis + candidate fix
  in captured-geometry.md findings (backdrop baking); Andrew to call.

### Icon workflow (idea, unbuilt)
- Trying icon candidates in context: fetch SVGs by concept from the
  Iconify API (aggregates 200+ open sets, no auth:
  api.iconify.design/<set>/<name>.svg) into assets/icons/candidates/,
  plus a one-page "icon lab" rendering each candidate at actual corner
  size with the app's invert filter and hover styling. Noun Project API
  (Andrew has an account) as the alternative source, same lab.

### Meta
- Distill the capture-vs-internalize REPORT from captured-geometry.md's
  findings into a standalone write-up while fresh.
- Code cleanup nits: unused imports/dead consts (Toolbar, ModelField,
  palette_1/2, ded), `flipping` dep in package.json.

### Long-horizon (context in memory + first design discussion)
- Internalization triggers to watch for: vary-style continuous drags,
  non-CSS layouts, animating layout at 60fps, 3D.
- Toolbox as a drag surface (tools-as-draggables, palette drags à la
  stage-builder demo).
