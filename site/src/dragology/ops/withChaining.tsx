import { DragFrame, DragInitContext } from "../DragBehavior";
import {
  operator,
  type Chaining,
  type DragSpec,
  type DragSpecData,
} from "../DragSpec";
import { Modifier, OpResult } from "../op";
import { TransitionLike, resolveTransitionLike } from "../transition";

/**
 * When the drop state changes, immediately chain into a new drag
 * from that state (re-evaluating dragology on the dragged
 * element). Options can optionally be provided to fine-tune the
 * behavior of the chaining.
 */
export function withChaining<T extends object>(
  this: DragSpec<T>,
  {
    transition = true,
    ...rest
  }: {
    draggedId?: string;
    followSpec?: DragSpec<T>;
    transition?: TransitionLike;
  } = {},
): DragSpec<T> {
  return operator(WithChainingOp)(this, {
    ...rest,
    transition: resolveTransitionLike(transition),
  });
}

/** `spec.withChaining`. */
class WithChainingOp<T extends object> extends Modifier<T> {
  readonly name = "withChaining";

  constructor(
    ctx: DragInitContext<T>,
    inner: DragSpecData<T>,
    readonly chaining: Chaining<T>,
  ) {
    super(ctx, inner);
  }

  frame(frame: DragFrame): OpResult<T> {
    const result = this.inner.run(frame);
    return { ...result, chainNow: result.chainNow ?? this.chaining };
  }
}
