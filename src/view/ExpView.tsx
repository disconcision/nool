import { Component } from "solid-js";
import { For, Show } from "solid-js";
import * as Pat from "../syntax/Pat";
import { Exp } from "../syntax/Exp";
import * as Action from "../Action";
import * as Path from "../syntax/Path";
import * as Statics from "../Statics";
import * as Stage from "../Stage";
import * as Names from "../Names";
import * as Settings from "../Settings";

/* These are real components (invoked as JSX, not called as functions) so
 * solid keeps DOM nodes stable across model updates: class/attribute
 * bindings update in place, and <For> keyed on kid object identity reuses
 * subtrees the update didn't touch. The motion layer depends on this. */

type expviewprops = {
  node: Exp;
  info: Statics.InfoMap;
  selection: Stage.selection;
  is_head: boolean;
  inject: Action.Inject;
  mask: Pat.Binding[];
  symbols: Settings.symbols;
  /* drag mode: pointerdown grabs the node instead of selecting it */
  grab?: (id: number, e: PointerEvent) => void;
};

const setSelect = (props: expviewprops) => (e: PointerEvent) => {
  /* preventDefault also suppresses the compatibility mousedown, which would
   * otherwise bubble to #seed and fire unsetSelections */
  e.preventDefault();
  e.stopPropagation();
  if (props.grab) {
    props.grab(props.node.id, e);
    return;
  }
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
  const sym = () => (props.node.t === "Atom" ? props.node.sym : "");
  const kids = () => (props.node.t === "Comp" ? props.node.kids : []);
  return (
    <Show
      when={props.node.t === "Comp"}
      fallback={
        <Show
          when={props.is_head}
          fallback={
            <div
              id={`node-${props.node.id}`}
              class={`atom ${sym()} ` + common_clss(props)}
              onpointerdown={setSelect(props)}
            >
              <div id={`sym-${props.node.id}`}>
                {Names.get(props.symbols, sym())}
              </div>
            </div>
          }
        >
          <div id={`node-${props.node.id}`} class="head">
            {Names.get(props.symbols, sym())}
          </div>
        </Show>
      }
    >
      <div
        id={`node-${props.node.id}`}
        class={`comp ` + common_clss(props)}
        onpointerdown={setSelect(props)}
      >
        <For each={kids()}>
          {(kid, i) => (
            <ExpViewGo
              info={props.info}
              selection={props.selection}
              node={kid}
              is_head={i() === 0}
              inject={props.inject}
              mask={props.mask}
              symbols={props.symbols}
              grab={props.grab}
            />
          )}
        </For>
      </div>
    </Show>
  );
};

export const ExpView: Component<{
  stage: Stage.t;
  inject: Action.Inject;
  mask: Pat.Binding[];
  symbols: Settings.symbols;
  grab?: (id: number, e: PointerEvent) => void;
}> = (props) => (
  <ExpViewGo
    info={props.stage.info}
    selection={props.stage.selection}
    node={props.stage.exp}
    inject={props.inject}
    mask={props.mask}
    is_head={false}
    symbols={props.symbols}
    grab={props.grab}
  />
);

export const ViewOnly: Component<{
  node: Exp;
  symbols: Settings.symbols;
}> = (props) => (
  <ExpViewGo
    info={Statics.mk(props.node, [])}
    selection={"unselected"}
    node={props.node}
    is_head={false}
    inject={(_) => {}}
    mask={[]}
    symbols={props.symbols}
  />
);
