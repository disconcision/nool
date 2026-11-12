import { Component, Show } from "solid-js";
import { StageView } from "../view/StageView";
import { ToolsView } from "../view/ToolsView";
import { AdjacentPossible } from "../view/PreView";
import * as Model from "../Model";
import * as Action from "../Action";
import * as Settings from "../Settings";
import { compact } from "./SettingsView";

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
      (props.model.settings.dragging ? " dragging" : "") +
      (props.model.settings.dockNoolbox ? " docked" : "") +
      /* compact layouts only (index.css): the noolbox folds to its spine */
      (Settings.folded(props.model.settings) ? " folded" : "") +
      ` boost-${String(props.model.settings.boost).replace(".", "")}`
    }
    /* Background presses clear the selection on POINTERdown, the event the
     * nodes and noolbox claim (each stops its propagation). On mousedown
     * this misfired on iPhone: iOS Safari still sends the compatibility
     * mousedown after a tap even when pointerdown was cancelled, so a tap
     * that selected a node bubbled here a moment later and unselected it.
     * mousedown is kept only to stop text selection and focus moves. */
    onpointerdown={() => {
      /* drag mode has no selection mechanic; background clicks are inert */
      if (!props.model.settings.dragging)
        props.inject({ t: "unsetSelections" });
    }}
    onmousedown={(e) => e.preventDefault()}
  >
    <ToolsView model={props.model} inject={props.inject} />
    <div
      class="icon2"
      /* the strike sounds in BOTH modes; stopping the bubble keeps the
         background's unselect pluck from doubling it */
      onpointerdown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        /* compact layouts: the seed folds/unfolds the noolbox (the
         * fold-handle role the world-tree design gives the seed); desktop
         * keeps the strike */
        if (compact())
          props.inject({ t: "setSetting", action: "ToggleFold" });
        else props.inject({ t: "strikeSeed" });
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
