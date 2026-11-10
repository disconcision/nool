import { DragFrame, DragInitContext } from "../DragBehavior";
import { type DragSpec, type DragSpecData, operator } from "../DragSpec";
import { Modifier, OpResult } from "../op";
import { Reader, readerToValue } from "../utils/flexible-types";

/**
 * Advanced: Transform the behavior's entire result on each frame.
 * This is the most general wrapper — you can change any field of
 * the result (preview, drop state, gap, etc.).
 */
export function changeResult<T extends object>(
  this: DragSpec<T>,
  f: Reader<Partial<OpResult<T>>, OpResult<T>>,
): DragSpec<T> {
  return operator(ChangeResultOp)(this, f);
}

/** `spec.changeResult`. */
class ChangeResultOp<T extends object> extends Modifier<T> {
  readonly name = "changeResult";

  constructor(
    ctx: DragInitContext<T>,
    inner: DragSpecData<T>,
    readonly f: Reader<Partial<OpResult<T>>, OpResult<T>>,
  ) {
    super(ctx, inner);
  }

  frame(frame: DragFrame): OpResult<T> {
    const result = this.inner.run(frame);
    const changed = readerToValue(this.f, result);
    // A new preview may have moved the grab point, so unless `f` says
    // where it is now, it's unknown.
    const grabPos =
      "preview" in changed && !("grabPos" in changed)
        ? undefined
        : result.grabPos;
    return { ...result, grabPos, ...changed };
  }
}
