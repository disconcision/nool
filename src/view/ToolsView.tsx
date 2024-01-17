import { Component } from "solid-js";
import { For, Index, Switch, Match } from "solid-js";
import toolbarbkg from "../assets/ps-toolbar.png";
import { Pat, matches_at_path } from "../syntax/Pat";
import { Model } from "../Model";
import * as Hover from "../Hover";
import * as Action from "../Action";
import { Transform, rev, at_path } from "../Transform";
import * as Tools from "../Tools";
import * as Names from "../Names";
import * as Settings from "../Settings";

export const Toolbar: Component<{ model: Model; inject: Action.Inject }> = (
  props
) => {
  return (
    <div id="toolbar" style={`background-image: url(${toolbarbkg})`}>
      .
    </div>
  );
};

const PatView: Component<{
  p: Pat;
  is_head: boolean;
  symbols: Settings.symbols;
}> = (props) => {
  switch (props.p.t) {
    case "Atom": {
      const sym = props.p.sym.name;
      const cls = `pat ${sym} ${
        props.is_head ? "head pat" : "node atom pat"
      }`;
      return <div class={cls}>{Names.get(props.symbols, sym)}</div>;
    }
    case "Comp":
      return (
        <div class="node comp pat">
          <Index each={props.p.kids}>
            {(kid, i) =>
              PatView({ p: kid(), is_head: i === 0, symbols: props.symbols })
            }
          </Index>
        </div>
      );
  }
};

const source_matches_cls = (props: { model: Model; t: Transform }) => {
  if (props.model.stage.selection == "unselected") return "no-match";
  //console.log('selection src:', props.model.selection);
  const res = matches_at_path(
    props.model.stage.exp,
    props.t.source,
    props.model.stage.selection
  );
  //console.log('res:', res);
  return res ==
    "NoMatch" /*|| res.length == 0* || props.model.selection.length > 0 */
    ? "no-match"
    : "match";
};

const result_matches_cls = (props: { model: Model; t: Transform }) => {
  if (props.model.stage.selection == "unselected") return "no-match";
  //console.log('selection res:', props.model.selection);
  const res = matches_at_path(
    props.model.stage.exp,
    props.t.result,
    props.model.stage.selection
  );
  //console.log('res:', res);
  return res ==
    "NoMatch" /*|| res.length == 0*|| props.model.selection.length > 0*/
    ? "no-match"
    : "match";
};

/* arrows:
   → ⇋ ⥊ ⥋ ⇋ ⇌ ⇆ ⇄
   ⇐ ⇒ ⟸ ⟹ ⟺ ⟷ ⬄
   ↔ ⬌ ⟵ ⟶ ← → ⬅ ⇦
  ⇨ ➥ ➫ ➬ */
const TransformView: Component<{
  idx: number;
  t: Transform;
  model: Model;
  inject: (_: Action.t) => void;
}> = (props) => {
  const transformNode = (e: Event) => {
    e.preventDefault();
    //e.stopPropagation();
    /* HACK(ish): by not stopping propagation,
       transform also flips the rule, which is
       kind of cool */
    if (props.model.stage.selection != "unselected") {
      props.inject({
        t: "transformNode",
        idx: props.idx,
        transform: props.t,
        f: at_path(props.t, props.model.stage.selection),
      });
    }
  };
  const transformNodeReverse = (e: Event) => {
    e.preventDefault();
    //e.stopPropagation();
    /* HACK(ish): by not stopping propagation,
       transform also flips the rule, which is
       kind of cool */
    if (props.model.stage.selection != "unselected") {
      props.inject({
        t: "transformNode",
        idx: props.idx,
        transform: props.t,
        f: at_path(rev(props.t), props.model.stage.selection),
      });
    }
  };
  const setHover = (target: Hover.t) => (_: Event) =>
    props.inject({
      t: "setHover",
      target,
    });
  const flipTransform = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    props.inject({
      t: "flipTransform",
      idx: props.idx,
    });
  };
  const selected_res = (tools: Tools.t, c: number) =>
    tools.selector[0] === c && tools.selector[1] === 1 ? "selected" : "";
  const selected_src = (tools: Tools.t, c: number) =>
    tools.selector[0] === c && tools.selector[1] === 0 ? "selected" : "";
  return (
    <div class={`transform-view`} onpointerdown={flipTransform}>
      {/*<div class="label">{props.t.name}</div>*/}
      <div
        class={`source node-container ${
          props.model.settings.projection
        } ${selected_src(props.model.tools, props.idx)} ${source_matches_cls(
          props
        )}`}
        onmouseenter={setHover({
          t: "TransformSource",
          pat: props.t.source,
        })}
        onpointerleave={setHover({ t: "NoHover" })}
        onpointerdown={transformNode}
      >
        <PatView
          p={props.t.source}
          is_head={false}
          symbols={props.model.settings.symbols}
        />
      </div>
      <div class="transform-arrow">
        <Switch fallback="⇋">
          <Match when={props.model.hover.t === "TransformSource"}>→</Match>
          <Match when={props.model.hover.t === "TransformResult"}>←</Match>
        </Switch>
      </div>
      <div
        class={`result node-container ${
          props.model.settings.projection
        } ${selected_res(props.model.tools, props.idx)} ${result_matches_cls(
          props
        )}`}
        onmouseenter={setHover({
          t: "TransformResult",
          pat: props.t.result,
        })}
        onpointerleave={setHover({ t: "NoHover" })}
        onpointerdown={transformNodeReverse}
      >
        <PatView
          p={props.t.result}
          is_head={false}
          symbols={props.model.settings.symbols}
        />
      </div>
    </div>
  );
};

export const ToolsView: Component<{
  model: Model;
  inject: (_: Action.t) => void;
}> = (props) => {
  return (
    <div id="noolbox">
      <For each={props.model.tools.transforms}>
        {(t: Transform, idx) =>
          TransformView({
            idx: idx(),
            t,
            model: props.model,
            inject: props.inject,
          })
        }
      </For>
    </div>
  );
};
