import { DragFrame, DragInitContext } from "../DragBehavior";
import {
  type DragSpec,
  type DragSpecData,
  type DragSpecLike,
  operator,
  resolveDragSpecLike,
} from "../DragSpec";
import { Box, Slot } from "../DragSpecTreeView";
import {
  Child,
  OpOverlayVisProps,
  OpResult,
  OpTreeViewProps,
  Operator,
} from "../op";
import { OverlayVis } from "../OverlayVis";
import { assert } from "../utils/assert";

export type WhenFarOptions =
  | { gap?: number; gapIn?: never; gapOut?: never }
  | { gap?: never; gapIn?: number; gapOut?: number };

/**
 * Switch to an alternate behavior when the pointer gets more than
 * a certain distance ("gap") away. This distance is 50 pixels by
 * default, but can be configured via the `gap` option.
 */
export function whenFar<T extends object>(
  this: DragSpec<T>,
  background: DragSpecLike<T>,
  opts: WhenFarOptions = {},
): DragSpec<T> {
  const gap = opts.gap ?? 50;
  const gapIn = opts.gapIn ?? gap;
  const gapOut = opts.gapOut ?? gap;
  assert(
    gapIn <= gapOut,
    `whenFar: gapIn (${gapIn}) must be <= gapOut (${gapOut}), otherwise the behavior oscillates`,
  );
  return operator(WhenFarOp)(
    this,
    resolveDragSpecLike(background),
    gapIn,
    gapOut,
  );
}

/** `spec.whenFar`: the foreground, or the background when it's far. */
class WhenFarOp<T extends object> extends Operator<T> {
  readonly name = "whenFar";
  readonly foreground: Child<T>;
  readonly background: Child<T>;
  /** Memory: whether the last frame used the foreground (for hysteresis). */
  inForeground = true;

  constructor(
    ctx: DragInitContext<T>,
    foreground: DragSpecData<T>,
    background: DragSpecData<T>,
    readonly gapIn: number,
    readonly gapOut: number,
  ) {
    super(ctx);
    this.foreground = this.child("fg", foreground);
    this.background = this.child("bg", background);
  }

  frame(frame: DragFrame): OpResult<T> {
    const foregroundResult = this.foreground.run(frame);
    const threshold = this.inForeground ? this.gapOut : this.gapIn;
    this.inForeground = foregroundResult.gap <= threshold;
    return this.inForeground ? foregroundResult : this.background.run(frame);
  }

  treeView(props: OpTreeViewProps) {
    const gapLabel =
      this.gapIn === this.gapOut
        ? `gap=${this.gapIn}`
        : `gapIn=${this.gapIn} gapOut=${this.gapOut}`;
    return (
      <Box label={`whenFar (${gapLabel})`} path={props.path}>
        <div style={{ display: "flex", flexDirection: "row", gap: 4 }}>
          <Slot label="fg">{this.foreground.treeView(props)}</Slot>
          <Slot label="bg">{this.background.treeView(props)}</Slot>
        </div>
      </Box>
    );
  }

  overlayVis({ active }: OpOverlayVisProps) {
    if (this.frames === 0) return null;
    const foreground = (
      <OverlayVis
        op={this.foreground.op}
        active={active && this.inForeground}
      />
    );
    if (this.inForeground) return foreground;
    return (
      <g>
        {foreground}
        <OverlayVis op={this.background.op} active={active} />
      </g>
    );
  }
}
