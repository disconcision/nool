import { Component } from "solid-js";
import { For, Show } from "solid-js";
//import Rand from "rand-seed";
import { Binding } from "../syntax/Pat";
import { Exp } from "../syntax/Exp";
import { Model } from "../Model";
import { Inject } from "../Update";
import { path_eq } from "../syntax/Node";
import * as Statics from "../Statics";

const node_mask_cls = (id: number, mask: Binding[]): string => {
  const binding = mask.find(
    ({ ids: [_, id_stage], t }) => id_stage == id && t == "Val"
  );
  return binding?.t == "Val" ? "mask " + binding?.val[0] : "";
};

export const NodeExp: Component<{
  node: Exp;
  model: Model;
  is_head: boolean;
  inject: Inject;
  mask: Binding[];
}> = (props) => {
  const setSelect = (id: number) => (e: Event) => {
    //e.preventDefault();
    //above modulates whether shake occurs for some reason
    e.stopPropagation();
    props.inject({
      t: "setSelect",
      path: Statics.get(props.model.info, id).path,
    });
  };
  const is_selected = (props: { node: Exp; model: Model }): boolean => {
    let node_path = Statics.get(props.model.info, props.node.id).path;
    return path_eq(node_path, props.model.selection);
  };
  const node_mask = node_mask_cls(props.node.id, props.mask);
  //const yolo = new Rand(`${props.node.id}`);
  switch (props.node.t) {
    case "Atom":
      var opts: any = {};
      opts[`data-flip-key`] = `flip-${props.node.id}`;
      return (
        <Show
          when={props.is_head}
          fallback={
            <div
              {...opts}
              class={`node atom ${props.node.sym} ${
                is_selected(props) ? "selected" : ""
              } ${node_mask}`}
              onpointerdown={setSelect(props.node.id)}
            >
              {props.node.sym}
              <div class="id-view">{props.node.id}</div>
            </div>
          }
        >
          <div class="head" {...opts}>
            {props.node.sym}
            <div class="id-view">{props.node.id}</div>
          </div>
        </Show>
      );
    case "Comp":
      var opts: any = {};
      if (props.mask.map((x) => x.ids[1]).find((id) => id == props.node.id)) {
        opts[`data-flip-key-comp`] = `flip-${props.node.id}`;
      }
      return (
        //data-flip-key={`flip-${node.id}`}
        <div
          data-flip-parent={`flip-${props.node.id}`}
          {...opts}
          class={`node comp ${
            is_selected(props) ? "selected" : ""
          } ${node_mask}`}
          // for granite style:
          /*style={`background-position: ${Math.floor(yolo.next() * 10)}0% 77.8%;`}*/
          onpointerdown={setSelect(props.node.id)}
        >
          <div class="id-view">{props.node.id}</div>
          <NodeExp
            model={props.model}
            node={props.node.kids[0]}
            is_head={true}
            inject={props.inject}
            mask={props.mask}
          />
          <div class="tail">
            <For each={props.node.kids.slice(1)}>
              {(kid) => (
                <NodeExp
                  model={props.model}
                  node={kid}
                  is_head={false}
                  inject={props.inject}
                  mask={props.mask}
                />
              )}
            </For>
          </div>
        </div>
      );
  }
};
