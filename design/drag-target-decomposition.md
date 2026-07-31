# Drag targets: tree edit vs. layout reaction

Figure: `figs/rail-variants.png` (source: `figs/rail-variants.html`) —
the three rail variants drawn over real measured geometry (live layout,
the app's actual computed rails, and the true committed factored layout)
for commute-grab-✖️, factor-grab-sum, and factor-grab-die, plus the
staged choreography's two phases.

Context: Andrew observed that drag movements are keyed to the actual
laid-out target state, which conflates "changing tree structure" with
"re-laying-out the new tree" — making target positions feel less
predictable than tree-structure intuition suggests. He proposed a
two-stage idea (drag against a tree-transform-only target, then
transition to the re-laid-out version on release) while doubting it was
well-defined, since "any actual position is laid out." This note is the
analysis of that question (reconstructed from the discussion,
2026-07-30). Status at time of writing: the pattern-level mover filter
(step 1 of the recommended ordering below) has since landed; the
site-frame rail correction and staged choreography have not.

## The decomposition

When a candidate is probed, the grabbed node's displacement from live to
target is a sum of two things: (1) **slot change** — it sits at a
different position in the tree, so it renders somewhere else; and (2)
**world reaction** — everything reflows around the edit. And (2) is
bigger and weirder than it looks in this codebase, for two concrete
reasons: the probe is center-aligned to the live scene as a *whole*
(`probe_candidate` matches bounding-box centers), so any edit that
changes the tree's overall extent shifts *every* anchor a little; and
the stage's font size is a function of tree *depth* (`stage_scale`), so
a rewrite that changes depth — associate does — rescales the entire
scene in the candidate. When a rail points somewhere you didn't expect,
it's usually these two, not the slot change. So the perception is
accurate: the rails measure "my move plus the world's entire reaction,"
and the reaction can dominate.

## Is "tree transform only" well-defined?

The instinct that "any actual position is laid out" is correct — there
is no un-laid-out *layout*. But here's the reframe that dissolves the
worry: the motion layer's interpolation space consists almost entirely
of non-layouts already. Every mid-morph frame is a geometrically
inconsistent arrangement that no layout engine would produce. So the
intermediate state doesn't need to be a layout — it needs to be a
**keyframe in blend space**, and that is definable: *the state where the
movers have traveled to their new slots' current positions and nothing
else has budged.* "New slot's current position" is well-defined against
the live frame — commute's operand targets its sibling's box *as it is
now*; associate's inner + targets the left-slot region where `a`
currently sits. It only goes undefined where structure is created or
consumed, and the emerge/converge provenance machinery already exists to
answer exactly that question (what box a new node comes from / a dying
node goes into). So the two-stage picture is coherent: **phase 1,
drag-driven: movers travel through a frozen world; phase 2, on release:
the world reflows** — and phase 2 is literally the existing commit
handoff (animate() picking up the blend and continuing to the true
state). Nothing new has to be invented for it, choreographically; the
current system just runs both phases *simultaneously* instead of staged.

## Two grades of adopting it

There's a cheap version and a full version, independently valuable.

**Cheap: fix only the rail geometry.** Define the anchor not as "grabbed
node's box in the laid-out probe" but as its probe displacement
*measured within the rewrite site's frame, mapped back into the live
site's frame*. That subtracts the recentering and the global rescale —
the two biggest predictability killers — while leaving the drag's visual
behavior (full simultaneous preview morph) untouched.

**Full: also stage the choreography.** During the drag only movers
interpolate while passengers hold their live boxes, and the reflow plays
after release. Implementable with per-layer time-staggering in the
motion layer, but it has a genuine cost worth naming: the current
simultaneous morph is a *preview of the result* — riding the rail you
watch the entire future state assemble, which carries real information
(arguably a feature of the captured-geometry approach). Staging trades
result-preview for self-motion legibility. Both are defensible defaults;
it's even possible the right split is "staged during drag, full preview
in the adjacent-possible panel."

## Relation to the mover question

It's the same underlying split, applied to a different slot in the
pipeline. Slot-change vs world-reaction is one decomposition; the mover
question uses its *logical* shadow for **eligibility** (are you a thing
that changes slot at all?), while this observation is about using its
*geometric* rendering for **rail direction** and possibly
**choreography**. They're siblings, not the same thing — and they
corroborate each other at the case that started this: under the logical
mover test, root-grab-associate is ineligible because the root's slot
doesn't change; under frozen-frame rails, its rail length would be ~zero
for the same reason stated geometrically. When two independent
formalizations agree on the suss case, that's usually a sign the
decomposition is right. The "which + is which" correspondence question
stays fully orthogonal — a pattern-annotation choice about identity that
feeds *into* both (it decides who the movers are), but no mover
criterion or rail geometry will fix a wrong correspondence, and vice
versa.

## Wrinkles

For the full-staged version: during phase 1, movers arrive at slots
whose current occupants haven't yielded yet — deliberate overlap. Not
fatal (it reads as "placing onto"), and the pinned drag-overlap
legibility work (shadow + scale on the held subtree) is exactly the kind
of treatment that makes it read intentionally — but it's a real
aesthetic commitment, and it interacts with rules where multiple nodes
move at once (commute moves *both* operands: does the non-grabbed one
also travel in phase 1, or wait and swap in phase 2? Movers-are-movers
says it travels, but that's a choice to feel).

## Suggested order

1. The logical/pattern-level mover test (eligibility) — **landed**.
2. The cheap site-frame rail correction — small, pure predictability
   win, no visual philosophy change.
3. Staged movers-then-reflow choreography — a designed experiment, held
   until the first two can be felt, since it's the only one of the three
   with a real tradeoff attached.
