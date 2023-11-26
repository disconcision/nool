import { Component } from "solid-js";
import { For, Show, Switch, Match } from "solid-js";
import toolbarbkg from "../assets/ps-toolbar.png";
import { Pat, matches_at_path } from "../syntax/Pat";
import { Model } from "../Model";
import * as Hover from "../Hover";
import * as Action from "../Action";
import { Transform, rev, at_path } from "../Transform";

export const Toolbar: Component<{ model: Model; inject: Action.Inject }> = (
  props
) => {
  return (
    <div id="toolbar" style={`background-image: url(${toolbarbkg})`}>
      .
    </div>
  );
};

const PatView: Component<{ p: Pat; is_head: boolean }> = (props) => {
  switch (props.p.t) {
    case "Atom": {
      const sym = props.p.sym.name;
      switch (props.p.sym.t) {
        case "Var":
        case "Const":
          const cls = `pat ${sym} ${
            props.is_head ? "head pat" : "node atom pat"
          }`;
          return <div class={cls}>{sym}</div>;
      }
    }
    case "Comp":
      return (
        <div class="node comp pat">
          {PatView({ p: props.p.kids[0], is_head: true })}
          <div>
            <For each={props.p.kids.slice(1)}>
              {(kid) => PatView({ p: kid, is_head: false })}
            </For>
          </div>
        </div>
      );
  }
};

/* arrows:
   → ⇋ ⥊ ⥋ ⇋ ⇌ ⇆ ⇄
   ⇐ ⇒ ⟸ ⟹ ⟺ ⟷ ⬄
   ↔ ⬌ ⟵ ⟶ ← → ⬅ ⇦
  ⇨ ➥ ➫ ➬ */
const TransformView: Component<{
  idx: any;
  t: Transform;
  model: Model;
  inject: (_: Action.t) => void;
}> = (props) => {
  const source_matches_cls = (props: { model: Model; t: Transform }) => {
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

  const transformNode = (e: Event) => {
    e.preventDefault();
    //e.stopPropagation();
    /* HACK(ish): by not stopping propagation,
       transform also flips the rule, which is
       kind of cool */
    props.inject({
      t: "transformNode",
      idx: props.idx,
      transform: props.t,
      f: at_path(props.t, props.model.stage.selection),
    });
  };
  const transformNodeReverse = (e: Event) => {
    e.preventDefault();
    //e.stopPropagation();
    /* HACK(ish): by not stopping propagation,
       transform also flips the rule, which is
       kind of cool */
    props.inject({
      t: "transformNode",
      idx: props.idx,
      transform: props.t,
      f: at_path(rev(props.t), props.model.stage.selection),
    });
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
  return (
    <div class="transform-view" onpointerdown={flipTransform}>
      <div class="label">{props.t.name}</div>
      <div class="transform">
        <div
          class={"source " + source_matches_cls(props)}
          onmouseenter={setHover({
            t: "TransformSource",
            pat: props.t.source,
          })}
          onpointerleave={setHover({ t: "NoHover" })}
          onpointerdown={transformNode}
        >
          <PatView p={props.t.source} is_head={false} />
        </div>
        <div class="transform-arrow">
          <Switch fallback="⇋">
            <Match when={props.model.hover.t === "TransformSource"}>→</Match>
            <Match when={props.model.hover.t === "TransformResult"}>←</Match>
          </Switch>
        </div>
        <div
          class={"result " + result_matches_cls(props)}
          onmouseenter={setHover({
            t: "TransformResult",
            pat: props.t.result,
          })}
          onpointerleave={setHover({ t: "NoHover" })}
          onpointerdown={transformNodeReverse}
        >
          <PatView p={props.t.result} is_head={false} />
        </div>
      </div>
    </div>
  );
};

export const ToolsView: Component<{
  model: Model;
  inject: (_: Action.t) => void;
}> = (props) => {
  return (
    <div class="transforms-box">
      <For each={props.model.tools}>
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
