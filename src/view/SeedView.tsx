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
    /* single class expression: mixing a reactive `class` with `classList`
     * lets a class re-evaluation clobber the classList-managed names */
    class={
      `${props.model.settings.projection} ${props.model.settings.symbols}` +
      (props.model.settings.motion === "Off"
        ? " notransition noanimation notransformation"
        : "") +
      (props.model.settings.dragging ? " dragging" : "")
    }
    onmousedown={(e) => {
      e.preventDefault();
      /* drag mode has no selection mechanic; background clicks are inert */
      if (!props.model.settings.dragging)
        props.inject({ t: "unsetSelections" });
    }}
  >
    <ToolsView model={props.model} inject={props.inject} />
    <div
      class="icon2"
      /* the strike sounds in BOTH modes; stopping the bubble keeps the
         background's unselect pluck from doubling it */
      onmousedown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        props.inject({ t: "strikeSeed" });
      }}
    >
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
