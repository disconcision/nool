import { Component } from "solid-js";
import { For, Show, Switch, Match } from "solid-js";
import { Binding, matches_at_path } from "../syntax/Pat";
import { Model } from "../Model";
import * as Action from "../Action";
import { ExpView } from "./ExpView";

const get_hover_binding = (model: Model): Binding[] => {
  switch (model.hover.t) {
    case "NoHover":
      return [];
    case "StageNode":
      return [];
    case "TransformSource":
      if (model.stage.selection == "unselected") return [];
      const rs = matches_at_path(
        model.stage.exp,
        model.hover.pat,
        model.stage.selection
      );
      return rs == "NoMatch" ? [] : rs;
    case "TransformResult":
      if (model.stage.selection == "unselected") return [];
      const rr = matches_at_path(
        model.stage.exp,
        model.hover.pat,
        model.stage.selection
      );
      return rr == "NoMatch" ? [] : rr;
  }
};

export const StageView: Component<{
  model: Model;
  inject: (_: Action.t) => void;
}> = (props) => {
  //console.log("rendering stage. selection.id is", props.model.selection.id);
  return (
    <div id="stage">
      <div id="debug" style="display:none">
        <div>selection.path: {props.model.stage.selection}</div>
      </div>
      <div class={`node-container ${props.model.settings.projection}`} >
        {ExpView({
          stage: props.model.stage,
          inject: props.inject,
          mask: get_hover_binding(props.model),
        })}
      </div>
    </div>
  );
};
