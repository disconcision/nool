export type motion = "On" | "Off" | "Half";

export type projection = "LinearPrefix" | "LinearInfix" | "TreeLeft" | "TreeTop";

export type symbols = "Emoji" | "SingleChar";

export type theme = "Light" | "Dark";

/* drag dispatch mechanic: knob-on-rails vs per-frame nearest-candidate
 * (experimental comparison toggle; see design/captured-geometry.md) */
export type dragMechanic = "Rails" | "Closest";

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
  | "ToggleDragDebug";

/* Touch devices default to drag mode (their natural interaction). */
const coarse_pointer =
  typeof window !== "undefined" &&
  !!window.matchMedia &&
  window.matchMedia("(pointer: coarse)").matches;

export const init: t = {
  sound: true,
  motion: "Half",
  preview: false,
  projection: "TreeLeft",
  symbols: "Emoji",
  theme: "Light",
  dragging: coarse_pointer,
  dragMechanic: "Rails",
  dragDebug: true,
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
    case "ToggleDragMechanic":
      return {
        ...settings,
        dragMechanic: settings.dragMechanic === "Rails" ? "Closest" : "Rails",
      };
    case "ToggleDragDebug":
      return { ...settings, dragDebug: !settings.dragDebug };
  }
};
