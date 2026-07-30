import { Component, Show } from "solid-js";
import { StageView } from "../view/StageView";
import { ToolsView } from "../view/ToolsView";
import { AdjacentPossible } from "../view/PreView";
import * as Model from "../Model";
import * as Action from "../Action";

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
      dragging: props.model.settings.dragging,
    }}
    onmousedown={(e) => {
      e.preventDefault();
      props.inject({ t: "unsetSelections" });
    }}
  >
    <ToolsView model={props.model} inject={props.inject} />
    <div class="icon2">
      <div class="inner" />
    </div>
    <StageView model={props.model} inject={props.inject} />
    <Show when={props.model.settings.preview}>
      <AdjacentPossible
        stage={props.model.stage}
        tools={props.model.tools.transforms}
        inject={props.inject}
        settings={props.model.settings}
      />
    </Show>
  </div>
);
