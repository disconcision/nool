import { Component } from "solid-js";
import { StageView } from "../view/StageView";
import { ToolsView } from "../view/ToolsView";
import { AdjacentPossible } from "../view/PreView";
import * as Model from "../Model";
import * as Action from "../Action";
import infinity from "../assets/nool-seed-infinity-only.svg"

const blah = () => (
  <div class="toolbar2">
    {" "}
    <ul class="tools">
      <li class="tool">A</li>
      <li>B</li>
      <li>C</li>
      <li>D</li>
      <li>E</li>
    </ul>
  </div>
);

export const Seed: Component<{ model: Model.t; inject: Action.Inject }> = (
  props
) => (
  <div
  id="seed"
    class={`${props.model.settings.projection} ${props.model.settings.symbols}`}
    classList={{
      notransition: props.model.settings.motion === "Off",
      noanimation: props.model.settings.motion === "Off",
      notransformation: props.model.settings.motion === "Off",
    }}
    onclick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      props.inject({ t: "unsetSelections" });
    }}
  >
    {ToolsView({ model: props.model, inject: props.inject })}
    {/* <div class="icon">♾️</div> */}
    <div class="icon2">
    <div class="inner" />
    </div>
    {StageView({ model: props.model, inject: props.inject })}
    {props.model.settings.preview
      ? AdjacentPossible({
          stage: props.model.stage,
          tools: props.model.tools.transforms,
          inject: props.inject,
          settings: props.model.settings,
        })
      : null}
  </div>
);
