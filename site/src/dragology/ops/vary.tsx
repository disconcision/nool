import {
  DragFrame,
  DragInitContext,
  getElementPositionCheap,
  getElementPositionOrThrow,
  renderStateReadOnly,
} from "../DragBehavior";
import {
  type DragSpec,
  operator,
  resolveVaryPath,
  type VaryOptions,
  type VaryPath,
} from "../DragSpec";
import { Box, StateThumbnails, truncate } from "../DragSpecTreeView";
import { DistanceMinimizer } from "../math/optimization";
import { Vec2 } from "../math/vec2";
import { Operator, OpOverlayVisProps, OpResult, OpTreeViewProps } from "../op";
import { DistanceLine } from "../OverlayVis";
import { getAtPath, PathIn, setAtPath } from "../paths";
import {
  drawLayered,
  layeredMerge,
  LayeredSvgx,
  layerSvg,
} from "../svgx/layers";
import {
  Many,
  ManyReader,
  manyReaderToArray,
  manyToArray,
} from "../utils/flexible-types";

// `vary` has a type parameter of its own (`S`), on top of the
// builder's `T`, so it's a method of a class of its own, which
// `DragSpecBuilder` borrows.
export class VaryMethod<T extends object> {
  /**
   * This drag behavior allows you to vary numbers in a state
   * continuously by dragging. Provide a starting state and paths to
   * the parameters you want to vary. An optional final parameter can
   * configure constraints.
   *
   * Note: `vary` starts running immediately – the values of
   * controlled parameters provided in the initial state will be used
   * to initialize numerical optimization, but won't ever be shown
   * directly. You can usually feel free to set them to an arbitrary
   * value.
   */
  vary<S extends T>(
    state: S,
    paramPaths: Many<VaryPath<S>>,
    options?: VaryOptions<S>,
  ): DragSpec<T> {
    const paths = manyToArray(paramPaths).map(resolveVaryPath);
    const stateFromParams = (params: number[]) => {
      let s = state;
      for (let i = 0; i < paths.length; i++) {
        s = setAtPath(s, paths[i], params[i]);
      }
      return s;
    };
    return operator(VaryOp<T>)(
      paths.map((path) => getAtPath(state, path)),
      stateFromParams,
      (options ?? {}) as VaryOptions<T>,
      paths as PathIn<T, number>[],
    );
  }
}

/**
 * Like `vary`, but instead of extracting parameters from paths in
 * the state, you provide initial parameter values and a function
 * that builds a state from parameters. Useful when multiple
 * parameters in state need to change in concert.
 */
export function varyFunc<T extends object>(
  initParams: number[],
  stateFromParams: (params: number[]) => T,
  options?: VaryOptions<T>,
): DragSpec<T> {
  return operator(VaryOp)(
    initParams,
    stateFromParams,
    options ?? {},
    undefined,
  );
}

const VARY_VIS_DURATION = 0.05; // seconds per explored value
const VARY_VIS_FRACTION = 0.3; // how early in optimizer exploration to take samples from

/** `d.vary` and `d.varyFunc`. */
class VaryOp<T extends object> extends Operator<T> {
  readonly name = "vary";
  readonly minimizer: DistanceMinimizer;
  private readonly constraintsFn: ((params: number[]) => number[]) | undefined;
  /** The last frame's state, as rendered, and where the element ended up. */
  rendered: { layered: LayeredSvgx; position: Vec2 } | undefined;
  /** The last frame's parameters. */
  currentParams: number[] = [];
  /** Where the optimizer tried, on the last frame (with the vary visualizer on). */
  exploredPositions: Vec2[] | undefined;
  private varyVisLastSwitch = performance.now() / 1000;
  private varyVisSampledParams: number[] | null = null;

  constructor(
    ctx: DragInitContext<T>,
    readonly initParams: number[],
    readonly stateFromParams: (params: number[]) => T,
    readonly options: VaryOptions<T>,
    /** The paths varied, for `vary` (for the tree view's label). */
    readonly paramPaths: PathIn<T, number>[] | undefined,
  ) {
    super(ctx);
    const { constraint, pin } = options;
    const initialState = stateFromParams(initParams);

    // Bake pins into the constraint function: evaluate pin at the
    // initial state to capture targets, then add equal() constraints.
    const pinTargets = pin ? manyReaderToArray(pin, initialState) : undefined;
    const constraintWithPin: ManyReader<number, [T]> = pin
      ? [
          constraint,
          (s) => {
            const pinCurrent = manyReaderToArray(pin, s);
            return pinCurrent.map((v, i) => [
              v - pinTargets![i],
              pinTargets![i] - v,
            ]);
          },
        ]
      : constraint;

    // Pre-compute constraint count (flatten a dummy call to count entries)
    const numConstraints = constraintWithPin
      ? manyReaderToArray(constraintWithPin, initialState).length
      : 0;

    this.minimizer = new DistanceMinimizer(initParams, numConstraints);
    this.constraintsFn = constraintWithPin
      ? (params) =>
          manyReaderToArray(constraintWithPin, stateFromParams(params))
      : undefined;
  }

