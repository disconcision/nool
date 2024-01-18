import { Component } from "solid-js";
import { For, Show, Index } from "solid-js";
//import Rand from "rand-seed";
import * as Pat from "../syntax/Pat";
import { Exp } from "../syntax/Exp";
import * as Action from "../Action";
import * as Path from "../syntax/Path";
import * as Statics from "../Statics";
import * as Stage from "../Stage";
import * as Names from "../Names";
import * as Settings from "../Settings";

type expviewprops = {
  node: Exp;
  info: Statics.InfoMap;
  selection: Stage.selection;
  animate: boolean;
  is_head: boolean;
  inject: Action.Inject;
  mask: Pat.Binding[];
  symbols: Settings.symbols;
};

const setSelect = (props: expviewprops) => (e: Event) => {
  e.preventDefault();
  //above modulates whether shake occurs for some reason?
  e.stopPropagation();
  props.inject({
    t: "setSelect",
    path: Statics.get(props.info, props.node.id).path,
  });
};

const common_clss = ({ node, mask, info, selection }: expviewprops): string => {
  const { path, depth } = Statics.get(info, node.id);
  const is_selected =
    selection == "unselected" ? false : Path.eq(path, selection);
  const binding = mask.find(
    ({ ids: [_, id_stage], t }) => id_stage == node.id && t == "Val"
  );
  const mask_cls = binding?.t == "Val" ? "mask " + binding?.val[0] : "";
  return `node ${is_selected ? "selected" : ""} ${mask_cls} depth-${depth}`;
};

const ExpViewGo: Component<expviewprops> = (props) => {
  const atom_flip = (
    animate: boolean,
    mask: Pat.Binding[],
    id: number
  ): Record<string, string> =>
    animate ? { "data-flip-key": `flip-${id}` } : {};

  //&& mask.some(({ ids, t }) => t === "Val" &&ids[1] === id)
  const comp_flip = (animate: boolean, mask: Pat.Binding[], id: number) =>
    animate ? { "data-flip-key-comp": `flip-${id}` } : {};

  switch (props.node.t) {
    case "Atom":
      return (
        <Show
          when={props.is_head}
          fallback={
            <div
              id={`node-${props.node.id}`}
              class={`atom ${props.node.sym} ` + common_clss(props)}
              onpointerdown={setSelect(props)}
              {...atom_flip(props.animate, props.mask, props.node.id)}
            >
              {Names.get(props.symbols, props.node.sym)}
            </div>
          }
        >
          <div
            id={`node-${props.node.id}`}
            class="head"
            {...atom_flip(props.animate, props.mask, props.node.id)}
          >
            {Names.get(props.symbols, props.node.sym)}
          </div>
        </Show>
      );
    case "Comp":
      return (
        <div
          id={`node-${props.node.id}`}
          class={`comp ` + common_clss(props)}
          onpointerdown={setSelect(props)}
          {...comp_flip(props.animate, props.mask, props.node.id)}
        >
          {
            <Index each={props.node.kids}>
              {(kid, i) => (
                <ExpViewGo
                  info={props.info}
                  selection={props.selection}
                  node={kid()}
                  animate={props.animate}
                  is_head={i === 0}
                  inject={props.inject}
                  mask={props.mask}
                  symbols={props.symbols}
                />
              )}
            </Index>
          }
        </div>
      );
  }
};

export const ExpView: Component<{
  stage: Stage.t;
  inject: Action.Inject;
  mask: Pat.Binding[];
  symbols: Settings.symbols;
}> = (props) =>
  ExpViewGo({
    info: props.stage.info,
    selection: props.stage.selection,
    node: props.stage.exp,
    inject: props.inject,
    mask: props.mask,
    is_head: false,
    animate: true,
    symbols: props.symbols,
  });

export const ViewOnly: Component<{
  node: Exp;
  symbols: Settings.symbols;
}> = (props) =>
  ExpViewGo({
    info: Statics.mk(props.node, []),
    selection: "unselected",
    node: props.node,
    animate: false,
    is_head: false,
    inject: (_) => {},
    mask: [],
    symbols: props.symbols,
  });
