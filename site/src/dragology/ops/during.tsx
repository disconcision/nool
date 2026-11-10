import {
  DragFrame,
  DragInitContext,
  getElementPosition,
  renderStateReadOnly,
} from "../DragBehavior";
import { type DragSpec, type DragSpecData, operator } from "../DragSpec";
import { Box, OutputThumbnail } from "../DragSpecTreeView";
import { Modifier, OpResult, OpTreeViewProps } from "../op";
import type { LayeredSvgx } from "../svgx/layers";

/**
 * Transform the state on every frame, rendering it as a preview.
 * (Same drop behavior as `onDrop`, but that doesn't change the
 * preview.)
 */
export function during<T extends object>(
  this: DragSpec<T>,
  fn: (state: T) => T,
): DragSpec<T> {
  return operator(DuringOp)(this, fn);
}

/** `spec.during`. */
class DuringOp<T extends object> extends Modifier<T> {
  readonly name = "during";
  /** The last frame's preview, of the transformed state. */
  outputPreview: LayeredSvgx | undefined;

  constructor(
    ctx: DragInitContext<T>,
    inner: DragSpecData<T>,
    readonly duringFn: (state: T) => T,
  ) {
    super(ctx, inner);
  }

  frame(frame: DragFrame): OpResult<T> {
    const result = this.inner.run(frame);
    const transformedState = this.duringFn(result.dropState);
    const preview = renderStateReadOnly(this.ctx, transformedState);
    const elementPos = getElementPosition(this.ctx, preview);
    this.outputPreview = preview;
    return {
      ...result,
      preview: () => preview,
      dropState: transformedState,
      gap: elementPos ? frame.pointer.dist(elementPos) : Infinity,
      grabPos: elementPos ?? undefined,
    };
  }

  treeView(props: OpTreeViewProps) {
    return (
      <Box label="during" path={props.path}>
        {this.outputPreview && (
          <OutputThumbnail outputPreview={this.outputPreview} />
        )}
        {this.inner.treeView(props)}
      </Box>
    );
  }
}
