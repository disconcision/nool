import { DragFrame, DragInitContext } from "../DragBehavior";
import { type DragSpec, type DragSpecData, operator } from "../DragSpec";
import { Modifier, OpResult } from "../op";
import { Reader, readerToValue } from "../utils/flexible-types";

/**
 * Advanced: Transform the frame (input) before it reaches the inner
 * behavior. Use this, e.g., to remap the pointer position.
 */
export function changeFrame<T extends object>(
  this: DragSpec<T>,
  f: Reader<Partial<DragFrame>, DragFrame>,
): DragSpec<T> {
  return operator(ChangeFrameOp)(this, f);
}

/** `spec.changeFrame`. */
class ChangeFrameOp<T extends object> extends Modifier<T> {
  readonly name = "changeFrame";

  constructor(
    ctx: DragInitContext<T>,
    inner: DragSpecData<T>,
    readonly f: Reader<Partial<DragFrame>, DragFrame>,
  ) {
    super(ctx, inner);
  }

  frame(frame: DragFrame): OpResult<T> {
    return this.inner.run({ ...frame, ...readerToValue(this.f, frame) });
  }
}
