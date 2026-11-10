import { DragFrame, DragInitContext } from "../DragBehavior";
import { type DragSpec, type DragSpecData, operator } from "../DragSpec";
import { Modifier, OpResult } from "../op";
import { Reader, readerToValue } from "../utils/flexible-types";

/**
 * Transform the DragInitContext before the inner spec is
 * initialized. Use this to override things like `anchorPos` or
 * `draggedPath` for child behaviors.
 */
export function withInitContext<T extends object>(
  this: DragSpec<T>,
  f: Reader<Partial<DragInitContext<T>>, DragInitContext<T>>,
): DragSpec<T> {
  return operator(WithInitContextOp)(this, f);
}

/** `spec.withInitContext`. */
class WithInitContextOp<T extends object> extends Modifier<T> {
  readonly name = "withInitContext";

  constructor(
    ctx: DragInitContext<T>,
    inner: DragSpecData<T>,
    readonly f: Reader<Partial<DragInitContext<T>>, DragInitContext<T>>,
  ) {
    super(ctx, inner, { ...ctx, ...readerToValue(f, ctx) });
  }

  frame(frame: DragFrame): OpResult<T> {
    return this.inner.run(frame);
  }
}
