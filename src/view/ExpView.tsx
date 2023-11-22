import { Component } from "solid-js";
import { For, Show } from "solid-js";
//import Rand from "rand-seed";
import { Exp, Binding } from "../Tree";
import { Model } from "../Model";
import { Inject } from "../Update";

const node_mask_cls = (id: number, mask: Binding[]): string => {
  const binding = mask.find(
    ({ ids: [_, id_stage], t }) => id_stage == id && t == "Val"
  );
  return binding?.t == "Val" ? "mask " + binding?.val[0] : "";
};

export const NodeExp: Component<{
  node: Exp;
  model: Model;
  animate: boolean;
  is_head: boolean;
  parent_id: number;
  depth: number;
  inject: Inject;
  mask: Binding[];
}> = (props) => {
  const setSelect = (id: number) => (e: Event) => {
    //e.preventDefault();
    //above modulates whether shake occurs for some reason
    e.stopPropagation();
    props.inject({ t: "setSelect", id });
  };
  /* TODO: figure out why below has to be a function. if it's not,
     then the stage doesn't get redrawn after selects other than
     the first one. this only started occuring after the previous commits */
  let is_selected = (props:any) => props.node.id == props.model.selection.id;
  const node_mask = node_mask_cls(props.node.id, props.mask);
  //const yolo = new Rand(`${props.node.id}`);
  switch (props.node.t) {
    case "Atom":
      var opts: any = {};
      if (props.animate) {
        opts[`data-flip-key`] = `flip-${props.node.id}`;
      }
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
      //console.log("this props.mask:" + props.mask.map((x) => x.ids[1]));
      //console.log("this props.node.id:" + props.node.id);
      if (
        props.animate &&
        props.mask.map((x) => x.ids[1]).find((id) => id == props.node.id)
      ) {
        opts[`data-flip-key-comp`] = `flip-${props.node.id}`;
      }
      return (
        //data-flip-key={`flip-${node.id}`}
        <div
          //data-flip-parent={`flip-${props.node.id}`}
          {...opts}
          class={`node comp ${is_selected(props) ? "selected" : ""} ${node_mask}`}
          // for granite style:
          /*style={`background-position: ${Math.floor(yolo.next() * 10)}0% 77.8%;`}*/
          onpointerdown={setSelect(props.node.id)}
        >
          <div class="id-view">{props.node.id}</div>
          <NodeExp
            model={props.model}
            node={props.node.kids[0]}
            animate={props.animate}
            is_head={true}
            parent_id={props.node.id}
            depth={props.depth + 1}
            inject={props.inject}
            mask={props.mask}
          />
          <div class="tail">
            <For each={props.node.kids.slice(1)}>
              {(kid) => (
                <NodeExp
                  model={props.model}
                  node={kid}
                  animate={props.animate}
                  is_head={false}
                  parent_id={props.node.id}
                  depth={props.depth + 1}
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
