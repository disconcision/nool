import type { ReactNode } from "react";
import type {
  DragBehavior,
  DragFrame,
  DragInitContext,
  DragResult,
} from "../DragBehavior";
import type { DragSpecData } from "../DragSpec";
import { Box, SpecNode } from "../DragSpecTreeView";
import { OverlayVis } from "../OverlayVis";
import type { Vec2 } from "../math/vec2";

// The modules in src/ops extend `Operator` at load time, and DragSpec.tsx
// imports them. So this module mustn't import anything at runtime that leads
// back to DragSpec.tsx (loadOrder.test.ts checks).

/**
 * What an op's `frame` returns: a DragResult without `op`, which the
 * framework fills in.
 *
 * `activePath` is the active path below this op; the framework puts
 * the op's name in front. A child's result (from `child.run`) has its
 * path filled in, so returning it, even spread and modified, continues
 * the path into that child.
 */
export type OpResult<T extends object> = Omit<
  DragResult<T>,
  "activePath" | "op"
> & { activePath?: string };

/** An operator class, as `operator` takes it. */
export type OpClass<T extends object, A extends unknown[]> = new (
  ctx: DragInitContext<T>,
  ...args: A
) => Operator<T>;

/** What an op's `treeView` gets, to draw its node in DragSpecTreeView. */
export type OpTreeViewProps = {
  /** This node's path, to pass to `Box`. */
  path: string;
  /** Path prefix for this node's children. (`Child.treeView` uses it.) */
  childPath: string;
  /** Whether the drag's active path runs through this node. */
  active: boolean;
  /** This node's drop-zone color, if it has one. */
  color: string | undefined;
};

/** What an op's `overlayVis` gets, to draw on the debug overlay. */
export type OpOverlayVisProps = {
  /** Whether this node is on the drag's active branch. */
  active: boolean;
  /** Opacity for marks this node draws itself. */
  opacity: number;
};

/**
 * A kind of drag spec. The framework constructs a fresh instance for
 * each drag behavior, passing the behavior's context first, so:
 *
 * - Setup work goes in the constructor, and runs once per behavior.
 * - Memory, and anything a debug view might want, are plain fields.
 *   The debug views are methods, reading those fields directly.
 * - Children are started in the constructor with `this.child(...)`.
 *
 * Make an operator class usable with `operator` (or `modifier`, for
 * a `Modifier`).
 */
export abstract class Operator<T extends object> {
  /** Names the op in active paths and debug views, e.g. "between". */
  abstract readonly name: string;
  /** Children started with `child`, for debug views. */
  readonly children: Child<T>[] = [];
  /** How many frames this op has run. */
  frames = 0;
  /**
   * The frame this op last ran with, as it was given (after any
   * parent remapped the pointer). Debug views draw against it.
   */
  lastFrame: DragFrame | undefined;

  constructor(readonly ctx: DragInitContext<T>) {}

  /**
   * Start a child behavior, usually in the constructor. A child with
   * the same key as an existing one replaces it.
   */
  protected child(
    key: string | null,
    spec: DragSpecData<T>,
    ctx: DragInitContext<T> = this.ctx,
  ): Child<T> {
    const child = new Child(key, spec, ctx);
    const i = this.children.findIndex((c) => c.key === key);
    if (i === -1) this.children.push(child);
    else this.children[i] = child;
    return child;
  }

  abstract frame(frame: DragFrame): OpResult<T>;

  /**
   * Draw this op's node in the tree view. It's called as a plain
   * function, not rendered as a component, so it can't use hooks.
   */
  abstract treeView(props: OpTreeViewProps): ReactNode;

  /**
   * Draw this op's marks on the debug overlay, including its
   * children's. Like `treeView`, it can't use hooks. Marks measured
   * against the pointer should use `this.lastFrame`'s, which is the
   * one this op was given.
   */
  abstract overlayVis(props: OpOverlayVisProps): ReactNode;

  /**
   * For the fuzzer only: where the pointer goes to reach this op's own
   * drop candidates (not its children's), as of its last frame. The
   * fuzzer aims drags at these. Ops that don't define drop candidates
   * of their own (like `closest`, or modifiers) leave this out.
   */
  fuzzDropPositions?(): Vec2[];
}

/**
 * An operator that wraps a single spec, which it runs as `this.inner`.
 * Its debug views default to a box around the wrapped spec's node, and
 * the wrapped spec's overlay.
 */
export abstract class Modifier<T extends object> extends Operator<T> {
  readonly inner: Child<T>;
  /** `innerCtx` is the context to start the wrapped spec with. */
  constructor(
    ctx: DragInitContext<T>,
    inner: DragSpecData<T>,
    innerCtx: DragInitContext<T> = ctx,
  ) {
    super(ctx);
    this.inner = this.child(null, inner, innerCtx);
  }

  treeView(props: OpTreeViewProps): ReactNode {
    return this.wrapperView(props);
  }

  overlayVis({ active }: OpOverlayVisProps): ReactNode {
    return <OverlayVis op={this.inner.op} active={active} />;
  }

  /**
   * A tree-view node that's a box around the wrapped spec, labeled with
   * this modifier's name and optional `detail`.
   */
  protected wrapperView(props: OpTreeViewProps, detail?: string): ReactNode {
    return (
      <Box
        label={detail ? `${this.name} (${detail})` : this.name}
        path={props.path}
      >
        {this.inner.treeView(props)}
      </Box>
    );
  }
}

/** A handle on a child behavior, for running and drawing it. */
export class Child<T extends object> {
  /** The child's operator instance. */
  readonly op: Operator<T>;
  private readonly behavior: DragBehavior<T>;

  constructor(
    readonly key: string | null,
    spec: DragSpecData<T>,
    ctx: DragInitContext<T>,
  ) {
    this.op = new spec.opClass(ctx, ...spec.args);
    this.behavior = opBehavior(this.op);
  }

  /** Run a frame. The result's `activePath` leads into this child. */
  run(frame: DragFrame): OpResult<T> & { activePath: string } {
    const { op: _op, activePath, ...result } = this.behavior(frame);
    return { ...result, activePath: joinPath(this.key, activePath) };
  }

  /**
   * Draw this child's node in the tree view, given its parent's
   * `treeView` props.
   */
  treeView({ childPath }: OpTreeViewProps): ReactNode {
    return (
      <SpecNode
        key={this.key}
        op={this.op}
        path={this.key === null ? childPath : `${childPath}${this.key}/`}
      />
    );
  }
}

/** The drag behavior that runs an op. */
export function opBehavior<T extends object>(op: Operator<T>): DragBehavior<T> {
  return (frame) => {
    const { activePath, ...result } = op.frame(frame);
    op.frames++;
    op.lastFrame = frame;
    return { ...result, activePath: joinPath(op.name, activePath), op };
  };
}

/** Join active-path segments with "/", skipping missing ones. */
export function joinPath(...segments: (string | null | undefined)[]): string {
  return segments.filter((s) => s !== null && s !== undefined).join("/");
}
