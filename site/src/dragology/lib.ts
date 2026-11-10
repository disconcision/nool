// Public API entry point for Dragology.

// Augment React's SVGAttributes with the `dragology` prop.
import "./jsx.d";

// Core component
export { DraggableRenderer } from "./DraggableRenderer";
export type {
  DragStatus,
  DraggableRendererBaseProps,
  DraggableRendererProps,
} from "./DraggableRenderer";

// Draggable type & helpers
export type { Draggable, DraggableProps, SetState } from "./draggable";

// DragSpec & builder
export { and, inOrder, lessThan, moreThan, param } from "./DragSpec";
export type { DragSpec, DragSpecBuilder, DragSpecMethods } from "./DragSpec";

// Transitions
export type { Transition, TransitionLike } from "./transition";

// SVG helpers
export type { Svgx } from "./svgx";
export {
  draggableLine,
  path,
  rotateDeg,
  rotateRad,
  scale,
  translate,
} from "./svgx/helpers";

// Showing values in debug views and error messages
export { DefaultValueView, ValueView, ValueViewProvider } from "./ValueView";
export type { ValueViewComponent, ValueViewProps } from "./ValueView";

// Math
export { Vec2 } from "./math/vec2";
export type { Vec2able } from "./math/vec2";

// Amb (nondeterministic computation)
export { amb, fail, produceAmb, require, runAmb } from "./amb";

// Paths (for vary, substate, etc.)
export type { PathIn } from "./paths";

// Utility types
export type { Many } from "./utils/flexible-types";

// Drag behavior (for d.custom and benchmarking)
export { dragSpecToBehavior } from "./DragBehavior";
export type {
  DragBehavior,
  DragFrame,
  DragInitContext,
  DragResult,
} from "./DragBehavior";

// Writing your own operators and modifiers
export {
  getElementPosition,
  getElementPositionCheap,
  renderStateReadOnly,
} from "./DragBehavior";
export { modifier, operator, resolveDragSpecLike } from "./DragSpec";
export type { DragSpecData, DragSpecLike } from "./DragSpec";
export { Modifier, Operator } from "./op";
export type { Child, OpOverlayVisProps, OpResult, OpTreeViewProps } from "./op";
export type { LayeredSvgx } from "./svgx/layers";
// Building blocks for their debug views
export {
  Box,
  OutputThumbnail,
  Slot,
  StateThumbnails,
} from "./DragSpecTreeView";
export type { RenderedState } from "./DragSpecTreeView";
export { DistanceLine, OverlayVis } from "./OverlayVis";
