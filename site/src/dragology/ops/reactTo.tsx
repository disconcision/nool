import { DragFrame, DragInitContext } from "../DragBehavior";
import { type DragSpec, operator } from "../DragSpec";
import { Box, truncate } from "../DragSpecTreeView";
import { OverlayVis } from "../OverlayVis";
import {
  Child,
  OpOverlayVisProps,
  OpResult,
  OpTreeViewProps,
  Operator,
} from "../op";

// `reactTo` has a type parameter of its own (`V`), on top of the
// builder's `T`, so it's a method of a class of its own, which
// `DragSpecBuilder` borrows.
export class ReactToMethod<T extends object> {
  /**
   * This drag behavior calls an getter on every frame. When the
   * getter's value changes, a child behavior is re-initialized with
   * the new value.
   */
  reactTo<V>(
    getter: () => V,
    callback: (value: V) => DragSpec<T>,
  ): DragSpec<T> {
    return operator(ReactToOp<T>)(
      getter,
      callback as (value: unknown) => DragSpec<T>,
    );
  }
}

/** `d.reactTo`. */
class ReactToOp<T extends object> extends Operator<T> {
  readonly name = "reactTo";
  /** The getter's last value. (A fresh object at first, so it's invalidated.) */
  currentValue: unknown = {};
  changeCount = 0;
  /** The child for the current value. */
  current: Child<T> | undefined;

  constructor(
    ctx: DragInitContext<T>,
    readonly getter: () => unknown,
    readonly callback: (value: unknown) => DragSpec<T>,
  ) {
    super(ctx);
  }

  frame(frame: DragFrame): OpResult<T> {
    const value = this.getter();
    if (value !== this.currentValue) {
      this.currentValue = value;
      this.changeCount++;
      this.current = this.child(null, this.callback(value));
    }
    return this.current!.run(frame);
  }

  treeView(props: OpTreeViewProps) {
    return (
      <Box label="reactTo" path={props.path}>
        {this.current && (
          <>
            <div
              style={{
                fontSize: 9,
                color: "rgb(120, 113, 108)",
                background: "rgba(0,0,0,0.04)",
                borderRadius: 3,
                padding: "2px 4px",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
            >
              value: {truncate(String(this.currentValue), 40)}
              {" · "}
              changes: {this.changeCount}
            </div>
            {this.current.treeView(props)}
          </>
        )}
      </Box>
    );
  }

  overlayVis({ active }: OpOverlayVisProps) {
    return this.current ? (
      <OverlayVis op={this.current.op} active={active} />
    ) : null;
  }
}
