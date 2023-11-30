import { Component } from "solid-js";
import { For, Show } from "solid-js";
//import Rand from "rand-seed";
import { Binding } from "../syntax/Pat";
import { Exp } from "../syntax/Exp";
import * as Action from "../Action";
import * as Path from "../syntax/Path";
import * as Statics from "../Statics";
import * as Stage from "../Stage";
import * as Hover from "../Hover";

const node_mask_cls = (id: number, mask: Binding[]): string => {
  const binding = mask.find(
    ({ ids: [_, id_stage], t }) => id_stage == id && t == "Val"
  );
  return binding?.t == "Val" ? "mask " + binding?.val[0] : "";
};

const ExpViewGo: Component<{
  node: Exp;
  info: Statics.InfoMap;
  path: Path.t;
  animate: boolean;
  is_head: boolean;
  inject: Action.Inject;
  mask: Binding[];
}> = (props) => {
  const setSelect = (id: number) => (e: Event) => {
    //e.preventDefault();pcs
    //above modulates whether shake occurs for some reason
    e.stopPropagation();
    props.inject({
      t: "setSelect",
      path: Statics.get(props.info, id).path,
    });
  };
  const is_selected = (props: {
    node: Exp;
    info: Statics.InfoMap;
    path: Path.t;
  }): boolean => {
    let node_path = Statics.get(props.info, props.node.id).path;
    return Path.eq(node_path, props.path);
  };
  //TODO: anys
  const head = (props: any) => {
    //console.log("head", props.node.id);
    return (
      <ExpViewGo
        info={props.info}
        path={props.path}
        node={props.node.kids[0]}
        animate={props.animate}
        is_head={true}
        inject={props.inject}
        mask={props.mask}
      />
    );
  };
  const tail = (props: any) => (
    <div class="tail">
      <For each={props.node.kids.slice(1)}>
        {(kid) => (
          <ExpViewGo
            info={props.info}
            path={props.path}
            node={kid}
            animate={props.animate}
            is_head={false}
            inject={props.inject}
            mask={props.mask}
          />
        )}
      </For>
    </div>
  );
  /*
  {is_selected(props) ? (
          <div class="node comp floatselect" data-flip-key-comp={`flip-${666}`}>{head(props)}
          {tail(props)}</div>
        ) : null}
  */
  const selected = is_selected(props) ? "selected" : "";
  const node_mask = node_mask_cls(props.node.id, props.mask);
  //TODO: betterize bucketing
  //const bucket = Math.min(5, Math.max(1, Math.floor(size / 2)));
  const size_class = `depth-${Statics.get(props.info, props.node.id).depth}`;
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
              class={`node atom ${props.node.sym} ${selected} ${node_mask} ${size_class}`}
              onpointerdown={setSelect(props.node.id)}
              //onpointerenter={setSelect(props.node.id)}
            >
              {props.node.sym}
              {/*<div class="id-view">{props.node.id}</div>*/}
            </div>
          }
        >
          <div class="head" {...opts}>
            {props.node.sym}
            {/*<div class="id-view">{props.node.id}</div>*/}
          </div>
        </Show>
      );
    case "Comp":
      var opts: any = {};
      if (
        props.animate &&
        props.mask.map((x) => x.ids[1]).find((id) => id == props.node.id)
      ) {
        opts[`data-flip-key-comp`] = `flip-${props.node.id}`;
      }
      return (
        // <div style="position: relative">
        <div
          //data-flip-parent={`flip-${props.node.id}`}
          {...opts}
          class={`node comp ${selected} ${node_mask} ${size_class}`}
          onpointerdown={setSelect(props.node.id)}
          //onpointerenter={setSelect(props.node.id)}
        >
          {/*<div class="id-view">{props.node.id}</div>*/}
          {head(props)}
          {tail(props)}
        </div>
        //</div>
      );
  }
};

export const ExpView: Component<{
  stage: Stage.t;
  inject: Action.Inject;
  mask: Binding[];
}> = (props) =>
  ExpViewGo({
    info: props.stage.info,
    path: props.stage.selection,
    node: props.stage.exp,
    inject: props.inject,
    mask: props.mask,
    is_head: false,
    animate: true,
  });

export const ViewOnly: Component<{
  node: Exp;
}> = (props) =>
  ExpViewGo({
    info: Statics.mk(props.node, []),
    path: [],
    node: props.node,
    animate: false,
    is_head: false,
    inject: (_) => {},
    mask: [],
  });
