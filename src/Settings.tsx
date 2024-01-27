export type motion = "On" | "Off" | "Half";

export type projection = "LinearPrefix" | "LinearInfix" | "TreeLeft" | "TreeTop";

export type symbols = "Emoji" | "SingleChar";

export type theme = "Light" | "Dark";

export type t = {
  sound: boolean;
  motion: motion;
  preview: boolean;
  projection: projection;
  symbols: symbols;
  theme: theme;
};

export type Action =
  | "ToggleSound"
  | "ToggleMotion"
  | "TogglePreview"
  | "ToggleProjection"
  | "ToggleSymbols"
  | "ToggleDark";

export const init: t = {
  sound: true,
  motion: "Half",
  preview: false,
  projection: "TreeLeft",
  symbols: "Emoji",
  theme: "Light",
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
  }
};
