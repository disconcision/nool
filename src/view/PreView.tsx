import { Component } from "solid-js";
import { For, Show, Switch, Match } from "solid-js";
import { TransformResult } from "../syntax/Pat";
import { Transform, at_path, rev } from "../Transform";
import { ViewOnly } from "./ExpView";
import * as Exp from "../syntax/Exp";
import * as Path from "../syntax/Path";
import * as Stage from "../Stage";
import * as Action from "../Action";
import { subtree_at } from "../syntax/Node";
import * as Settings from "../Settings";

const transformer =
  (inject: Action.Inject, transform: Transform, path: Path.t) =>
  (_e: Event) => {
    inject({
      t: "transformNode",
      idx: -1,
      transform,
      f: at_path(transform, path),
    });
  };

const directed = (transforms: Transform[]): Transform[] =>
  transforms.flatMap((t) => [t, rev(t)]);

const do_transforms = (
  exp: Exp.t,
  transforms: Transform[]
): [Transform, Exp.t][] =>
  directed(transforms)
    .map((t) => [t, at_path(t, [])(exp)] as [Transform, TransformResult])
    .filter((res): res is [Transform, Exp.t] => res[1] !== "NoMatch")
    // filter duplicate expressions
    .filter(
      ([_, exp], i, arr) =>
        arr.findIndex(([_, exp2]) => Exp.equals(exp, exp2)) === i
    );

const preview = (node: Exp.t, settings: Settings.t, transformer: (_e: Event) => void) => (
  <div class={`node-container ${settings.projection}`} onmousedown={transformer}>
    {ViewOnly({ node: node, symbols: settings.symbols })}
  </div>
);

export const AdjacentPossible: Component<{
  stage: Stage.t;
  tools: Transform[];
  inject: Action.Inject;
  settings: Settings.t;
}> = (props) => {
  if (props.stage.selection === "unselected") return <div></div>;
  const selection = subtree_at(props.stage.selection, props.stage.exp);
  if (selection === undefined) return <div></div>;
  return (
    <div class="previews" style={"display: flex;"}>
      <For each={do_transforms(selection, props.tools)}>
        {([transform, node]) => {
           if (props.stage.selection === "unselected") return <div></div>;
          return preview(
            node,
            props.settings,
            transformer(props.inject, transform, props.stage.selection)
          )}
        }
      </For>
    </div>
  );
};
