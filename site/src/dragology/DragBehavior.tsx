import { Draggable, makeDraggableProps } from "./draggable";
import { Chaining, DragSpecData } from "./DragSpec";
import { Vec2 } from "./math/vec2";
import { opBehavior, type Operator } from "./op";
import {
  renderDraggableInert,
  renderDraggableInertUnlayered,
} from "./renderDraggable";
import { findElement } from "./svgx";
import { findByPathInLayered, LayeredSvgx } from "./svgx/layers";
import { findByPath } from "./svgx/path";
import { localToGlobal } from "./svgx/transform";
import { Transition } from "./transition";
import { assertDefined } from "./utils/assert";

/**
 * A "drag behavior" defines the ongoing behavior of a drag – what is
 * displayed – as well as what state the draggable will transition
 * into on drop. At least so far, it is assumed to be "memoryless".
 */
export type DragBehavior<T extends object> = (
  frame: DragFrame,
) => DragResult<T>;

/**
 * The information passed to a drag behavior on every frame of the
 * drag.
 */
export type DragFrame = {
  pointer: Vec2;
};

/**
 * The information returned by a drag behavior on every frame of the
 * drag.
 */
export type DragResult<T extends object> = {
  preview: () => LayeredSvgx;
  dropState: T;
  dropTransition?: Transition | false;
  activePathTransition?: Transition | false;
  gap: number;
  /**
   * Where this behavior puts the grab point (the point on the dragged
   * element that the pointer grabbed), in canvas coordinates. `gap` is
   * usually the pointer's distance to it. If it's missing, find it by
   * rendering `preview`. For `between`, it's where the blend aims the
   * grab point; a blend that rotates things can bow away from that.
   */
  grabPos?: Vec2;
  activePath: string;
  chainNow?: Chaining<T>;
  /**
   * The operator instance running the behavior. Its fields, and its
   * children's, are what the debug views draw.
   */
  op: Operator<T>;
};

/**
 * The information available to a drag behavior when it's being
 * created from a DragSpec.
 */
export type DragInitContext<T extends object> = {
  draggable: Draggable<T>;
  draggedPath: string;
  draggedId: string | null;
  anchorPos: Vec2;
  startState: T;
  debug: {
    varyVisualizer: boolean;
  };
};

/**
 * Turn a DragSpec into a DragBehavior, given the necessary context,
 * by constructing its operator. (Each op's semantics are in its file
 * in src/ops.)
 */
export function dragSpecToBehavior<T extends object>(
  spec: DragSpecData<T>,
  ctx: DragInitContext<T>,
): DragBehavior<T> {
  return opBehavior(new spec.opClass(ctx, ...spec.args));
}

// # Shared helpers

/** Render a state of the draggable, as a preview to show mid-drag. */
export function renderStateReadOnly<T extends object>(
  ctx: DragInitContext<T>,
  state: T,
): LayeredSvgx {
  // TODO: be more discriminating about whether isTracking should be
  // false here
  return renderDraggableInert(ctx.draggable, state, ctx.draggedId, false);
}

/**
 * Where a state puts the dragged element (null if it's missing), in
 * canvas coordinates. Cheaper than rendering the state as a preview
 * and asking `getElementPosition`.
 */
export function getElementPositionCheap<T extends object>(
  ctx: DragInitContext<T>,
  state: T,
): Vec2 | null {
  if (ctx.draggedId) {
    const raw = ctx.draggable(
      makeDraggableProps({
        state,
        draggedId: ctx.draggedId,
        setState: () => {
          throw new Error("This function should not have been called");
        },
        isTracking: true,
      }),
    );
    const found = findElement(raw, (el) => el.props.id === ctx.draggedId);
    if (!found) return null;
    return localToGlobal(found.accumulatedTransform, ctx.anchorPos);
  }
  // The dragged element has no id, so fall back to a path lookup.
  // This requires assignPaths but still avoids layering.
  const content = renderDraggableInertUnlayered(
    ctx.draggable,
    state,
    ctx.draggedId,
    true,
  );
  const found = findByPath(ctx.draggedPath, content);
  if (!found) return null;
  return localToGlobal(found.accumulatedTransform, ctx.anchorPos);
}

/**
 * Where a rendered preview puts the dragged element (null if it's
 * missing), in canvas coordinates.
 */
export function getElementPosition<T extends object>(
  ctx: DragInitContext<T>,
  layered: LayeredSvgx,
): Vec2 | null {
  const found = findByPathInLayered(ctx.draggedPath, layered);
  if (!found) return null;
  return localToGlobal(found.accumulatedTransform, ctx.anchorPos);
}

export function getElementPositionOrThrow<T extends object>(
  ctx: DragInitContext<T>,
  layered: LayeredSvgx,
): Vec2 {
  return assertDefined(getElementPosition(ctx, layered));
}
