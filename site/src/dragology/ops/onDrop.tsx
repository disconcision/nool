import { DragFrame, DragInitContext } from "../DragBehavior";
import { type DragSpec, type DragSpecData, operator } from "../DragSpec";
import { Modifier, OpResult } from "../op";

/**
 * Set a new drop state for the behavior – the drag preview will be
 * the same as before, but dropping will transition into the given
 * state.
 */
export function onDrop<T extends object>(
  this: DragSpec<T>,
  state: T | ((previewState: T) => T),
): DragSpec<T> {
  return operator(OnDropOp)(this, state);
}

/** `spec.onDrop`. */
class OnDropOp<T extends object> extends Modifier<T> {
  readonly name = "onDrop";

  constructor(
    ctx: DragInitContext<T>,
    inner: DragSpecData<T>,
    readonly onDropState: T | ((previewState: T) => T),
  ) {
    super(ctx, inner);
  }

  frame(frame: DragFrame): OpResult<T> {
    const result = this.inner.run(frame);
    return {
      ...result,
      dropState:
        typeof this.onDropState === "function"
          ? (this.onDropState as (s: T) => T)(result.dropState)
          : this.onDropState,
    };
  }
}
