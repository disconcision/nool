import { Component } from "solid-js";
import { For, Show, Switch, Match } from "solid-js";
import toolbarbkg from "../assets/ps-toolbar.png";
import { Pat, matches_at_id } from "../syntax/Pat";
import { HoverTarget, Model } from "../Model";
import { Action, Inject } from "../Update";
import { Transform, rev, do_at } from "../Transforms";
 
export const Toolbar: Component<{ model: Model; inject: Inject }> = (props) => {
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
  inject: (_: Action) => void;
}> = (props) => {

  const source_matches_cls = (props:any) => {
    console.log('selection id src:', props.model.selection.id);
    const res = matches_at_id(props.model.stage, props.t.source, props.model.selection.id);
    console.log('res:', res);
    return res == 'NoMatch' /*|| res.length == 0*/ || props.model.selection.id < 0 ? 'no-match' : 'match';
  };

  const result_matches_cls = (props:any) => {
    console.log('selection id res:', props.model.selection.id);
    const res = matches_at_id(props.model.stage, props.t.result, props.model.selection.id);
    console.log('res:', res);
    return res == 'NoMatch' /*|| res.length == 0*/ || props.model.selection.id < 0 ? 'no-match' : 'match';
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
      f: do_at(props.t, props.model.selection.id),
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
      f: do_at(rev(props.t), props.model.selection.id),
    });
  };
  const setHover = (target: HoverTarget) => (_: Event) =>
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

export const TransformsBox: Component<{
  model: Model;
  inject: (_: Action) => void;
}> = (props) => {
  return (
    <div class="transforms-box">
      <For each={props.model.transforms}>
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
