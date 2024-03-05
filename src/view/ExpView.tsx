import { Component, Switch, Match } from "solid-js";
import { For, Show, Index } from "solid-js";
//import Rand from "rand-seed";
import * as Pat from "../syntax/Pat";
import * as Exp from "../syntax/Exp";
import * as Action from "../Action";
import * as Path from "../syntax/Path";
import * as Statics from "../Statics";
import * as Stage from "../Stage";
import * as Names from "../Names";
import * as Settings from "../Settings";
import * as Projector from "../Projector";

type expviewprops = {
  node: Exp.t;
  info: Statics.InfoMap;
  selection: Stage.selection;
  animate: boolean;
  is_head: boolean;
  inject: Action.Inject;
  mask: Pat.Binding[];
  symbols: Settings.symbols;
  projectors: Projector.PMap;
};

const setSelect = (props: expviewprops) => (e: MouseEvent) => {
  e.preventDefault();
  //above modulates whether shake occurs for some reason?
  e.stopPropagation();
  props.inject({
    t: "setSelect",
    path: Statics.get(props.info, props.node.id).path,
  });
};

const eff = (props: expviewprops): boolean => {
  /* search mask for a binding whose first id is this node's id.
  then check if it's a val binding. if so return true. else false. */
  const binding = props.mask.find(
    ({ ids: [_, id_stage], t }) => id_stage == props.node.id && t == "Val"
  );
  // if binding is undefind rerturn false. else return true.
  return binding?.t == "Val" ? false : true;
};

const enfold = (props: expviewprops) => (e: MouseEvent) => {
  if (e.shiftKey) {
    return;
  } else {
    e.preventDefault();
    e.stopPropagation();
    props.inject({
      t: "Project",
      id: props.node.id,
      action: "toggleEnfoldCurrent",
    });
  }
};

const enfoldAction = (props: expviewprops) => (e: MouseEvent) => {
  const p = Projector.get(props.projectors, props.node.id);
  if (e.shiftKey) {
    return;
  } else if (p.folded == "Folded") {
    props.inject({
      t: "Project",
      id: props.node.id,
      action: "toggleFoldCurrent",
    });
  } else if (
    Projector.has_enfolded(props.projectors, props.node) &&
    p.folded != "Enfolded"
  )
    props.inject({
      t: "Project",
      id: props.node.id,
      action: "toggleFoldCurrent",
    });
  else {
    switch (p.folded) {
      case "Enfolded":
        props.inject({
          t: "Project",
          id: props.node.id,
          action: "toggleEnfoldCurrent",
        });
        break;
      // case "Folded":
      //   props.inject({
      //     t: "Project",
      //     id: props.node.id,
      //     action: "toggleFoldCurrent",
      //   });
      //   break;
      default:
        props.inject({
          t: "Project",
          id: props.node.id,
          action: "toggleEnfoldCurrent",
        });
        break;
    }
  }
  e.preventDefault();
  e.stopPropagation();
};

const selectOrFold = (props: expviewprops) => (e: MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  console.log("clicks: " + e.detail);
  switch (e.detail) {
    case 1:
      setSelect(props)(e);
      break;
    case 2:
    case 3:
      props.inject({
        t: "Project",
        id: props.node.id,
        action: "toggleFoldCurrent",
      });
      break;
  }
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

const is_code = (info: Statics.InfoMap, node: Exp.t): boolean =>
  Statics.get(info, node.id).cls.t == "Code";

  const is_file = (info: Statics.InfoMap, node: Exp.t): boolean =>
  Statics.get(info, node.id).cls.t == "File";

  const is_room = (info: Statics.InfoMap, node: Exp.t): boolean =>
  Statics.get(info, node.id).cls.t == "Room";

const is_head =
  (info: Statics.InfoMap, node: Exp.t) =>
  (i: number): boolean => {
    const cls = Statics.get(info, node.id).cls;
    if (cls.t == "Code") {
      return Statics.is_delim(cls.form, i);
    } else {
      return i === 0;
    }
  };

const ExpViewGo: Component<expviewprops> = (props) => {
  switch (props.node.t) {
    case "Atom":
      return (
        <Switch
          fallback={
            <div
              id={`node-${props.node.id}`}
              class={`atom ${props.node.sym} ` + common_clss(props)}
              classList={{
                animate: props.animate,
                enfolded: Projector.is_enfolded(
                  props.node.id,
                  props.projectors
                ),
              }}
              onclick={selectOrFold(props)}
              //onpointerdown={setSelect(props)}
              oncontextmenu={enfoldAction(props)}
            >
              <div id={`sym-${props.node.id}`}>
                {Names.get(props.symbols, props.node.sym)}
              </div>
            </div>
          }
        >
          <Match when={props.is_head}>
            <div
              id={`node-${props.node.id}`}
              class="head"
              classList={{ animate: props.animate }}
            >
              {Names.get(props.symbols, props.node.sym)}
            </div>
          </Match>
        </Switch>
      );
    case "Comp":
      return (
        <Switch fallback={<div>error</div>}>
          <Match when={true}>
            <div
              id={`node-${props.node.id}`}
              class={`comp ${Exp.head(props.node)} ${common_clss(props)}`}
              classList={{
                animate: props.animate,
                digits: Exp.is_digits(props.node),
                code: is_code(props.info, props.node),
                room: is_room(props.info, props.node),
                file: is_file(props.info, props.node),
                folded: Projector.is_folded(props.node.id, props.projectors),
                enfolded: Projector.is_enfolded(
                  props.node.id,
                  props.projectors
                ),
              }}
              oncontextmenu={enfoldAction(props)}
              onclick={selectOrFold(props)}
            >
              {
                <Index
                  each={
                    /*Projector.is_folded(props.node.id, props.projectors)
                      ? props.node.kids.slice(0, 1)
                      :*/ Exp.is_digits(props.node)
                      ? props.node.kids.slice(1)
                      : props.node.kids
                  }
                >
                  {(kid, i) => (
                    <ExpViewGo
                      info={props.info}
                      selection={props.selection}
                      node={kid()}
                      animate={props.animate /*&& eff(props)*/}
                      is_head={is_head(props.info, props.node)(i)} // TODO: more complex is_head for code forms
                      inject={props.inject}
                      mask={props.mask}
                      symbols={props.symbols}
                      projectors={props.projectors}
                    />
                  )}
                </Index>
              }
            </div>
          </Match>
        </Switch>
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
    node: Projector.project_folds(props.stage.projectors, props.stage.exp),
    inject: props.inject,
    mask: props.mask,
    is_head: false,
    animate: true,
    symbols: props.symbols,
    projectors: props.stage.projectors,
  });

export const ViewOnly: Component<{
  node: Exp.t;
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
    projectors: Projector.init,
  });
