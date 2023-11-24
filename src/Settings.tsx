export type motion = "On" | "Off" | "Half";

export type t = {
  sound: boolean;
  motion: motion;
};

export type Action = "ToggleSound" | "ToggleMotion";

export const init: t = {
  sound: true,
  motion: "Half",
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
  }
};
