import { Component } from "solid-js";
import { For, Show, Switch, Match } from "solid-js";
import { TransformResult } from "../syntax/Pat";
import { Model, init_model } from "../Model";
import { Inject } from "../Update";
import { Transform, do_at_path } from "../Transforms";
import { NodeExp } from "./ExpView";
import { Exp } from "../syntax/Exp";

const Preview: Component<{
  model: Model;
  node: Exp;
  t: Transform;
  path: number[];
  inject: Inject;
}> = (props) => {
  const transform = (props:any)=>(e: Event) => {
    //e.preventDefault();
    console.log("yoo");
    props.inject({
      t: "transformNode",
      idx: 0,
      transform: props.t,
      f: do_at_path(props.t, props.path),
    })};

  //HACK: init_model
  return (
    <div
      class="node-container"
      onmousedown={transform(props)}
    >
      {NodeExp({
        model: props.model,
        node: props.node,
        animate: false,
        is_head: false,
        inject: (_) => {},
        mask: [],
      })}
    </div>
  );
};

export const AdjacentPossible: Component<{
  path: number[];
  stage: Exp;
  model: Model;
  inject: Inject;
}> = (props) => {
  return (
    <div class="previews" style={"display: flex;"}>
      <For each={props.model.transforms_directed}>
        {(t) => {
          const node = do_at_path(t, props.path)(props.model.stage);
          switch (node) {
            case "NoMatch":
              return <div></div>;
            default:
              return Preview({
                model: props.model,
                node,
                t,
                path: props.model.selection,
                inject: props.inject,
              });
          }
        }}
      </For>
    </div>
  );
};
