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

/* Compact-screen (phone) chrome candidates, a TEMPORARY evaluation knob
 * (the "lab" chip, compact layouts only; desktop is unaffected):
 * - corners: the corner L-clusters, finger-sized, desktop-only experiments
 *   trimmed away
 * - fan: only the mode switch and help stay out; one corner mark fans the
 *   rest out down the right edge
 * - dock: every control moved down into one thumb row */
export type chrome = "corners" | "fan" | "dock";

/* Compact-only stage enlargement while the noolbox is folded (lab knob) */
export type boost = 1 | 1.25 | 1.5;

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
  /* compact layouts: the noolbox folds away (tap the seed) — remembered
   * per mode, folded by default in drag mode where it's mostly a loadout,
   * open in select mode where it's the way you act */
  foldDrag: boolean;
  foldSelect: boolean;
  chrome: chrome;
  boost: boost;
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
  | "ToggleDockNoolbox"
  | "ToggleFold"
  | "ChromeCorners"
  | "ChromeFan"
  | "ChromeDock"
  | "Boost1"
  | "Boost125"
  | "Boost150";

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
  foldDrag: true,
  foldSelect: false,
  chrome: "corners",
  boost: 1.5,
};

export const folded = (s: t): boolean => (s.dragging ? s.foldDrag : s.foldSelect);

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
    case "ToggleFold":
      return settings.dragging
        ? { ...settings, foldDrag: !settings.foldDrag }
        : { ...settings, foldSelect: !settings.foldSelect };
    case "ChromeCorners":
      return { ...settings, chrome: "corners" };
    case "ChromeFan":
      return { ...settings, chrome: "fan" };
    case "ChromeDock":
      return { ...settings, chrome: "dock" };
    case "Boost1":
      return { ...settings, boost: 1 };
    case "Boost125":
      return { ...settings, boost: 1.25 };
    case "Boost150":
      return { ...settings, boost: 1.5 };
  }
};
