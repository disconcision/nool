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
 * Set a transition to be used when switching between branches of a
 * behavior. "Branches" isn't yet a very well-established concept,
 * but this includes, e.g., switching between behaviors in a
 * `closest`, or switching between the "foreground" and
 * "background" in a `whenFar`. You don't need to call this to get
 * a branch transition – by default you get a 200ms cubic-out. This
 * is for customization.
 *
 * NOTE: There is currently no way to say, e.g., "do transition X
 * when switching between branches of a `closest` but do transition
 * Y when switching between the `closest` and its background" –
 * every application of `withBranchTransition` applies to all
 * branch switches within the behavior.
 */
export function withBranchTransition<T extends object>(
  this: DragSpec<T>,
  transition: TransitionLike,
): DragSpec<T> {
  return operator(WithBranchTransitionOp)(
    this,
    resolveTransitionLike(transition),
  );
}

/** `spec.withBranchTransition`. */
class WithBranchTransitionOp<T extends object> extends Modifier<T> {
  readonly name = "withBranchTransition";

  constructor(
    ctx: DragInitContext<T>,
    inner: DragSpecData<T>,
    readonly transition: Transition | false,
  ) {
    super(ctx, inner);
  }

  frame(frame: DragFrame): OpResult<T> {
    return {
      ...this.inner.run(frame),
      activePathTransition: this.transition,
    };
  }

  treeView(props: OpTreeViewProps) {
    return this.wrapperView(props, describeTransition(this.transition));
  }
}
