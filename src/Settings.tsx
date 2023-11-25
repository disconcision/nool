export type motion = "On" | "Off" | "Half";

export type t = {
  sound: boolean;
  motion: motion;
  preview: boolean;
};

export type Action = "ToggleSound" | "ToggleMotion" | "TogglePreview";

export const init: t = {
  sound: true,
  motion: "Half",
  preview: true,
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
  }
};
