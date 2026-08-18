# Drag legibility — ambiguity, loadouts, projections

Andrew's framing (2026-08-03): the drag mechanic's primary failure mode
so far is that only a few rules can be enabled at once, and WHICH
subsets coexist well is neither obvious nor currently surfaced. This
doc taxonomizes the problem and collects candidate mechanisms. Nothing
here is built yet.

## Degeneracy taxonomy

For a grab of node g with anchor a0, each candidate i has a target
anchor a_i (where g lands) and result exp e_i. Rails are the segments
a0→a_i. Distinct failure classes:

1. **Result-identical** (e_i ≡ e_j): already silently deduped at
   enumeration (first wins). Harmless dynamically, but the silence
   hides e.g. two sites of commutativity yielding the same exp.
2. **Target-coincident** (|a_i − a_j| ≈ 0, e_i ≠ e_j): the true
   ambiguity — pointer position at commit cannot distinguish them.
   Canonical pair: additive vs multiplicative identity (both wrap g;
   near-identical displacement). Note MIN_TRAVEL only filters targets
   coincident with the START; pairwise coincidence between candidates
   is currently unfiltered — dispatch resolves it by enumeration
   order, i.e. arbitrarily.
3. **Directionally-degenerate** (small angle between rails, different
   lengths): distinguishable only by distance along the shared ray.
   "Drag past the near one" works but feels awkward; near-collinear
   acquisition tie-breaks are already a known Rails issue
   (captured-geometry.md).
4. **Undraggable rules**: no grab choice survives the rewrite
   (grab_is_mover fails everywhere — e.g. inverse_plus forward from
   🌑). Today these silently generate no candidates: invisible in
   drag mode.

## Detection

Everything above is computable from data the grab path already has
(anchors, exps). Two tiers:

- **Intrinsic (pattern-level)**: per rule PAIR, independent of the
  stage — do their triggers admit a common match with the same
  displacement class? Both identities wrap ANY node → always conflict;
  commute+ vs commute× need different heads → never conflict at a
  shared grab. Computable once, offline; classifies pairs
  always/never/sometimes.
- **Incidental (exp-level)**: the "sometimes" class needs actual
  enumeration+probing against the current stage (per grabbable node).
  Costs are the grab-probe costs (performance.md wall 1); run it
  lazily on loadout change / idle, not per frame.

Thresholds: coincident if |a_i − a_j| < ~MIN_TRAVEL; directional if
angle < some θ AND the shorter rail's end is within the longer rail's
snap/commit corridor.

## Indication: static vs dynamic

The "aesthetic vs dynamic" question decomposes:

- **Static (loadout-time)**: conflict marks in the noolbox when an
  enabled pair can collide — e.g. the loadout-glow equals of
  conflicting rules pulse in a shared warning tint, or a thin thread
  connects them. Powered by the intrinsic tier (cheap, exp-independent)
  with exp-level refinement when available.
- **Dynamic (drag-time)**: the rails themselves show it — coincident
  bundles rendered as visibly stacked/braided rails is the honest
  display of "this pull is ambiguous."

## The key move: control geometry ≠ display geometry

Rails are ALREADY an abstraction — straight control segments in anchor
space, regardless of the curved motion the morph actually displays.
Nothing forces control space to inherit display space's degeneracies:

- **Fan the bundle**: when k candidates share a direction, splay their
  control rails into a small angular spread around it (radial-menu
  logic). The morph preview still shows the true target; the pointer
  now has somewhere to go. This directly answers "with the simple
  dragology mechanic there really is nowhere" — manufacture somewhere.
- **Distance stratification**: stagger tied targets at different
  control lengths (consistent ordering → learnable).
- **Wiggle-toggle**: on a tied rail, small perpendicular motion cycles
  which candidate is active (stickiness makes this stable); the
  differing emerge-content (🌑➕ vs 🌘✖️) is the visible feedback.
- **Waypoint choice**: pulling to the shared target enters a pending
  state; a second gesture direction picks the winner (quasi-modal).

Fanning is the most promising: it degrades gracefully (zero fan when
no conflict) and is exactly the kind of small honest lie radial menus
normalized. Open question: fan statically (always, per conflict) vs
only after the pointer nears the shared corridor.

## Loadout management

- Conflict graph (nodes = enabled rules, edges = detected conflicts on
  the current stage) → maximal conflict-free subsets = **suggested
  presets**. Manual toggles stay as the escape hatch, but per Andrew
  raw toggling is probably never a good player experience.
