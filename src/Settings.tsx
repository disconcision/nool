export type motion = "On" | "Off" | "Half";

/* LinearInfixV: the vertical flat line — LinearInfix's rotation twin in
 * the projection state machine (design/drag-legibility.md) */
export type projection =
  | "LinearPrefix"
  | "LinearInfix"
  | "LinearPostfix"
  | "LinearInfixV"
  | "TreeLeft"
  | "TreeTop";

export type symbols = "Emoji" | "SingleChar";

export type theme = "Light" | "Dark";

/* drag dispatch mechanic (experimental comparison toggle; see
 * design/drag-legibility.md):
 * - Classic: dragology demo parity — memoryless rail-gap dispatch,
 *   stickiness 0; the display is a pure function of pointer position
 * - Sticky: Classic + incumbent hysteresis (isolates whether stickiness
 *   alone helps)
 * - Rails: knob-on-rails — deliberately MEMORYFUL (bounded speed,
 *   switch at the hub); rewrite drags only (projection treats as Classic)
 * - Blend: no tracks at all — the scene is a weighted mixture over all
 *   candidate states (projection pulls only; Classic elsewhere) */
export type dragMechanic = "Classic" | "Sticky" | "Rails" | "Blend";

export type t = {
  sound: boolean;
  motion: motion;
  preview: boolean;
  projection: projection;
  symbols: symbols;
  theme: theme;
  /* drag mode: stage pointerdown grabs nodes for drag-rewrites instead of
   * selecting for the noolbox */
  dragging: boolean;
  dragMechanic: dragMechanic;
  /* drag debug overlay: rails, anchor dots, live t readout */
  dragDebug: boolean;
  /* experimental modal toggle: node pulls morph between PROJECTIONS of
   * the same expression instead of rewriting (design/drag-legibility.md) */
  projectionDrag: boolean;
  /* experimental: pin the noolbox to the screen's left edge (and the seed
   * icon up top) so stage/layout reflows stop pushing the flanks around */
  dockNoolbox: boolean;
};

export type Action =
  | "ToggleSound"
  | "ToggleMotion"
  | "TogglePreview"
  | "ToggleProjection"
  | "ToggleSymbols"
  | "ToggleDark"
  | "ToggleDragging"
  | "ToggleDragMechanic"
  | "ToggleDragDebug"
  | "ToggleProjectionDrag"
  | "ToggleDockNoolbox";

export const init: t = {
  sound: true,
  motion: "Half",
  preview: false,
  projection: "TreeLeft",
  symbols: "Emoji",
  theme: "Light",
  dragging: true,
  dragMechanic: "Classic",
  dragDebug: false,
  projectionDrag: false,
  dockNoolbox: false,
};

export const update = (settings: t, action: Action): t => {
  switch (action) {
    case "ToggleSound":
      return { ...settings, sound: !settings.sound };
    case "ToggleMotion":
      switch (settings.motion) {
        case "On":
          return { ...settings, motion: "Off" };
        case "Off":
          return { ...settings, motion: "Half" };
        case "Half":
          return { ...settings, motion: "On" };
      }
    case "TogglePreview":
      return { ...settings, preview: !settings.preview };
    case "ToggleProjection":
      switch (settings.projection) {
        case "LinearPrefix":
          return { ...settings, projection: "LinearInfix" };
        case "LinearInfix":
          return { ...settings, projection: "LinearPostfix" };
        case "LinearPostfix":
          return { ...settings, projection: "LinearInfixV" };
        case "LinearInfixV":
          return { ...settings, projection: "TreeTop" };
        case "TreeTop":
          return { ...settings, projection: "TreeLeft" };
        case "TreeLeft":
          return { ...settings, projection: "LinearPrefix" };
      }
    case "ToggleSymbols":
      switch (settings.symbols) {
        case "Emoji":
          return { ...settings, symbols: "SingleChar" };
        case "SingleChar":
          return { ...settings, symbols: "Emoji" };
      }
    case "ToggleDark":
      switch (settings.theme) {
        case "Light":
          return { ...settings, theme: "Dark" };
        case "Dark":
          return { ...settings, theme: "Light" };
      }
    case "ToggleDragging":
      return { ...settings, dragging: !settings.dragging };
    case "ToggleDragMechanic": {
      const cycle: Record<dragMechanic, dragMechanic> = {
        Classic: "Sticky",
        Sticky: "Rails",
        Rails: "Blend",
        Blend: "Classic",
      };
      return { ...settings, dragMechanic: cycle[settings.dragMechanic] };
    }
    case "ToggleDragDebug":
      return { ...settings, dragDebug: !settings.dragDebug };
    case "ToggleProjectionDrag":
      return { ...settings, projectionDrag: !settings.projectionDrag };
    case "ToggleDockNoolbox":
      return { ...settings, dockNoolbox: !settings.dockNoolbox };
  }
};
