import { Component } from "solid-js";
import { For, Show, Switch, Match } from "solid-js";
import { Model } from "../Model";
import * as Action from "../Action";
import { ExpView } from "./ExpView";
import * as Hover from "../Hover";

export const StageView: Component<{
  model: Model;
  inject: (_: Action.t) => void;
}> = (props) => (
  <div id="stage">
    <div id="debug" style="display:none">
      <div>selection.path: {props.model.stage.selection}</div>
    </div>
    <div class={`node-container ${props.model.settings.projection}`}>
      {ExpView({
        stage: props.model.stage,
        inject: props.inject,
        mask: Hover.get_binding(props.model),
        symbols: props.model.settings.symbols,
      })}
    </div>
  </div>
);
