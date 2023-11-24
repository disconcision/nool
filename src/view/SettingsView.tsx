import { Component } from "solid-js";
import { Model } from "../Model";
import { Action, Inject } from "../Update";
import * as Settings from "../Settings";
import sound_icon_on from "../assets/sound-on.svg";
import sound_icon_off from "../assets/sound-off.svg";
import motion_on from "../assets/motion-on.svg";
import motion_off from "../assets/motion-off.svg";
import motion_half from "../assets/motion-half.svg";

const setSetting = (inject: Inject, action: Settings.Action) => (e: Event) => {
  e.preventDefault();
  e.stopPropagation();
  inject({
    t: "setSetting",
    action,
  });
};

const sound_icon = (sound: boolean): string => {
  return sound ? sound_icon_on : sound_icon_off;
};

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

let icon = (inject: Inject, img: string, action: Settings.Action) => (
  <img class="icon" src={img} onmousedown={setSetting(inject, action)} />
);

export const SettingsView: Component<{
  model: Model;
  inject: (_: Action) => void;
}> = (props) => {
  return (
    <div id="settings-panel">
      {icon(props.inject, sound_icon(props.model.settings.sound), "ToggleSound")}
      {icon(props.inject, motion_icon(props.model.settings.motion), "ToggleMotion")}
    </div>
  );
};
