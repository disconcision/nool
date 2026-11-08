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
    /* drag mode: let the press bubble to the row (loadout toggle) */
    if (props.model.settings.dragging) return;
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
    /* drag mode: let the press bubble to the row (loadout toggle) */
    if (props.model.settings.dragging) return;
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
  const row_pointerdown = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    /* drag mode: the whole row is the loadout toggle */
    if (props.model.settings.dragging)
      props.inject({ t: "toggleDragTool", idx: props.idx });
    else props.inject({ t: "Noop" });
  };
  const dir = () => props.model.tools.dragActive[props.idx];
  const drag_glyph = (): string | null => {
    if (!props.model.settings.dragging) return null;
    const d = dir();
    if (d !== "fwd" && d !== "rev") return null;
    /* canonical fwd reads left→right unless the row is displayed flipped */
    return (d === "fwd") !== t().reversed ? "→" : "←";
  };
  const selected_res = (tools: ToolBox.t, c: number) =>
    tools.selector[0] === c && tools.selector[1] === 1 ? "selected" : "";
  const selected_src = (tools: ToolBox.t, c: number) =>
    tools.selector[0] === c && tools.selector[1] === 0 ? "selected" : "";
  return (
    <div
      id={`transform-${props.idx}`}
      class={`transform-view`}
      title={
        props.model.settings.dragging
          ? `Draggable: ${
              {
                off: "off",
                both: "both ways",
                fwd: "one way",
                rev: "one way",
              }[dir()]
            } (click to cycle: off → both ways → → → ←)`
          : undefined
      }
      onpointerdown={row_pointerdown}
    >
      {/*<div class="label">{props.t.name}</div>*/}
      <div
        class={`source node-container ${
          /* docked noolbox stays projection-invariant: pats keep the
           * default rendering regardless of the stage's projection */
          props.model.settings.dockNoolbox
            ? "TreeLeft"
            : props.model.settings.projection
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
      <div
        class={`transform-arrow ${dir() !== "off" ? "drag-on" : ""} ${
          drag_glyph() ? "drag-oneway" : ""
        }`}
      >
        <Switch fallback="🟰">
          {/* drag mode: a one-way loadout reads as its arrow, drawn in
              the row's DISPLAYED orientation */}
          <Match when={drag_glyph()}>{drag_glyph()}</Match>
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
          props.model.settings.dockNoolbox
            ? "TreeLeft"
            : props.model.settings.projection
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

export const ToolsView: Component<{
  model: Model;
  inject: (_: Action.t) => void;
}> = (props) => {
  /* All rules render; plain wheel scrolls NATIVELY (CSS scroll-snap
   * gives continuous scroll that settles on a rule when the gesture
   * ends — the old ring-buffer window stepped whole rules per event).
   * Shift+wheel resizes the box CONTINUOUSLY (size is fractional; the
   * max-height tracks it smoothly); on macOS shift turns trackpad
   * deltas horizontal, hence deltaX. */
  /* Folded noolbox (compact layouts, index.css): its spine — one mark per
   * rule in the rule's loadout state (dim equals = off, lit equals = both
   * ways, lit arrow = one way) — a summary and the unfold handle. */
  const spine_glyph = (idx: number): string => {
    const d = props.model.tools.dragActive[idx];
    if (!props.model.settings.dragging || d === "off" || d === "both")
      return "🟰";
    return (d === "fwd") !== props.model.tools.transforms[idx].reversed
      ? "→"
      : "←";
  };
  return (
    <>
    <div
      id="noolbox-spine"
      title="Unfold the noolbox"
      onpointerdown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        props.inject({ t: "setSetting", action: "ToggleFold" });
      }}
    >
      <For each={[...Array(props.model.tools.transforms.length).keys()]}>
        {(idx) => (
          <span
            class={`spine-mark transform-arrow ${
              props.model.settings.dragging &&
              props.model.tools.dragActive[idx] !== "off"
                ? "drag-on"
                : ""
            }`}
          >
            {spine_glyph(idx)}
          </span>
        )}
      </For>
    </div>
    <div
      id="noolbox"
      style={{ "max-height": `${props.model.tools.size * 2.4}em` }}
      onWheel={(e) => {
        if (!e.shiftKey) return; // native scroll + snap
        e.preventDefault();
        const d = e.deltaY || e.deltaX;
        if (d === 0) return;
        props.inject({ t: "wheelNumTools", offset: d / 90 });
      }}
    >
      <For each={[...Array(props.model.tools.transforms.length).keys()]}>
        {(idx) => (
          <TransformView idx={idx} model={props.model} inject={props.inject} />
        )}
      </For>
    </div>
    </>
  );
};
