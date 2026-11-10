import { DragFrame, DragInitContext } from "../DragBehavior";
import { getOnDragCallbackOnElement } from "../draggable";
import {
  type DragSpec,
  type DragSpecLike,
  operator,
  resolveDragSpecLike,
} from "../DragSpec";
import { Box } from "../DragSpecTreeView";
import { Modifier, OpResult, OpTreeViewProps } from "../op";
import { renderDraggableInertUnlayered } from "../renderDraggable";
import { findElement } from "../svgx";
import { assert } from "../utils/assert";

/**
 * This drag behavior immediately transitions into a new state,
 * then continues the drag from a different element in that state,
 * identified by ID. If followSpec is provided, it will be used to
 * continue the drag; otherwise, the spec attached to the new
 * element (via dragology) will be used.
 */
export function switchToStateAndFollow<T extends object>(
  state: T,
  draggedId: string,
  followSpec?: DragSpecLike<T>,
): DragSpec<T> {
  return operator(SwitchToStateAndFollowOp)(
    state,
    draggedId,
    followSpec && resolveDragSpecLike(followSpec),
  );
}

/**
 * The spec to continue with: `followSpec` if given, otherwise the
 * dragology on the element `draggedId` in `state`.
 */
function findFollowSpec<T extends object>(
  ctx: DragInitContext<T>,
  state: T,
  draggedId: string,
  followSpec: DragSpec<T> | undefined,
): DragSpec<T> {
  if (!followSpec && draggedId) {
    // TODO: this is kinda questionable and/or redundant

    const content = renderDraggableInertUnlayered(
      ctx.draggable,
      state,
      draggedId,
      true,
    );
    const found = findElement(content, (el) => el.props.id === draggedId);
    assert(!!found, `switchToStateAndFollow: element "${draggedId}" not found`);
    const callback = getOnDragCallbackOnElement<T>(found.element);
    assert(
      !!callback,
      `switchToStateAndFollow: no followSpec and no dragology on "${draggedId}"`,
    );
    followSpec = callback();
  }
  assert(!!followSpec, "switchToStateAndFollow: no followSpec");
  return followSpec;
}

/**
 * `d.switchToStateAndFollow`. (A modifier of the spec it follows,
 * which it works out when it starts.)
 */
class SwitchToStateAndFollowOp<T extends object> extends Modifier<T> {
  readonly name = "switchToStateAndFollow";

  constructor(
    ctx: DragInitContext<T>,
    readonly state: T,
    readonly draggedId: string,
    followSpec: DragSpec<T> | undefined,
  ) {
    super(ctx, findFollowSpec(ctx, state, draggedId, followSpec), {
      ...ctx,
      startState: state,
      draggedId,
      draggedPath: draggedId + "/",
    });
  }

  frame(frame: DragFrame): OpResult<T> {
    return this.inner.run(frame);
  }

  treeView(props: OpTreeViewProps) {
    return (
      <Box
        label={`switchToStateAndFollow → ${this.draggedId}`}
        color={props.color}
        path={props.path}
      >
        {this.inner.treeView(props)}
      </Box>
    );
  }
}