  frame(frame: DragFrame): OpResult<T> {
    const { ctx, minimizer } = this;
    // Compute the element position for a given set of params
    const getElementPos = (params: number[]): Vec2 => {
      const candidateState = this.stateFromParams(params);
      const pos = getElementPositionCheap(ctx, candidateState);
      return pos ?? Vec2(Infinity, Infinity); // only used for optimization, not exposed
    };
    minimizer.minimize(frame.pointer, getElementPos, {
      constraints: this.constraintsFn,
    });

    let resultParams = minimizer.params;
    if (ctx.debug.varyVisualizer && minimizer.exploredValues.length > 0) {
      const now = performance.now() / 1000;
      if (now - this.varyVisLastSwitch >= VARY_VIS_DURATION) {
        this.varyVisLastSwitch = now;
        const sampleIdx = Math.floor(
          Math.random() * minimizer.exploredValues.length * VARY_VIS_FRACTION,
        );
        this.varyVisSampledParams = minimizer.exploredValues[sampleIdx];
      }
      resultParams =
        this.varyVisSampledParams ??
        minimizer.exploredValues[0] ??
        minimizer.params;
    }

    const newState = this.stateFromParams(resultParams);
    let previewLayered = renderStateReadOnly(ctx, newState);
    const achievedPos = getElementPositionOrThrow(ctx, previewLayered);
    const gap = achievedPos.dist(frame.pointer);

    if (ctx.debug.varyVisualizer) {
      const ghosted = minimizer.exploredValues.map((params) =>
        renderStateReadOnly(ctx, this.stateFromParams(params)),
      );
      previewLayered = layeredMerge(
        previewLayered,
        layerSvg(
          <g id="vary-cloud" dragologyZIndex="/-100" dragologyOpaque={true}>
            {ghosted.map((g, i) => (
              <g key={`explored-${i}`} opacity={0.15}>
                {drawLayered(g)}
              </g>
            ))}
          </g>,
        ),
      );
    }

    this.rendered = { layered: previewLayered, position: achievedPos };
    this.currentParams = resultParams.slice();
    this.exploredPositions = ctx.debug.varyVisualizer
      ? minimizer.exploredPositions.slice()
      : undefined;

    return {
      preview: () => previewLayered,
      dropState: newState,
      gap,
      grabPos: achievedPos,
    };
  }

  fuzzDropPositions() {
    return this.rendered ? [this.rendered.position] : [];
  }

  treeView({ path, active, color }: OpTreeViewProps) {
    const label = this.paramPaths
      ? `vary [${this.paramPaths.map((p) => p.join(".")).join(", ")}]`
      : `varyFunc [${this.initParams.length} params]`;
    const constraintSrc = this.options.constraint
      ? truncate(this.options.constraint.toString(), 60)
      : null;
    // TODO: pins?
    return (
      <Box label={label} active={active} color={color} path={path}>
        {constraintSrc && (
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
            constraint: {constraintSrc}
          </div>
        )}
        {this.rendered && <StateThumbnails renderedStates={[this.rendered]} />}
      </Box>
    );
  }

  overlayVis({ opacity }: OpOverlayVisProps) {
    if (!this.rendered || !this.lastFrame) return null;
    const { pointer } = this.lastFrame;
    const pos = this.rendered.position;
    const distance = pointer.dist(pos);
    return (
      <g opacity={opacity}>
        {this.exploredPositions?.map((ep, i) => (
          <line
            key={i}
            {...ep.xy1()}
            {...pointer.xy2()}
            stroke="magenta"
            strokeWidth={0.5}
            opacity={0.5}
          />
        ))}
        {this.exploredPositions?.map((ep, i) => (
          <circle
            key={`c${i}`}
            {...ep.cxy()}
            r={2}
            fill="magenta"
            opacity={0.5}
          />
        ))}
        <circle {...pos.cxy()} r={5} fill="magenta" />
        <DistanceLine from={pos} to={pointer} distance={distance} />
      </g>
    );
  }
}
