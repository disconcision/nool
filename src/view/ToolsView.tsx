import { Component } from "solid-js";
import { For, Index, Switch, Match } from "solid-js";
import toolbarbkg from "../assets/ps-toolbar.png";
import * as Pat from "../syntax/Pat";
import { Model } from "../Model";
import * as Hover from "../Hover";
import * as Action from "../Action";
import { Transform, flip, at_path } from "../Transform";
import * as ToolBox from "../ToolBox";
import * as Names from "../Names";
import * as Settings from "../Settings";
import { map_ids } from "../syntax/Node";
import * as Util from "../Util";
import * as Stage from "../Stage";
import * as Symbols from "../data/Symbols";

export const Toolbar: Component<{ model: Model; inject: Action.Inject }> = (
  props
) => {
  return (
    <div id="toolbar" style={`background-image: url(${toolbarbkg})`}>
      .
    </div>
  );
};

const is_digits = Pat.is_digits;

const PatView: Component<{
  p: Pat.t;
  is_head: boolean;
  symbols: Settings.symbols;
}> = (props) => {
  switch (props.p.t) {
    case "Atom": {
      return (
        <div
          id={`pat-${props.p.id}`}
          classList={{
            digits: is_digits(props.p),
          }}
          class={`pat ${props.p.sym.name} ${
            props.is_head ? "head pat" : "node atom pat"
          }`}
        >
          {Names.get(props.symbols, props.p.sym.name)}
        </div>
      );
    }
    case "Comp":
      return (
        <div
          id={`pat-${props.p.id}`}
          classList={{
            digits: is_digits(props.p),
          }}
          class="node comp pat"
        >
          <For each={is_digits(props.p) ? props.p.kids.slice(1) : props.p.kids}>
            {(kid, i) =>
              PatView({
                p: kid,
                is_head: i() === 0 && !is_digits(props.p),
                symbols: props.symbols,
              })
            }
          </For>
        </div>
      );
  }
};

const matches_at = (stage: Stage.t, pat: Pat.t): Pat.MatchResult =>
  stage.selection == "unselected"
    ? "NoMatch"
    : Pat.matches_at_path(stage.exp, pat, stage.selection);

const filter_transforms = (stage: Stage.t, ts: Transform[]): Transform[] =>
  ts.filter(
    (t) =>
      matches_at(stage, t.source) !== "NoMatch" &&
      matches_at(stage, t.result) !== "NoMatch"
  );

const source_matches_cls = (props: { model: Model; t: Transform }) =>
  matches_at(props.model.stage, props.t.source) === "NoMatch"
    ? "NoMatch"
    : "match";

const result_matches_cls = (props: { model: Model; t: Transform }) =>
  matches_at(props.model.stage, props.t.result) === "NoMatch"
    ? "NoMatch"
    : "match";

