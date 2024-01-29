import { Component } from "solid-js";
import { For, Show, Switch, Match } from "solid-js";
import { Model } from "../Model";
import * as Action from "../Action";
import { ExpView } from "./ExpView";
import * as Hover from "../Hover";
import { depth } from "../syntax/Node";

const stage_scale = (d: number) => (d == 0 ? 1 : 4 / (d + 1));

export const StageView: Component<{
  model: Model;
  inject: (_: Action.t) => void;
}> = (props) => (
  <div
    id="stage"
    style={`font-size: ${stage_scale(depth(props.model.stage.exp))}em`}
  >
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
