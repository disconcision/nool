import { DragFrame, DragInitContext } from "../DragBehavior";
import { type DragSpec, type DragSpecData, operator } from "../DragSpec";
import { describeTransition } from "../DragSpecTreeView";
import { Modifier, OpResult, OpTreeViewProps } from "../op";
import {
  Transition,
  TransitionLike,
  resolveTransitionLike,
} from "../transition";

/**
 * Set a transition to be used when dropping an element. You don't
 * need to call this to get a drop transition – by default you get
 * a 200ms cubic-out. This is for customization.
 */
export function withDropTransition<T extends object>(
  this: DragSpec<T>,
  transition: TransitionLike,
): DragSpec<T> {
  return operator(WithDropTransitionOp)(
    this,
    resolveTransitionLike(transition),
  );
}

/** `spec.withDropTransition`. */
class WithDropTransitionOp<T extends object> extends Modifier<T> {
  readonly name = "withDropTransition";

  constructor(
    ctx: DragInitContext<T>,
    inner: DragSpecData<T>,
    readonly transition: Transition | false,
  ) {
    super(ctx, inner);
  }

  frame(frame: DragFrame): OpResult<T> {
    return { ...this.inner.run(frame), dropTransition: this.transition };
  }

  treeView(props: OpTreeViewProps) {
    return this.wrapperView(props, describeTransition(this.transition));
  }
}
