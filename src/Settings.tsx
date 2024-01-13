export type motion = "On" | "Off" | "Half";

export type projection = "LinearPrefix" | "LinearInfix" | "TreeLeft" | "TreeTop";

export type t = {
  sound: boolean;
  motion: motion;
  preview: boolean;
  projection: projection;
};

export type Action =
  | "ToggleSound"
  | "ToggleMotion"
  | "TogglePreview"
  | "ToggleProjection";

export const init: t = {
  sound: true,
  motion: "Half",
  preview: true,
  projection: "TreeLeft",
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
  }
};
