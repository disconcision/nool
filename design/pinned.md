# Pinned: things to come back to

Deliberately parked items, so nothing gets lost while the dragging work
proceeds. Add entries with enough context to resume cold; strike out when
resolved.

## Shadows: achieve the effect by other means (pinned 2026-07-29)

Current state (see design/captured-geometry.md, "Shadow hunt, concluded"):
moving overlay clones are shadowless in flight; the toolbox pat-shadow cost
is halved by side promotion, with an optional Shift+D 4-layer approximation
(`body.cheapshadows`) that reaches zero stalls at a subtle fidelity cost.

What's unsatisfying:
- Shadows popping out/in on morphing nodes doesn't feel perfect.
- Shift+D is a visible fidelity decrease; whether it's worth it is an open
  aesthetic call (Andrew: "could be worth the sacrifice, not totally sure").
- Default (10-layer) still has a ~30ms toolbox-repaint residual per action.

The underlying observation: this effect is NOT intrinsically expensive —
games render vastly fancier soft shadows cheaply by pre-baking them into
textures. Browser box-shadow is expensive because Skia re-runs a gaussian
blur on every tile rasterization with no caching across elements, frames, or
identical shadow specs. Blur cost ∝ area × radius × layers × dpr².

Avenues to evaluate (roughly in order of promise):
1. **Nine-slice shadow sprite** — render the layered shadow ONCE (offline or
   at startup to a canvas), use as `border-image` (or a stretched ::before
   with an image). Raster becomes a texture blit; the 10-layer look is
   preserved exactly. Complication: nool's border-radius varies per node
   (asymmetric leaf shapes) — may need a few radius variants or accept
   slight corner mismatch under the content.
2. **Strip shadows only from layers that actually move** (from ≠ to boxes):
   stationary clones keep shadows; they raster once at overlay build (cost
   returns partially, but only for the stationary subset).
3. **Fade shadows rather than pop**: a dedicated shadow element/pseudo per
   layer whose opacity animates — compositor-only once rasterized. (A
   promoted shadow-only layer rasters its blur once, then opacity is free.)
4. **Fewer layers globally** — recalibrate the resting stack itself to 4-5
   layers designed to be indistinguishable (the current Shift+D variant was
   calibrated quickly; a careful match could close the 26/255 gap).
5. **Canvas/WebGL underlay** for all node chrome (shadows, maybe
   backgrounds) — heavyweight, but on the road to the eventual custom
   geometry engine / 3D anyway. Probably the long-term answer.

Related loose ends:
- Decide Shift+D default (Andrew to revisit after living with it).
- Selected-head pulse animates `filter: brightness + drop-shadow` per frame
  on its clone — same raster family, currently cheap because heads are
  small, but worth folding into whatever shadow strategy wins.

## Drag overlap legibility (pinned 2026-07-29)

Translucent node backgrounds compose confusingly when subtrees cross during
drags. Options discussed (none adopted yet):
1. Solid backdrop traveling with moving nodes — correct fix for composition
   confusion, but changes how node colors read (they're translucent tints
   over the scene by design). Revisit jointly with the shadow-sprite work
   (opaque card-backs simplify nine-slice shadows).
2. Mask-style tint on the moving subtree — rejected as default: washes
   glyphs, and reads as "preview highlight" not "in hand".
3. Restore box-shadow on ONLY the held subtree's layer (+ optional 1.02-1.05
   scale-up) — cheap (one layer's raster), adds a depth cue so crossing
   reads as occlusion. Current lean.
4. Dim non-participating layers slightly during drag (opacity ~0.75,
   compositor-free). Composes with 3.

## Toolbox motion (pinned 2026-07-29)

The toolbox is outside the motion layer: tool flips and match-status changes
snap instantly (VT used to crossfade them). Fine for now; revisit when the
toolbox itself becomes a drag surface (tools-as-draggables), which will want
the box-tween treatment extended to `pat-*` ids.

## Mobile (pinned 2026-07-30)

Mobile pass v1 landed: tap-highlight/callout/selection suppressed on the
play surface, touch-action:none so drags own the gesture, 100dvh, viewport
font clamp (narrow OR short screens), portrait stacks stage-over-noolbox,
coarse-pointer tap-target enlargement, drag mode defaults on for touch.
Open items:
- Toolbox scrolling is wheel-only, so touch can't scroll the tool window
  (only the visible rows' loadout toggles are reachable). Options: touch
  drag-to-scroll on #noolbox, or show all rules on mobile (tools.size = all).
- Landscape phones keep the side-by-side layout; possibly cramped with big
  expressions. Revisit after real-device testing.
- Keyboard-only affordances (1-4/space/arrows, Shift+S/D debug) have no
  touch equivalents.
