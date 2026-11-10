import { DragFrame, DragInitContext } from "../DragBehavior";
import { type DragSpec, type DragSpecData, operator } from "../DragSpec";
import { Modifier, OpResult } from "../op";

/**
 * Advanced: Change the behavior's reported "gap" measurement via
 * the provided function. Use this, e.g., to "reweight" the
 * behavior's drop target in a `closest`.
 */
export function changeGap<T extends object>(
  this: DragSpec<T>,
  f: (gap: number) => number,
): DragSpec<T> {
  return operator(ChangeGapOp)(this, f);
}

/** `spec.changeGap`. */
class ChangeGapOp<T extends object> extends Modifier<T> {
  readonly name = "changeGap";

  constructor(
    ctx: DragInitContext<T>,
    inner: DragSpecData<T>,
    readonly f: (gap: number) => number,
  ) {
    super(ctx, inner);
  }

  frame(frame: DragFrame): OpResult<T> {
    const result = this.inner.run(frame);
    return { ...result, gap: this.f(result.gap) };
  }
}
