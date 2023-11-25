import { Component } from "solid-js";
import { For, Show, Switch, Match } from "solid-js";
import { Binding, matches_at_path } from "../syntax/Pat";
import { Model } from "../Model";
import { Action } from "../Update";
import { AdjacentPossible } from "./PreView";
import { NodeExp } from "./ExpView";
import { SettingsView } from "./SettingsView";

const get_hover_binding = (model: Model): Binding[] => {
  switch (model.hover.t) {
    case "NoHover":
      return [];
    case "StageNode":
      return [];
    case "TransformSource":
      const rs = matches_at_path(model.stage, model.hover.pat, model.selection);
      return rs == "NoMatch" ? [] : rs;
    case "TransformResult":
      const rr = matches_at_path(model.stage, model.hover.pat, model.selection);
      return rr == "NoMatch" ? [] : rr;
  }
};

export const Stage: Component<{ model: Model; inject: (_: Action) => void }> = (
  props
) => {
  //console.log("rendering stage. selection.id is", props.model.selection.id);
  return (
    <div id="stage">
      {SettingsView({ model: props.model, inject: props.inject })}
      <div id="debug" style="display:none">
        <div>selection.path: {props.model.selection}</div>
      </div>
      <div class="node-container">
        {NodeExp({
          model: props.model,
          mask: get_hover_binding(props.model),
          node: props.model.stage,
          is_head: false,
          inject: props.inject,
          animate: true,
        })}
        {props.model.settings.preview ? AdjacentPossible({
          path: props.model.selection,
          stage: props.model.stage,
          model: props.model,
          inject: props.inject,
        }) : null}
      </div>
    </div>
  );
};

/*
paint plan:

this version only label nodes; does not replace them
we have a map from ids to (user-specified) attributes including paint color
paint colors come from a fixed palette which includes emojicon labels

flavor: Unflavored | {color: string, label: string}
palette: list(flavor)
attributes: {
  flavor,
  show = Overlay | Collapsed // overlay is color if flavored, collapsed is color + label or "..." if unflavored
}

model 1:
  model.paint = map(ids, attributes) 

view 1:
  for now implictly supress child Overlays, though retained Collapsed

actions 1:
  paintNode(id, flavor)
  showNode(id, show)
  unpaintAllOf(flavor)
  unpaintAll()
  
and then after that works, we can add a second painting abstraction, antipainting:
  add new flavor 'EscapePaint' (name needs work)
  this is only meaningful on decendents of a painted node
  and conceptually it creates a delimited multi-holed context
  simple use case: quasi-folding everything above a selected node

*/
