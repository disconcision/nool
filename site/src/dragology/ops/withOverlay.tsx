import { DragFrame, DragInitContext } from "../DragBehavior";
import { type DragSpec, type DragSpecData, operator } from "../DragSpec";
import { Modifier, OpResult } from "../op";
import type { Svgx } from "../svgx";
import {
  layeredMerge,
  layeredPrefixIds,
  layeredShiftZIndices,
  LayeredSvgx,
  layerSvg,
} from "../svgx/layers";

// Overlays draw above everything, including floating elements (which
// are shifted by 1000000).
const OVERLAY_Z_SHIFT = 2000000;
let overlayCount = 0;

/**
 * Draw extra SVG on top of the drag preview while this behavior is
 * active, e.g. marks at drop targets. It's in canvas coordinates,
 * drawn above everything else, and goes away on drop (the dropped
 * state doesn't draw it). On a branch of a `closest`, it shows only
 * while that branch is the active one.
 */
export function withOverlay<T extends object>(
  this: DragSpec<T>,
  overlay: Svgx,
): DragSpec<T> {
  return operator(WithOverlayOp)(this, overlay);
}

/** `spec.withOverlay`: draw extra SVG on top of the preview. */
class WithOverlayOp<T extends object> extends Modifier<T> {
  readonly name = "withOverlay";
  readonly layer: LayeredSvgx;

  constructor(ctx: DragInitContext<T>, inner: DragSpecData<T>, overlay: Svgx) {
    super(ctx, inner);
    // Each overlay gets its own id prefix, so its ids can't collide
    // with the preview's or another overlay's.
    this.layer = layeredShiftZIndices(
      layeredPrefixIds(
        layerSvg(<g>{overlay}</g>),
        `overlay-${overlayCount++}-`,
      ),
      OVERLAY_Z_SHIFT,
    );
  }

  frame(frame: DragFrame): OpResult<T> {
    const result = this.inner.run(frame);
    return {
      ...result,
      preview: () => layeredMerge(result.preview(), this.layer),
    };
  }
}
