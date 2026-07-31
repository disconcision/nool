import { Component } from "solid-js";
import { For, Show } from "solid-js";
import { Transform, at_path, flip } from "../Transform";
import { subtree_at } from "../syntax/Node";
import { ViewOnly } from "./ExpView";
import * as Pat from "../syntax/Pat";
import * as Exp from "../syntax/Exp";
import * as Path from "../syntax/Path";
import * as Stage from "../Stage";
import * as Action from "../Action";
import * as Settings from "../Settings";
import { map_ids } from "../syntax/Node";
import * as Id from "../syntax/ID";

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
  transforms.flatMap((t) => [t, flip(t)]);

export const do_transforms = (
  exp: Exp.t,
  transforms: Transform[]
): [Transform, Exp.t][] =>
  directed(transforms)
    .map((t) => [t, at_path(t, [])(exp)] as [Transform, Pat.TransformResult])
    .filter((res): res is [Transform, Exp.t] => res[1] !== "NoMatch")
    // filter duplicate expressions
    .filter(
      ([_, exp], i, arr) =>
        arr.findIndex(([_, exp2]) => Exp.equals(exp, exp2)) === i
    )
    // unduplicate ids to avoid messing with transition animations
    .map(([t, e]): [Transform, Exp.t] => [t, map_ids(() => Id.mk(), e)]);

export const AdjacentPossible: Component<{
  stage: Stage.t;
  tools: Transform[];
  inject: Action.Inject;
  settings: Settings.t;
}> = (props) => {
  const selected = () =>
    props.stage.selection === "unselected"
      ? undefined
      : subtree_at(props.stage.selection, props.stage.exp);
  return (
    <Show when={selected()} keyed fallback={<div></div>}>
      {(sel) => (
        <div class="previews" style={"display: flex;"}>
          <For each={do_transforms(sel, props.tools)}>
            {([transform, node]) => (
              <div
                class={`node-container ${props.settings.projection}`}
                onmousedown={
                  props.stage.selection === "unselected"
                    ? (_) => {}
                    : transformer(
                        props.inject,
                        transform,
                        props.stage.selection
                      )
                }
              >
                <ViewOnly node={node} symbols={props.settings.symbols} />
              </div>
            )}
          </For>
        </div>
      )}
    </Show>
  );
};
