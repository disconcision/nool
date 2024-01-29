import { Component } from "solid-js";
import { Model } from "../Model";
import * as Settings from "../Settings";
import * as Action from "../Action";
import sound_icon_on from "../assets/icons/sound-on.svg";
import sound_icon_off from "../assets/icons/sound-off.svg";
import motion_on from "../assets/icons/motion-on.svg";
import motion_off from "../assets/icons/motion-off.svg";
import motion_half from "../assets/icons/motion-half.svg";
import preview_on from "../assets/icons/eye-open.svg";
import preview_off from "../assets/icons/eye-closed.svg";
import linear_prefix from "../assets/icons/noun-tree-1052096.svg";
import linear_infix from "../assets/icons/noun-tree-1039106.svg";
import tree_top from "../assets/icons/noun-tree-1052083.svg";
import tree_left from "../assets/icons/noun-1560867.svg"
import sun_on from "../assets/icons/noun-sun-5362089.svg";
import sun_off from "../assets/icons/noun-sun-6322390.svg";
import palette_2 from "../assets/icons/noun-paint-6329583.svg";
import palette_1 from "../assets/icons/noun-palette-1918496.svg";
import alphabet from "../assets/icons/noun-alphabet-3591519.svg"
import ded from "../assets/icons/noun-dead-5130035.svg"
import prims from "../assets/icons/noun-geometry-4695832.svg"

//TODO: qr code to disable id display

const setSetting =
  (inject: Action.Inject, action: Settings.Action) => (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    inject({
      t: "setSetting",
      action,
    });
  };

const sound_icon = (sound: boolean): string =>
  sound ? sound_icon_on : sound_icon_off;

const motion_icon = (motion: Settings.motion): string => {
  switch (motion) {
    case "On":
      return motion_on;
    case "Off":
      return motion_off;
    case "Half":
      return motion_half;
  }
};

const preview_icon = (preview: boolean): string =>
  preview ? preview_on : preview_off;

const projection_icon = (projection: Settings.projection): string => {
  switch (projection) {
    case "LinearPrefix":
      return linear_prefix;
    case "LinearInfix":
      return linear_infix;
    case "TreeLeft":
      return tree_left;
    case "TreeTop":
      return tree_top;
  }
};

const symbols_icon = (symbols: Settings.symbols): string => {
  switch (symbols) {
    case "Emoji":
      return prims;
    case "SingleChar":
      return alphabet;
  }
};

const theme_icon = (theme: Settings.theme): string => {
  switch (theme) {
    case "Dark":
      return sun_off;
    case "Light":
      return sun_on;
  }
};

let action_icon = (action: Settings.Action, settings: Settings.t): string => {
  switch (action) {
    case "ToggleSound":
      return sound_icon(settings.sound);
    case "ToggleMotion":
      return motion_icon(settings.motion);
    case "TogglePreview":
      return preview_icon(settings.preview);
    case "ToggleProjection":
      return projection_icon(settings.projection);
    case "ToggleSymbols":
      return symbols_icon(settings.symbols);
    case "ToggleDark":
      return theme_icon(settings.theme);
  }
};

let icon = (
  inject: Action.Inject,
  settings: Settings.t,
  action: Settings.Action
) => (
  <img
    class="icon"
    src={action_icon(action, settings)}
    onmousedown={setSetting(inject, action)}
  />
);

export const SettingsView: Component<{
  model: Model;
  inject: (_: Action.t) => void;
}> = (props) => (
  <div id="settings-panel">
    {icon(props.inject, props.model.settings, "ToggleSound")}
    {icon(props.inject, props.model.settings, "ToggleMotion")}
    {icon(props.inject, props.model.settings, "TogglePreview")}
    {icon(props.inject, props.model.settings, "ToggleDark")}
    {icon(props.inject, props.model.settings, "ToggleProjection")}
    {icon(props.inject, props.model.settings, "ToggleSymbols")}
    
  </div>
);