- Game framing: conflicts as design material, not just failure —
  rules-as-inventory ([[nool-game-vision]]) makes loadout composition
  a meaningful choice; levels can be tuned conflict-free early and
  conflict-managed later. (Extends the existing "Loadout conflict
  detection" game-track TODO item.)

## Projections

Directional legibility varies by projection: linear projections squash
anchors onto one axis (worst case — everything collinear); spatial ones
spread them. Consequences:

- A **legibility score** per (exp, loadout, projection) — e.g. min
  pairwise rail angle/target distance over grabbable nodes — makes
  "this transformation is cramped here, stretch to 2D?" an automatic
  suggestion.
- **Quasi-modal projection dragging**: a projection switch is already
  a Motion morph of the same exp; a same-exp-other-projection render
  is exactly a probe candidate. So "shift-drag (or background-grab) to
  stretch a linear expression up into a tree" is the EXISTING candidate
  machinery pointed at projection states instead of rewrite states —
  projection rails alongside rewrite rails. Conceptually pleasing:
  UI state manipulated by the same gesture language as syntax
  (foreshadows the meta-level).
  **Status: first experiment LANDED (2026-08-03)** as a modal toggle
  (settings.projectionDrag, the fan icon, 4th top-left) — when on,
  node pulls morph between the other three projections instead of
  rewriting (Drag.grab_projection; commit = setProjection action).
  v1 dispatch is NEAREST-TARGET (endpoint Voronoi), not nearest-rail:
  the two Linear targets share a direction, and rail-gap dispatch made
  whichever enumerated first unreachable — a live instance of taxonomy
  #3 resolved by changing the metric rather than fanning (fanning still
  applies to the rewrite case, where targets are meaningful positions).
  While a projection pull is in flight the flanks (noolbox, seed icon)
  recede to opacity 0.12 — the sprawling morph overlaps their space and
  the dim doubles as the modal-state indicator. Commits are TWO-PHASE:
  the stage morph rides the pull; on release the flanks FLIP-glide to
  their new seed arrangement instead of teleporting (translate-only;
  the noolbox's TreeTop reshape still snaps). The debug overlay now
  works here too (vis refactored candidate-agnostic; projection dots
  carry LP/LI/TL/TT codes with fixed hues). Live finding: HANDLE
  QUALITY varies per node — grabbing a node whose position coincides
  across two projections (the debug dots stack) makes those two
  indistinguishable for that grab; pick a different handle. The
  aspirational fix for the seed-jump entirely is a SIGIL-ANCHORED seed
  layout (the ∞ pinned, stage and noolbox arranged around it) — a
  world-tree-era refactor, not a patch. Folding the experiment into
  rewrites-plus-modifier comes after feel testing.
  Porting notes: (1) the #seed:has(.Linear…) layout selectors had to be
  scoped to the live container — hidden probes now mount OTHER
  projections' containers inside #stage; (2) projection layout CSS must
  be keyed on .node-container.<P>, NOT the seed-level class — TreeTop's
  grid was double-keyed (`.TreeTop .node-container.TreeTop`), so its
  probe measured flat and the pull morphed to a flattened target,
  snapping to true 2D only on commit.
- **Projection set**: current four are somewhat arbitrary. The digits
  work (binary.md) already introduces class-driven layout (digit
  chains linearize regardless of projection); generalization:
  projection = policy mapping node class (Statics cls) → layout idiom,
  rather than one global mode. Decide the set after the classifier
  lands.

### The projection state machine (Andrew's sketch, 2026-08-03)

Instead of a complete graph over whole-layout probes, a curated
adjacency graph — FLAT INFIX as hub — where each edge gets a DESIGNED
DISPLACEMENT FIELD chosen so the honest geometry is legible:

- **Horizontal, small** (in the row): inline transitions. Infix ↔
  prefix: the operator heads slide left; infix ↔ postfix: they slide
  right. Operands barely move — so for operand handles the inline
  targets fall inside MIN_TRAVEL and vanish, leaving heads as the
  natural (and only) handles for inline moves.
- **Vertical**: tree up / tree down. Root layer stays FIXED; every
  other node moves purely vertically (depth-proportional) in phase 1
  — "the initial reprojection keeps all nodes in line" — then a
  phase-2 settle re-lays-out horizontally. The phase-1 target needs
  NO probe or CSS: it's a synthetic measured map derived analytically
  from the live measurement (same x/width, y offset by depth). Phase
  1→2 is exactly the staged-choreography experiment
  (drag-target-decomposition.md) applied to projection space.
- **Horizontal, large**: tree left / tree right. The whole target
  layout (root included) is displaced to the side, then recenters
  after commit (the flank-FLIP / future sigil-anchor handles the
  chrome side).

Ambiguity audit: vertical is clean (nothing else moves vertically).
Horizontal has two strata per side (head-shuffle near, whole-tree
far) — distance stratification, learnable, and handle-differentiated:
operands and the root only participate in the far stratum, heads in
both. The head-pulled-far-left case (through prefix toward tree-left)
is the one real overlap; segment/waypoint semantics or snap resolves
it, and with chaining it becomes a feature (pass THROUGH prefix).

Generalization: reverse edges are the same fields backwards
(tree-up pulled down = back to flat). Tree↔tree routes THROUGH flat —
the state machine's first genuine customer for chaining ("pass-off").
Projection edges as a graph also gives level design a hook (unlock
projections like rules — inventory again).

Set implications: wants postfix, tree-down, tree-right as real
projections (completing the rose around flat infix); the 2D analogs
of prefix/postfix are probably NOT wanted — the four tree directions
substitute. First buildable increment maps onto TODAY's set with no
new CSS: infix hub; up → TreeTop via the synthetic vertical fan;
left-small → prefix (head handles); left-large → TreeLeft.

Open: uniform vs depth-proportional fan spacing; whether edges stay
modal (fan toggle) or become modifier/background-grab; whether
non-hub states offer any direct edges besides their return-to-flat.

**Status: state machine LANDED (2026-08-03), rotation-factorized.**
New projection LinearInfixV (vertical flat, column CSS twin of infix).
Graph: LinearPrefix ↔probe↔ LinearInfix ↔fan-down↔ TreeTop;
LinearInfix ↔rotate-about-root↔ LinearInfixV ↔fan-right↔ TreeLeft.
Fan and rotation targets are SYNTHESIZED from the live measurement
(fan: level-shift + comp regrow with original padding, heads riding
their comp's layer; rotate: Ferris-wheel centers about the root pivot,
comp pills reshaping toward the rotated aspect); commit's animate()
handoff settles into the real layout (phase 2). Rotation rides a
two-segment rail through the 45° waypoint with retarget-on-crossing —
arcs-as-waypoints, no Motion changes. MIN_TRAVEL now correctly means
"a handle only drives edges it travels along." Finding: rotation chord
targets for far-from-pivot handles can land OFF-SCREEN; COMMIT_T=0.5
mitigates (the waypoint region suffices to commit) but handle choice
matters — possible future: clamp rails to viewport or scale synthetic
states to fit. Tree-up / tree-right remain unbuilt.

STATUS 2026-08-09: everything through Round 6 is COMMITTED with all
modes intact (mechanic 4-way, projection machine, dock, glide) —
deliberately not yet culled; see TODO.md "Decisions awaiting Andrew"
for the interim conventions.

Round 6 (2026-08-09): the discontinuity mystery SOLVED by reading the
dragology driver — dragology springs EVERY closest-branch switch by
default (DraggableRenderer advanceFrame: activePath change → snapshot
the displayed scene, blend toward the new live-tracking pure preview,
200ms cubic-out; withBranchTransition only customizes it; nothing in
the tree demo is exempt). Our port had never implemented it, under any
mechanic, old or new — the "same tree, dragology smooth, nool teleports"
comparison was exactly this missing piece, NOT tree size or memory
semantics (both prior explanations wrong; capture-current origins also
jumped on switch, just less far). Now implemented: Motion Glide — on a
memoryless manual_start (origin+glide), the displayed scene is
snapshotted and the display converges from it to the pure blend over
200ms cubic-out, advanced by its own rAF clock while the pointer is
still, folded into capture_before/manual_release so commits and
releases mid-glide are seamless. Bounded decaying memory: display ≡
pure function 200ms after the last switch. Applies to Classic/Sticky
in both rewrite and projection drags; Rails keeps its own continuity
model; Blend has no branches.

Round 5 (2026-08-09): the "catchiness" diagnosis — our d.between was
PATH-DEPENDENT where dragology's is a pure function of pointer position
(track switches re-anchored the tween origin at the displayed blend via
the retargeting machinery, which was built for commit handoffs, not
drag dispatch; old tracks' geometry lingered and receding never
returned to base). The mechanic toggle is REPURPOSED for the real axes:
**Classic** (memoryless rail-gap, stickiness 0 — dragology demo
parity; Motion.manual_start gained an `origin` option that re-originates
at the grab-time base), **Sticky** (Classic + incumbent hysteresis),
**Rails** (the deliberately-memoryful knob, rewrite drags only),
**Blend** (no tracks at all: Motion.manual_field drives the scene as an
inverse-square-weighted mixture over base + all candidate states —
projection pulls only, since rewrite candidates differ in node sets;
drop rule = nearest anchor). Old Closest/Snap values retired (Persist
sanitizes stale stored settings). Retarget-from-current remains the
default for commits and clock morphs, where it is correct. After the
cull, collapse to one policy and delete the rest.

Round 4 (2026-08-03): fan/tree pulls are now ROOT-HEAD-ANCHORED — the
probe target is positioned so the root's head glyph doesn't move during
the drag (verified 0px drift), and the rotation edge pivots on the same
point; the commit's normal retarget then does the recentering as its
own automatic stage ("two stages where the last is just repositioning").
Inline edges keep whole-scene centering (they MOVE the head). One fixed
point for the whole gesture family — the sigil-anchor instinct applied
to the root.

Round 3 (2026-08-03): the waypoint rotation was BUGGY (the >45°
normalization fired at segment crossings — backwards spins, flipped
dims); replaced with a true polar path in Motion (Box.pivot: layer
centers interpolate in polar coords about the pivot — verified rigid,
zero radius drift). Radii now interpolate PER-CORNER numerically
across the pull (adopt-at-mount popped at track cusps — continuity:
small movements, small changes). Heads are grabbable in projection
mode (they travel the most under inline transitions — a head offers
prefix AND postfix where end atoms offer only one). Dock rebuilt:
compact, in-flow left (stage centers in the remaining space — no
overlap), projection-INVARIANT (seed/noolbox projection CSS scoped
:not(.docked); tool pats pin to the default rendering). Fan edges
currently run SINGLE-STAGE (probe the real tree layout, ride straight
there — FAN_SINGLE_STAGE constant in Drag.tsx flips back to the staged
fan-then-settle for comparison; staged keeps direction legibility,
single-stage keeps directness).

Round 2 (2026-08-03, after Andrew's feel pass): comp pills now GENUINELY
ROTATE on rotation edges — Motion.Box grew optional `rot` (driven per
frame via the standalone CSS rotate property, which composes with the
translate property and clone animations) and `radius` (destination
border-radius, adopted at layer mount so pills reshape toward the new
arrangement from the start of the pull — Andrew's radii note). Glyphs
stay upright (Ferris-wheel). capture_before normalizes blends at >45°
to the dim-swapped upright twin, so handoffs after rotation reshape
instead of spinning back; rotation arcs now ride 4 waypoints (22.5°
steps). Projection dispatch gained the incumbent stickiness bonus
(the V-state fan-vs-rotate boundary felt touchy). LinearPostfix landed
(completing the flat trio; probe edges infix ↔ postfix). Handle
symmetry observed live: leftmost atoms drive prefix but not postfix,
rightmost the reverse, middle atoms both — travel-based edge pruning
working as designed. Docked mode landed (settings.dockNoolbox, 5th
top-left icon): noolbox pins to the left screen edge, sigil parks top-
center, stage centers in the viewport alone — layout reflows stop
pushing the working area; tradeoff: long flat expressions can run
under the docked box (it sits above, translucent). Open: root-pinning
across commits (the recenter-loses-context complaint — sigil-anchor
territory); per-edge enable/disable of projection transformations;
whether flat infix becomes the standard mode.

## Undraggable rules

For rules where no pattern element survives (taxonomy #4), the most
principled fix is **provenance moverhood**: click-path emerge already
assigns rewrites provenance geometry (what emerges from what). Let the
grabbed-but-consumed node ride as its provenance-successor — grab the
🌑, pull, and it blossoms into ♫➕➖♫ (the rail's far anchor is the
emerging comp's anchor). grab_is_mover relaxes from "grabbed node
survives" to "grabbed node or its emerge-successor survives."
Remaining hard residue: rules whose result needs a CHOICE (fresh
binding: WHICH ♫?) — a drag names no witness; those stay button-mode
or get a post-commit retarget gesture. Limit acknowledged: some rules
may never be drags, and that's acceptable if the noolbox remains a
first-class alternative.

## Chaining ("pass-off")

The demo's withSnapRadius chain half — commit mid-drag, re-enumerate,
keep pulling. To be added eventually as a toggle-level option (natural
host: the Snap mechanic, whose end-snap is exactly the chain trigger).
Interacts with taxonomy #3: chaining converts "near target on the way
to far target" from a conflict into a waypoint path — which changes
what should count as a directional conflict when chain is on.

## Next steps ladder (cheap → expensive)

1. Pairwise anchor checks at grab time; braid/tint coincident rails in
   the debug overlay (data already in hand).
2. Intrinsic rule-pair conflict table + static noolbox conflict marks.
3. Rail fanning for coincident bundles (control-space warp).
4. Legibility score + projection suggestion; projection rails
   (background-grab or modifier-grab).
5. Presets from the conflict graph; provenance moverhood for consumed
   grabs; chain toggle.
