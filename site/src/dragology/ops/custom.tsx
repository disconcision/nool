import { DragFrame, DragInitContext } from "../DragBehavior";
import { type DragSpec, operator } from "../DragSpec";
import { Box } from "../DragSpecTreeView";
import { OpResult, OpTreeViewProps, Operator } from "../op";

/**
 * Escape hatch: define a drag behavior from scratch. Its results'
 * `activePath`s go after "custom/" in the drag's active path.
 */
export function custom<T extends object>(
  fn: (ctx: DragInitContext<T>) => (frame: DragFrame) => OpResult<T>,
): DragSpec<T> {
  return operator(CustomOp)(fn);
}

/** `d.custom`. */
class CustomOp<T extends object> extends Operator<T> {
  readonly name = "custom";
  readonly behavior: (frame: DragFrame) => OpResult<T>;

  constructor(
    ctx: DragInitContext<T>,
    readonly fn: (ctx: DragInitContext<T>) => (frame: DragFrame) => OpResult<T>,
  ) {
    super(ctx);
    this.behavior = fn(ctx);
  }

  frame(frame: DragFrame): OpResult<T> {
    return this.behavior(frame);
  }

  treeView({ path }: OpTreeViewProps) {
    return (
      <Box label="custom" path={path}>
        not supported yet
      </Box>
    );
  }

  overlayVis() {
    return null;
  }
}