const TransformView: Component<{
  idx: number;
  t: Transform;
  model: Model;
  inject: (_: Action.t) => void;
}> = (props) => {
  const transformNode = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    if (props.model.stage.selection != "unselected") {
      props.inject({
        t: "transformNodeAndFlipTransform",
        target: "Source",
        idx: props.idx,
        transform: props.t,
        f: at_path(props.t, props.model.stage.selection),
      });
    }
  };
  const transformNodeReverse = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    if (props.model.stage.selection != "unselected") {
      props.inject({
        t: "transformNodeAndFlipTransform",
        target: "Result",
        idx: props.idx,
        transform: props.t,
        f: at_path(flip(props.t), props.model.stage.selection),
      });
    }
  };
  const setHover = (fn: any, target: Hover.t) => (e: Event) => {
    if (fn(props) === "match")
      props.inject({
        t: "setHover",
        target,
      });
  };
  const flipTransform = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    props.inject({
      t: "flipTransform",
      idx: props.idx,
    });
  };
  const do_nothing = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    props.inject({ t: "Noop" });
  };
  const selected_res = (tools: ToolBox.t, c: number) =>
    tools.selector[0] === c && tools.selector[1] === 1 ? "selected" : "";
  const selected_src = (tools: ToolBox.t, c: number) =>
    tools.selector[0] === c && tools.selector[1] === 0 ? "selected" : "";
  return (
    <div
      id={`transform-${props.idx}`}
      class={`transform-view`}
      onpointerdown={do_nothing}
    >
      {/*<div class="label">{props.t.name}</div>*/}
      <div
        class={`source node-container ${
          props.model.settings.projection
        } ${selected_src(props.model.tools, props.idx)} ${source_matches_cls(
          props
        )}`}
        onmouseenter={setHover(source_matches_cls, {
          t: "TransformSource",
          pat: props.t.source,
          idx: props.idx,
        })}
        onpointerleave={setHover(source_matches_cls, { t: "NoHover" })}
        onpointerdown={transformNode}
      >
        <PatView
          p={map_ids((id) => id + 100000 + 100 * props.idx, props.t.source)}
          is_head={false}
          symbols={props.model.settings.symbols}
        />
      </div>
      <div class="transform-arrow">
        <Switch fallback="🟰">
          {/*  arrows:
                ⇋ ⇌ ⇆ ⇄  ⇨ ➥ ➫ ➬ 
                → ⇋ ⥊ ⥋ ⇋ ⇌ ⇆ ⇄
                ⇐ ⇒ ⟸ ⟹ ⟺ ⟷ ⬄
                ↔ ⬌ ⟵ ⟶ ← → ⬅ ⇦
                */}
          <Match
            when={
              props.model.hover.t === "TransformSource" &&
              props.model.hover.idx === props.idx
            }
          >
            →
          </Match>
          <Match
            when={
              props.model.hover.t === "TransformResult" &&
              props.model.hover.idx === props.idx
            }
          >
            ←
          </Match>
        </Switch>
      </div>
      <div
        class={`result node-container ${
          props.model.settings.projection
        } ${selected_res(props.model.tools, props.idx)} ${result_matches_cls(
          props
        )}`}
        onmouseenter={setHover(result_matches_cls, {
          t: "TransformResult",
          pat: props.t.result,
          idx: props.idx,
        })}
        onpointerleave={setHover(result_matches_cls, { t: "NoHover" })}
        onpointerdown={transformNodeReverse}
      >
        <PatView
          p={map_ids((id) => id + 200000 + 100 * props.idx, props.t.result)}
          is_head={false}
          symbols={props.model.settings.symbols}
        />
      </div>
    </div>
  );
};

const select_transforms = (
  stage: Stage.t,
  tools: ToolBox.t
): [number, Transform][] => {
  //const filtered_transforms = filter_transforms(stage, tools.transforms);
  const filtered_transforms = tools.transforms;
  /* want to take tools.size tools starting at tools.offset (index into tools)
    and treat the list as a ring buffer */

  const len = filtered_transforms.length;
  const offset = tools.offset % len;
  const size = tools.size;
  const idxs = [...Array(size).keys()].map((i) => (i + offset) % len);
  return idxs.map((i) => [i, filtered_transforms[i]]);
};

function throttle(
  func: (...args: any[]) => void,
  limit: number
): (...args: any[]) => void {
  let inThrottle: boolean;
  return function (this: any, ...args: any[]) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export const ToolsView: Component<{
  model: Model;
  inject: (_: Action.t) => void;
}> = (props) => {
  return (
    <div
      id="noolbox"
      onWheel={(e) => {
        //console.log("wheel deltay:", e.deltaY);
        if (Math.abs(e.deltaY) < 1.5) return;
        if (e.shiftKey) {
          throttle(() => {
            const offset = e.deltaY == 0 ? 0 : e.deltaY / Math.abs(e.deltaY);
            //console.log("SHIFT GYOOOO", offset);
            props.inject({
              t: "wheelNumTools",
              offset,
            });
          }, 250)();
        } else {
          throttle(() => {
            const offset = e.deltaY == 0 ? 0 : e.deltaY / Math.abs(e.deltaY);
            //console.log("GYOOOO", offset);
            props.inject({
              t: "wheelTools",
              offset: offset,
            });
          }, 250)();
        }
      }}
    >
      <For each={select_transforms(props.model.stage, props.model.tools)}>
        {([idx, t]) =>
          TransformView({
            idx,
            t,
            model: props.model,
            inject: props.inject,
          })
        }
      </For>
    </div>
  );
};
