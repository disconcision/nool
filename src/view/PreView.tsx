import { Component } from "solid-js";
import { For, Show, Switch, Match } from "solid-js";
import { TransformResult } from "../syntax/Pat";
import { Model, init_model } from "../Model";
import { Inject } from "../Update";
import { Transform, do_at_path, rev } from "../Transforms";
import { NodeExp, ViewOnly } from "./ExpView";
import * as Exp from "../syntax/Exp";
import * as Path from "../syntax/Path";
import { subtree_at } from "../syntax/Node";
import * as Statics from "../Statics";

const transformer =
  (inject: Inject, transform: Transform, path: Path.t) => (_e: Event) => {
    inject({
      t: "transformNode",
      idx: 0,
      transform,
      f: do_at_path(transform, path),
    });
  };

const preview = (node: Exp.t, transformer: (_e: Event) => void) => (
  <div class="node-container" onmousedown={transformer}>
    {ViewOnly({ node: node })}
  </div>
);

const directed = (transforms: Transform[]): Transform[] =>
  transforms.flatMap((t) => [t, rev(t)]);

const do_transforms = ({
  transforms,
  stage,
  selection,
}: Model): [Transform, Exp.t][] => {
  const exp = subtree_at(selection, stage);
  if (exp == undefined) return [];
  return (
    directed(transforms)
      .map((t) => [t, do_at_path(t, [])(exp)] as [Transform, TransformResult])
      .filter((res): res is [Transform, Exp.t] => res[1] !== "NoMatch")
      // filter duplicate expressions
      .filter(
        ([_, exp], i, arr) =>
          arr.findIndex(([_, exp2]) => Exp.equals(exp, exp2)) === i
      )
  );
};

export const AdjacentPossible: Component<{
  path: Path.t;
  stage: Exp.t;
  model: Model;
  inject: Inject;
}> = (props) => {
  return (
    <div class="previews" style={"display: flex;"}>
      <For each={do_transforms(props.model)}>
        {([transform, node]) =>
          preview(node, transformer(props.inject, transform, props.path))
        }
      </For>
    </div>
  );
};
