import { Component, createMemo } from "solid-js";
import { For, Switch, Match } from "solid-js";
import toolbarbkg from "../assets/ps-toolbar.png";
import * as Pat from "../syntax/Pat";
import { Model } from "../Model";
import * as Action from "../Action";
import { Transform, flip, at_path } from "../Transform";
import * as ToolBox from "../ToolBox";
import * as Names from "../Names";
import * as Settings from "../Settings";
import { map_ids } from "../syntax/Node";
import * as Util from "../Util";
import * as Stage from "../Stage";

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
  p: Pat.t;
  is_head: boolean;
  symbols: Settings.symbols;
}> = (props) => (
  <Switch>
    <Match when={props.p.t === "Atom"}>
      <div
        id={`pat-${props.p.id}`}
        class={`pat ${props.p.t === "Atom" ? props.p.sym.name : ""} ${
          props.is_head ? "head pat" : "node atom pat"
        }`}
      >
        {Names.get(
          props.symbols,
          props.p.t === "Atom" ? props.p.sym.name : ""
        )}
      </div>
    </Match>
    <Match when={props.p.t === "Comp"}>
      <div id={`pat-${props.p.id}`} class="node comp pat">
        <For each={props.p.t === "Comp" ? props.p.kids : []}>
          {(kid, i) => (
            <PatView p={kid} is_head={i() === 0} symbols={props.symbols} />
          )}
        </For>
      </div>
    </Match>
  </Switch>
);

const matches_at = (stage: Stage.t, pat: Pat.t): Pat.MatchResult =>
  stage.selection == "unselected"
    ? "NoMatch"
    : Pat.matches_at_path(stage.exp, pat, stage.selection);

/* Kept for future use (drag candidate gating): transforms applicable in
 * both directions at the current selection. */
export const filter_transforms = (
  stage: Stage.t,
  ts: Transform[]
): Transform[] =>
  ts.filter(
    (t) =>
      matches_at(stage, t.source) !== "NoMatch" &&
      matches_at(stage, t.result) !== "NoMatch"
  );

const TransformView: Component<{
  idx: number;
  model: Model;
  inject: (_: Action.t) => void;
}> = (props) => {
  /* Memo (reference equality): the transforms array is replaced wholesale
   * on every flip, but untouched rows keep their Transform references —
   * without this every row rebuilds its pat DOM (and re-rasters its shadow
   * stack) on every tool use, which measured ~160ms per press. */
  const t = createMemo((): Transform => props.model.tools.transforms[props.idx]);
  const source_cls = () =>
    matches_at(props.model.stage, t().source) === "NoMatch"
      ? "NoMatch"
      : "match";
  const result_cls = () =>
    matches_at(props.model.stage, t().result) === "NoMatch"
      ? "NoMatch"
      : "match";
  const transformNode = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    if (props.model.stage.selection != "unselected") {
      props.inject({
        t: "transformNodeAndFlipTransform",
        target: "Source",
        idx: props.idx,
        transform: t(),
        f: at_path(t(), props.model.stage.selection),
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
        transform: t(),
        f: at_path(flip(t()), props.model.stage.selection),
      });
    }
  };
  const setHover = (cls: () => string, target: () => Hover_t) => (_e: Event) => {
    if (cls() === "match")
      props.inject({
        t: "setHover",
        target: target(),
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
  const toggleDragTool = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    props.inject({ t: "toggleDragTool", idx: props.idx });
  };
  return (
    <div
      id={`transform-${props.idx}`}
      class={`transform-view`}
      onpointerdown={do_nothing}
    >
      {/* drag-loadout toggle: which rules generate drag candidates
          (visible in drag mode only, via CSS) */}
      <div
        class={`drag-toggle ${
          props.model.tools.dragActive[props.idx] ? "active" : ""
        }`}
        title={`Draggable: ${
          props.model.tools.dragActive[props.idx] ? "on" : "off"
        }`}
        onpointerdown={toggleDragTool}
      />
      {/*<div class="label">{props.t.name}</div>*/}
      <div
        class={`source node-container ${
          props.model.settings.projection
        } ${selected_src(props.model.tools, props.idx)} ${source_cls()}`}
        onmouseenter={setHover(source_cls, () => ({
          t: "TransformSource",
          pat: t().source,
          idx: props.idx,
        }))}
        onpointerleave={setHover(source_cls, () => ({ t: "NoHover" }))}
        onpointerdown={transformNode}
      >
        <PatView
          p={map_ids((id) => id + 100000 + 100 * props.idx, t().source)}
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
        } ${selected_res(props.model.tools, props.idx)} ${result_cls()}`}
        onmouseenter={setHover(result_cls, () => ({
          t: "TransformResult",
          pat: t().result,
          idx: props.idx,
        }))}
        onpointerleave={setHover(result_cls, () => ({ t: "NoHover" }))}
        onpointerdown={transformNodeReverse}
      >
        <PatView
          p={map_ids((id) => id + 200000 + 100 * props.idx, t().result)}
          is_head={false}
          symbols={props.model.settings.symbols}
        />
      </div>
    </div>
  );
};

type Hover_t = import("../Hover").t;

/* Ring-buffer window of transform indices. Rows are keyed by index (a
 * primitive), so scrolling the window only creates/removes edge rows. */
const window_idxs = (tools: ToolBox.t): number[] => {
  const len = tools.transforms.length;
  const offset = Util.mod(tools.offset, len);
  return [...Array(tools.size).keys()].map((i) => (i + offset) % len);
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
        if (Math.abs(e.deltaY) < 1.5) return;
        if (e.shiftKey) {
          throttle(() => {
            const offset = e.deltaY == 0 ? 0 : e.deltaY / Math.abs(e.deltaY);
            props.inject({
              t: "wheelNumTools",
              offset,
            });
          }, 1000)();
        } else {
          throttle(() => {
            const offset = e.deltaY == 0 ? 0 : e.deltaY / Math.abs(e.deltaY);
            props.inject({
              t: "wheelTools",
              offset: offset,
            });
          }, 1000)();
        }
      }}
    >
      <For each={window_idxs(props.model.tools)}>
        {(idx) => (
          <TransformView idx={idx} model={props.model} inject={props.inject} />
        )}
      </For>
    </div>
  );
};
