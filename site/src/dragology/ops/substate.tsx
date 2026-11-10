import { DragFrame, DragInitContext } from "../DragBehavior";
import { Draggable, makeDraggableProps } from "../draggable";
import {
  type DragSpec,
  DragSpecBuilder,
  type DragSpecData,
  operator,
} from "../DragSpec";
import { Box } from "../DragSpecTreeView";
import {
  Child,
  Operator,
  OpOverlayVisProps,
  OpResult,
  OpTreeViewProps,
} from "../op";
import { OverlayVis } from "../OverlayVis";
import { getAtPath, PathIn, setAtPath, ValueAtPath } from "../paths";

// `substate` has a type parameter of its own (`P`), on top of the
// builder's `T`, so it's a method of a class of its own, which
// `DragSpecBuilder` borrows.
export class SubstateMethod<T extends object> {
  /**
   * Focus on a sub-path of the state (a lens). The callback receives
   * a DragSpecBuilder for the substate type, and should return a
   * DragSpec for that substate.
   */
  substate<const P extends PathIn<T, any>>(
    state: T,
    path: P,
    fn: (d: DragSpecBuilder<ValueAtPath<T, P>>) => DragSpec<ValueAtPath<T, P>>,
  ): DragSpec<T> {
    // TypeScript can't relate a generic path to the value it leads to.
    const subState = getAtPath(state, path as any) as ValueAtPath<T, P>;
    const innerSpec = fn(new DragSpecBuilder(subState));
    return operator(SubstateOp<T>)(
      state,
      path,
      innerSpec as unknown as DragSpecData<object>,
    );
  }
}

/** `d.substate`. */
class SubstateOp<T extends object> extends Operator<T> {
  readonly name = "substate";
  /** Runs the substate's spec. (Its state type is really `T[path]`.) */
  readonly inner: Child<any>;

  constructor(
    ctx: DragInitContext<T>,
    readonly state: T,
    readonly path: (string | number)[],
    innerSpec: DragSpecData<object>,
  ) {
    super(ctx);
    const lensedDraggable: Draggable<any> = (props) =>
      ctx.draggable(
        makeDraggableProps({
          state: setAtPath(state, path as any, props.state),
          draggedId: props.draggedId,
          setState: props.setState,
          isTracking: props.isTracking,
        }),
      );
    this.inner = this.child(
      null,
      innerSpec as any,
      {
        ...ctx,
        draggable: lensedDraggable,
      } as any,
    );
  }

  frame(frame: DragFrame): OpResult<T> {
    const result = this.inner.run(frame);
    return {
      ...result,
      dropState: setAtPath(this.state, this.path as any, result.dropState),
    };
  }

  treeView(props: OpTreeViewProps) {
    return (
      <Box label={`substate [${this.path.join(", ")}]`} path={props.path}>
        {this.inner.treeView(props)}
      </Box>
    );
  }

  overlayVis({ active }: OpOverlayVisProps) {
    return <OverlayVis op={this.inner.op} active={active} />;
  }
}
