import { Component } from "solid-js";
import { For, Show, Switch, Match } from "solid-js";
import { Model } from "../Model";
import * as Action from "../Action";
import { ExpView } from "./ExpView";
import * as Hover from "../Hover";
import { depth, width } from "../syntax/Node";
import * as Projector from "../Projector";
import * as Stage from "../Stage";

const stage_scale = (w: number) => {
  if (w < 10) {
    return '0.8em';
  } else {
    return `${100/1.85/w}vh`;
  }
};

export const StageView: Component<{
  model: Model;
  inject: (_: Action.t) => void;
}> = (props) => (
  <div
    id="stage"
    style={`font-size: ${stage_scale(
      Stage.projected_width(props.model.stage)
    )}`}
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
