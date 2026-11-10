import * as _ from "lodash-es";
import {
  DragFrame,
  DragInitContext,
  getElementPositionCheap,
  getElementPositionOrThrow,
  renderStateReadOnly,
} from "../DragBehavior";
import { type DragSpec, type DragSpecData, operator } from "../DragSpec";
import { Box, OutputThumbnail } from "../DragSpecTreeView";
import { joinPath, Modifier, OpResult, OpTreeViewProps } from "../op";
import type { LayeredSvgx } from "../svgx/layers";
import {
  resolveTransitionLike,
  Transition,
  TransitionLike,
} from "../transition";
import { assertDefined } from "../utils/assert";

/**
 * Set a "snap radius" for the behavior. If the dragged element
 * gets within this distance of where the rendered drop state would
 * place it, the preview will go straight to the rendered drop
 * state. (This changes the drag preview but not the drop state.)
 */
export function withSnapRadius<T extends object>(
  this: DragSpec<T>,
  radius: number,
  {
    transition = false,
    chain = false,
  }: { transition?: TransitionLike; chain?: boolean } = {},
): DragSpec<T> {
  return operator(WithSnapRadiusOp)(
    this,
    radius,
    resolveTransitionLike(transition),
    chain,
  );
}

/** `spec.withSnapRadius`. */
class WithSnapRadiusOp<T extends object> extends Modifier<T> {
  readonly name = "withSnapRadius";
  /**
   * Drop-state renders and grab positions, by reference identity. For
   * `between` children, the drop state cycles through a small fixed
   * set, so this avoids redundant render passes on every frame.
   */
  private readonly dropRendered = _.memoize((state: T) =>
    renderStateReadOnly(this.ctx, state),
  );
  private readonly dropGrabPos = _.memoize((state: T) =>
    assertDefined(getElementPositionCheap(this.ctx, state)),
  );
  /** Whether the last frame snapped. */
  snapped = false;
  /**
   * With a transition, the last frame's active-path segment between
   * this op and the wrapped spec, so that snapping counts as a branch
   * switch.
   */
  private segment: "snapped" | "unsnapped" | undefined;
  /** The last frame's preview, rendered on demand. */
  private preview: (() => LayeredSvgx) | undefined;

  constructor(
    ctx: DragInitContext<T>,
    inner: DragSpecData<T>,
    readonly radius: number,
    readonly transition: Transition | false,
    readonly chain: boolean,
  ) {
    super(ctx, inner);
  }

  /** The last frame's preview. */
  get outputPreview(): LayeredSvgx | undefined {
    return this.preview?.();
  }

  frame(frame: DragFrame): OpResult<T> {
    const result = this.inner.run(frame);
    const grabPos =
      result.grabPos ?? getElementPositionOrThrow(this.ctx, result.preview());
    const dropGrabPos = this.dropGrabPos(result.dropState);
    const snapped = dropGrabPos.dist2(grabPos) <= this.radius ** 2;
    const preview = snapped
      ? () => this.dropRendered(result.dropState)
      : result.preview;
    this.snapped = snapped;
    this.preview = preview;
    this.segment = this.transition
      ? snapped
        ? "snapped"
        : "unsnapped"
      : undefined;
    return {
      ...result,
      preview,
      grabPos: snapped ? dropGrabPos : grabPos,
      activePath: joinPath(this.segment, result.activePath),
      activePathTransition: this.transition || undefined,
      chainNow:
        this.chain && snapped ? { transition: this.transition } : undefined,
    };
  }

  treeView(props: OpTreeViewProps) {
    const { snapped, transition } = this;
    const options = [transition && "transition", this.chain && "chain"].filter(
      Boolean,
    );
    let label = `withSnapRadius (${this.radius}${
      options.length ? `, ${options.join(", ")}` : ""
    })`;
    if (transition) {
      label += snapped ? " [snapped]" : " [not snapped]";
    }
    return (
      <Box label={label} path={props.path}>
        {this.outputPreview && (
          <OutputThumbnail outputPreview={this.outputPreview} />
        )}
        {this.inner.treeView({
          ...props,
          childPath: this.segment
            ? `${props.childPath}${this.segment}/`
            : props.childPath,
        })}
      </Box>
    );
  }
}
