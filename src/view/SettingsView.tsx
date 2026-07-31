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
import drag_off from "../assets/icons/noun-tool-3376727.svg"
import drag_on from "../assets/icons/noun-transformation-6040368.svg"
import mech_rails from "../assets/icons/noun-cycle-4446.svg"
import mech_closest from "../assets/icons/noun-cycle-1793611.svg"
import debug_on from "../assets/icons/noun-1831710.svg"
import debug_off from "../assets/icons/noun-1831712.svg"

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

const dragging_icon = (dragging: boolean): string =>
  dragging ? drag_on : drag_off;

const drag_mechanic_icon = (m: Settings.dragMechanic): string =>
  m === "Rails" ? mech_rails : mech_closest;

const drag_debug_icon = (on: boolean): string => (on ? debug_on : debug_off);

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
    case "ToggleDragging":
      return dragging_icon(settings.dragging);
    case "ToggleDragMechanic":
      return drag_mechanic_icon(settings.dragMechanic);
    case "ToggleDragDebug":
      return drag_debug_icon(settings.dragDebug);
  }
};

/* Hover tooltips: what the toggle does + its current state. */
const action_title = (action: Settings.Action, settings: Settings.t): string => {
  switch (action) {
    case "ToggleSound":
      return `Sound: ${settings.sound ? "on" : "off"}`;
    case "ToggleMotion":
      return `Motion: ${settings.motion}`;
    case "TogglePreview":
      return `Adjacent-possible preview: ${settings.preview ? "on" : "off"}`;
    case "ToggleProjection":
      return `Projection: ${settings.projection}`;
    case "ToggleSymbols":
      return `Symbols: ${settings.symbols}`;
    case "ToggleDark":
      return `Theme: ${settings.theme}`;
    case "ToggleDragging":
      return `Drag mode (drag nodes to rewrite): ${
        settings.dragging ? "on" : "off"
      }`;
    case "ToggleDragMechanic":
      return `Drag mechanic: ${
        settings.dragMechanic === "Rails"
          ? "Rails (knob rides rails; change rules at the hub)"
          : "Closest (nearest track wins each frame)"
      }`;
    case "ToggleDragDebug":
      return `Drag debug overlay (rails, anchors, t readout): ${
        settings.dragDebug ? "on" : "off"
      }`;
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
    title={action_title(action, settings)}
    onmousedown={setSetting(inject, action)}
  />
);

/* Corner clusters, three icons each (an L per corner, no 2x2 squares):
 * top-left sound·preview·reset, top-right theme·projection·symbols,
 * bottom-left the drag trio, bottom-right empty. Order here must match
 * the nth-child positioning in index.css. */
export const SettingsView: Component<{
  model: Model;
  inject: (_: Action.t) => void;
}> = (props) => (
  <div id="settings-panel">
    {icon(props.inject, props.model.settings, "ToggleSound")}
    {icon(props.inject, props.model.settings, "TogglePreview")}
    <img
      class="icon"
      src={ded}
      title="Reset everything (world, settings, history)"
      onmousedown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.confirm("Reset everything to default?"))
          props.inject({ t: "hardReset" });
      }}
    />
    {icon(props.inject, props.model.settings, "ToggleDark")}
    {icon(props.inject, props.model.settings, "ToggleProjection")}
    {icon(props.inject, props.model.settings, "ToggleSymbols")}
    {icon(props.inject, props.model.settings, "ToggleDragging")}
    {icon(props.inject, props.model.settings, "ToggleDragMechanic")}
    {icon(props.inject, props.model.settings, "ToggleDragDebug")}
  </div>
);
