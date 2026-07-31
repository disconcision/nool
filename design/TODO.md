# TODO — consolidated index (draggable branch)

Single place to find remaining work. Detail lives in the referenced docs;
items listed in full here are NOT recorded elsewhere.

## Recorded elsewhere (see those files for detail)

- **design/captured-geometry.md** — plan step 4 "Still open": chaining
  (multi-rewrite drags); click-path emerge (plumb the rewrite site into
  noolbox actions); Pat-level provenance, execution half (rewrites record
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

## Not recorded elsewhere (canonical here)

### Decisions awaiting Andrew
- Rails vs Closest drag mechanic: comparison toggle exists (8th corner
  icon); pick one, delete the other.
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
