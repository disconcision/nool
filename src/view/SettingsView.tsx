import { Component } from "solid-js";
import { Model } from "../Model";
import { Action, Inject } from "../Update";
import * as Settings from "../Settings";
import sound_icon_on from "../assets/sound-on.svg";
import sound_icon_off from "../assets/sound-off.svg";
import motion_on from "../assets/motion-on.svg";
import motion_off from "../assets/motion-off.svg";
import motion_half from "../assets/motion-half.svg";
import preview_on from "../assets/eye-open.svg";
import preview_off from "../assets/eye-closed.svg";

const setSetting = (inject: Inject, action: Settings.Action) => (e: Event) => {
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

let action_icon = (action: Settings.Action, settings: Settings.t): string => {
  switch (action) {
    case "ToggleSound":
      return sound_icon(settings.sound);
    case "ToggleMotion":
      return motion_icon(settings.motion);
    case "TogglePreview":
      return preview_icon(settings.preview);
  }
};

let icon = (inject: Inject, settings: Settings.t, action: Settings.Action) => (
  <img
    class="icon"
    src={action_icon(action, settings)}
    onmousedown={setSetting(inject, action)}
  />
);

export const SettingsView: Component<{
  model: Model;
  inject: (_: Action) => void;
}> = (props) => (
  <div id="settings-panel">
    {icon(props.inject, props.model.settings, "ToggleSound")}
    {icon(props.inject, props.model.settings, "ToggleMotion")}
    {icon(props.inject, props.model.settings, "TogglePreview")}
  </div>
);
