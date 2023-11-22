import { Component } from "solid-js";
import { For, Show, Switch, Match } from "solid-js";
import { Exp, TransformResult } from "../Tree";
import { Model, init_model } from "../Model";
import { Inject } from "../Update";
import { Transform, do_at } from "../Transforms";
import { NodeExp } from "./ExpView";

const Preview: Component<{
  node: Exp;
  f: Transform;
  indicated: number;
  inject: Inject;
}> = (props) => {
  const transform = (f: (_: Exp) => TransformResult) => (_: Event) =>
    props.inject({ t: "transformNode", idx: 0, /* TODO hack idx */ f });
  const node = do_at(props.f, props.indicated)(props.node);
  //HACK: init_model
  return (
    <div
      class="node-container"
      style={node == "NoMatch" ? "display: none" : ""}
      onmousedown={(evt) => {
        console.log("yo");
        transform(do_at(props.f, props.indicated))(evt);
      }}
    >
      {node == "NoMatch" ? (
        <div></div>
      ) : (
        NodeExp({
          model: init_model,
          node,
          animate: false,
          is_head: false,
          parent_id: -1,
          depth: 0,
          inject: (_) => {},
          mask: [],
        })
      )}
    </div>
  );
};

export const AdjacentPossible: Component<{ model: Model; inject: Inject }> = (
  props
) => {
  //TODO: BUG: instead of -1, check if selection is actually in tree
  return (
    <div
      class="previews"
      style={
        props.model.selection.id == -1 ? "display: none;" : "display: flex;"
      }
    >
      <For each={props.model.transforms_directed}>
        {(transform) =>
          Preview({
            node: props.model.stage,
            f: transform,
            indicated: props.model.selection.id,
            inject: (_) => {},
          })
        }
      </For>
    </div>
  );
};
