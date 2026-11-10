import { DragFrame, DragInitContext } from "../DragBehavior";
import { type DragSpec, type DragSpecData, operator } from "../DragSpec";
import { Box, OutputThumbnail } from "../DragSpecTreeView";
import { Vec2 } from "../math/vec2";
import { Modifier, OpOverlayVisProps, OpResult, OpTreeViewProps } from "../op";
import { DistanceLine, OverlayVis } from "../OverlayVis";
import { renderDraggableInert } from "../renderDraggable";
import type { SvgxProps } from "../svgx";
import { translate } from "../svgx/helpers";
import {
  layeredExtract,
  layeredMerge,
  layeredPrefixIds,
  layeredSetAttributes,
  layeredShiftZIndices,
  LayeredSvgx,
  layeredTransform,
} from "../svgx/layers";
import { localToGlobal } from "../svgx/transform";
import { assert } from "../utils/assert";
import { pipe } from "../utils/pipe";

export type FloatingOptions = {
  ghost?: SvgxProps | true;
  tether?: (dist: number) => number;
};

/**
 * Wrap this behavior with floating: on each frame, the inner
 * behavior's preview is used as a dynamic backdrop (with the
 * dragged element extracted), and the original dragged element
 * floats freely on top. Optionally provide a ghost and/or a tether
 * function to limit how far the float deviates from the inner
 * behavior's element position.
 */
export function withFloating<T extends object>(
  this: DragSpec<T>,
  { ghost, tether }: FloatingOptions = {},
): DragSpec<T> {
  return operator(WithFloatingOp)(
    this,
    ghost === true ? { opacity: 0.5 } : ghost,
    tether,
  );
}

/** `spec.withFloating`. */
class WithFloatingOp<T extends object> extends Modifier<T> {
  readonly name = "withFloating";
  readonly draggedId: string;
  /**
   * The float element (pre-translated to the origin), cached for frames
   * where the inner result doesn't contain the dragged element.
   */
  private cachedFloatAnchored: LayeredSvgx | null = null;
  /** The last frame's preview and float origin, computed lazily. */
  private computed:
    | (() => { preview: LayeredSvgx; elementPos: Vec2 | null })
    | undefined;

  constructor(
    ctx: DragInitContext<T>,
    inner: DragSpecData<T>,
    readonly ghost: SvgxProps | undefined,
    readonly tether: ((dist: number) => number) | undefined,
  ) {
    super(ctx, inner);
    assert(
      ctx.draggedId !== null,
      "Floating drags require the dragged element to have an id",
    );
    this.draggedId = ctx.draggedId;
  }

  /** The last frame's preview. */
  get outputPreview(): LayeredSvgx | undefined {
    return this.computed?.().preview;
  }

  /**
   * Where the element is floated FROM on the last frame. Null if the
   * element is not found (is floating from memory).
   */
  get elementPos(): Vec2 | null | undefined {
    return this.computed?.().elementPos;
  }

  frame(frame: DragFrame): OpResult<T> {
    const { ctx, draggedId } = this;
    const innerResult = this.inner.run(frame);

    let cached: { preview: LayeredSvgx; elementPos: Vec2 | null } | null = null;
    const computePreview = () => {
      if (cached) return cached;

      const layered = innerResult.preview();
      const draggedLayer = layered.byId.get(draggedId);

      let elementPos: Vec2 | null = null;
      let floatAnchored: LayeredSvgx;
      let backdrop: LayeredSvgx;
      if (!draggedLayer) {
        if (this.cachedFloatAnchored === null) {
          // TODO: I feel like this shouldn't be necessary

          // The dragged element isn't in the inner result on the first
          // frame (e.g. switchToStateAndFollow created it in a new state
          // that the inner spec doesn't know about). Fall back to
          // rendering the start state to extract the float element.
          const startLayered = renderDraggableInert(
            ctx.draggable,
            ctx.startState,
            draggedId,
            false,
          );
          const { extracted } = layeredExtract(startLayered, draggedId);
          const startDraggedLayer = startLayered.byId.get(draggedId);
          const floatPos = startDraggedLayer
            ? localToGlobal(
                startDraggedLayer.element.props.transform,
                ctx.anchorPos,
              )
            : Vec2(0);
          this.cachedFloatAnchored = layeredTransform(
            extracted,
            translate(floatPos.mul(-1)),
          );
        }
        floatAnchored = this.cachedFloatAnchored;
        backdrop = layered;
      } else {
        elementPos = localToGlobal(
          draggedLayer.element.props.transform,
          ctx.anchorPos,
        );
        const { remaining, extracted } = layeredExtract(layered, draggedId);
        floatAnchored = layeredTransform(
          extracted,
          translate(elementPos.mul(-1)),
        );
        this.cachedFloatAnchored = floatAnchored;

        if (this.ghost !== undefined) {
          backdrop = layeredMerge(
            remaining,
            layeredSetAttributes(
              layeredPrefixIds(extracted, "ghost-"),
              this.ghost,
            ),
          );
        } else {
          backdrop = remaining;
        }
      }

      let target = frame.pointer;
      if (elementPos && this.tether) {
        const v = frame.pointer.sub(elementPos);
        const dist = v.len();
        if (dist > 1e-6) {
          const newDist = this.tether(dist);
          target = elementPos.add(v.mul(newDist / dist));
        }
      }

      const floatPositioned = layeredTransform(
        floatAnchored,
        translate(target),
      );
      const preview = layeredMerge(
        backdrop,
        pipe(
          floatPositioned,
          (h) => layeredSetAttributes(h, { dragologyTransition: false }),
          (h) => layeredShiftZIndices(h, 1000000),
        ),
      );
      cached = { preview, elementPos };
      return cached;
    };
    this.computed = computePreview;

    return {
      ...innerResult,
      preview: () => computePreview().preview,
      // The inner result's transitions and chaining don't apply to
      // the floating preview.
      dropTransition: undefined,
      activePathTransition: undefined,
      chainNow: undefined,
      // without a tether, the float sits right at the pointer
      grabPos: this.tether ? undefined : frame.pointer,
    };
  }

  treeView(props: OpTreeViewProps) {
    const preview = this.outputPreview;
    return (
      <Box label="withFloating" color={props.color} path={props.path}>
        {preview && <OutputThumbnail outputPreview={preview} />}
        {this.inner.treeView(props)}
      </Box>
    );
  }

  overlayVis({ active, opacity }: OpOverlayVisProps) {
    if (!this.lastFrame) return null;
    const { pointer } = this.lastFrame;
    const elementPos = this.elementPos;
    return (
      <g>
        <OverlayVis op={this.inner.op} active={active} />
        {elementPos && (
          <g opacity={opacity}>
            <circle cx={elementPos.x} cy={elementPos.y} r={5} fill="magenta" />
            <DistanceLine
              from={elementPos}
              to={pointer}
              distance={pointer.dist(elementPos)}
            />
          </g>
        )}
      </g>
    );
  }
}
