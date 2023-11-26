import { Component } from "solid-js";
import { For, Show, Switch, Match } from "solid-js";
import { TransformResult } from "../syntax/Pat";
import { Inject } from "../Update";
import { Transform, do_at_path, rev } from "../Transforms";
import { ViewOnly } from "./ExpView";
import * as Exp from "../syntax/Exp";
import * as Path from "../syntax/Path";
import { subtree_at } from "../syntax/Node";

const transformer =
  (inject: Inject, transform: Transform, path: Path.t) => (_e: Event) => {
    inject({
      t: "transformNode",
      idx: -1,
      transform,
      f: do_at_path(transform, path),
    });
  };

const directed = (transforms: Transform[]): Transform[] =>
  transforms.flatMap((t) => [t, rev(t)]);

const do_transforms = (
  exp: Exp.t,
  transforms: Transform[]
): [Transform, Exp.t][] =>
  directed(transforms)
    .map((t) => [t, do_at_path(t, [])(exp)] as [Transform, TransformResult])
    .filter((res): res is [Transform, Exp.t] => res[1] !== "NoMatch")
    // filter duplicate expressions
    .filter(
      ([_, exp], i, arr) =>
        arr.findIndex(([_, exp2]) => Exp.equals(exp, exp2)) === i
    );

const preview = (node: Exp.t, transformer: (_e: Event) => void) => (
  <div class="node-container" onmousedown={transformer}>
    {ViewOnly({ node: node })}
  </div>
);

export const AdjacentPossible: Component<{
  path: Path.t;
  stage: Exp.t;
  transforms: Transform[];
  inject: Inject;
}> = (props) => {
  const selection = subtree_at(props.path, props.stage);
  if (selection === undefined) return <div></div>;
  return (
    <div class="previews" style={"display: flex;"}>
      <For each={do_transforms(selection, props.transforms)}>
        {([transform, node]) =>
          preview(node, transformer(props.inject, transform, props.path))
        }
      </For>
    </div>
  );
};
