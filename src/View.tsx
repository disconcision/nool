import { Component } from "solid-js";
import { For, Show, Switch, Match } from "solid-js";
import Rand from "rand-seed";
import toolbarbkg from "./assets/ps-toolbar.png";
import { Exp, Pat, Binding, matches_at_id, TransformResult } from "./Tree";
import { HoverTarget, Model, init_model } from "./Model";
import { Action, Inject } from "./Update";
import {
  Transform,
  rev,
  do_at,
  transforms,
  transforms_directed,
} from "./Transforms";

const get_hover_binding = (model: Model): Binding[] => {
  switch (model.hover.t) {
    case "NoHover":
      return [];
    case "StageNode":
      return [];
    case "TransformSource":
      const res = matches_at_id(
        model.stage,
        model.hover.pat,
        model.selection.id
      );
      return res == "NoMatch" ? [] : res;
    case "TransformResult":
      const res2 = matches_at_id(
        model.stage,
        model.hover.pat,
        model.selection.id
      );
      return res2 == "NoMatch" ? [] : res2;
  }
};

const node_mask_cls = (id: number, mask: Binding[]): string => {
  const binding = mask.find(
    ({ ids: [_, id_stage], t }) => id_stage == id && t == "Val"
  );
  return binding?.t == "Val" ? "mask " + binding?.val[0] : "";
};

const NodeExp: Component<{
  node: Exp;
  model: Model;
  animate: boolean;
  is_head: boolean;
  parent_id: number;
  depth: number;
  inject: Inject;
  mask: Binding[];
}> = (props) => {
  const setSelect = (id: number) => (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    props.inject({ t: "setSelect", id });
  };
  const is_selected = props.node.id == props.model.selection.id;
  const node_mask = node_mask_cls(props.node.id, props.mask);
  //const yolo = new Rand(`${props.node.id}`);
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
              class={`node atom ${is_selected ? "selected" : ""} ${node_mask}`}
              onmousedown={setSelect(props.node.id)}
            >
              {props.node.sym}
              <div class="id-view">{props.node.id}</div>
            </div>
          }
        >
          <div class="head" {...opts}>
            {props.node.sym}
            <div class="id-view">{props.node.id}</div>
          </div>
        </Show>
      );
    case "Comp":
      var opts: any = {};
      console.log("this props.mask:" + props.mask.map((x) => x.ids[1]));
      console.log("this props.node.id:" + props.node.id);
      if (props.animate && props.mask.map((x) => x.ids[1]).find((id) => id == props.node.id) /*(props.node.id == 4 || props.node.id == 14)*/) {
        opts[`data-flip-key-comp`] = `flip-${props.node.id}`;
      }
      return (
        //data-flip-key={`flip-${node.id}`}
        <div
          data-flip-parent={`flip-${props.node.id}`}
          {...opts}
          class={`node comp ${is_selected ? "selected" : ""} ${node_mask}`}
          // for granite style:
          /*style={`background-position: ${Math.floor(
            yolo.next() * 10
          )}0% 77.8%;`}*/
          onmousedown={setSelect(props.node.id)}
        >
          <div class="id-view">{props.node.id}</div>
          <NodeExp
            model={props.model}
            node={props.node.kids[0]}
            animate={props.animate}
            is_head={true}
            parent_id={props.node.id}
            depth={props.depth + 1}
            inject={props.inject}
            mask={props.mask}
          />
          <div
          class="tail"
            style={``}
          >
            <For each={props.node.kids.slice(1)}>
              {(kid) => (
                <NodeExp
                  model={props.model}
                  node={kid}
                  animate={props.animate}
                  is_head={false}
                  parent_id={props.node.id}
                  depth={props.depth + 1}
                  inject={props.inject}
                  mask={props.mask}
                />
              )}
            </For>
          </div>
        </div>
      );
  }
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

const Preview: Component<{
  node: Exp;
  f: Transform;
  indicated: number;
  inject: Inject;
}> = (props) => {
  const transform = (f: (_: Exp) => TransformResult) => (_: Event) =>
    props.inject({ t: "transformNode", f });
  const node = do_at(props.f, props.indicated)(props.node);
  //HACK: init_model
  return (
    <div
      class="node-container"
      style={node == "NoMatch" ? "display: none" : ""}
      onclick={(evt) => {
        console.log("yo");
        transform(do_at(props.f, props.indicated))(evt);
      }}
    >
      {node == "NoMatch" ? (
        <div></div>
      ) : (
        NodeExp({
          model: init_model,
          node,
          animate: false,
          is_head: false,
          parent_id: -1,
          depth: 0,
          inject: (_) => {},
          mask: [],
        })
      )}
    </div>
  );
};

const AdjacentPossible: Component<{ model: Model; inject: Inject }> = (
  props
) => {
  //TODO: BUG: instead of -1, check if selection is actually in tree
  return (
    <div
      class="previews"
      style={
        props.model.selection.id == -1 ? "display: none;" : "display: flex;"
      }
    >
      <For each={transforms_directed}>
        {(transform) =>
          Preview({
            node: props.model.stage,
            f: transform,
            indicated: props.model.selection.id,
            inject: (_) => {},
          })
        }
      </For>
    </div>
  );
};

export const Stage: Component<{ model: Model; inject: (_: Action) => void }> = (
  props
) => {
  console.log("rendering stage. selection.id is", props.model.selection.id);
  return (
    <div id="stage">
      <div id="debug" style="display:none">
        <div>selection.id: {props.model.selection.id}</div>
      </div>
      <div class="node-container">
        {NodeExp({
          model: props.model,
          mask: get_hover_binding(props.model),
          node: props.model.stage,
          animate: true,
          is_head: false,
          parent_id: -1,
          depth: 0,
          inject: props.inject,
        })}
        {AdjacentPossible({ model: props.model, inject: props.inject })}
      </div>
    </div>
  );
};

// arrows: → ⇋ ⥊ ⥋ ⇋ ⇌ ⇆ ⇄ ⇐ ⇒ ⟸ ⟹ ⟺ ⟷ ⬄ ↔ ⬌ ⟵ ⟶ ← → ⬅ ⇦ ⇨ ➥ ➫ ➬
const TransformView: Component<{
  t: Transform;
  model: Model;
  inject: (_: Action) => void;
}> = (props) => {
  //uncommenting this seems to stop node movement animation for some reason??
  /*const source_matches = matches_at_id(props.model.stage, props.t.source, props.model.selection.id);
  const result_matches = matches_at_id(props.model.stage, props.t.result, props.model.selection.id);
  const source_matches_cls = source_matches == 'NoMatch' || props.model.selection.id == -1 ? 'no-match' : 'match';
  const result_matches_cls = result_matches == 'NoMatch' || props.model.selection.id == -1 ? 'no-match' : 'match';*/
  const transformNode = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    props.inject({
      t: "transformNode",
      f: do_at(props.t, props.model.selection.id),
    });
  };
  const transformNodeReverse = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    props.inject({
      t: "transformNode",
      f: do_at(rev(props.t), props.model.selection.id),
    });
  };
  const setHover = (target: HoverTarget) => (_: Event) =>
    props.inject({
      t: "setHover",
      target,
    });
  return (
    <div class="transform-view" onclick={transformNode}>
      <div class="label">{props.t.name}</div>
      <div class="transform">
        <div
          class="source"
          onMouseEnter={setHover({ t: "TransformSource", pat: props.t.source })}
          onMouseLeave={setHover({ t: "NoHover" })}
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
          class="result"
          onMouseEnter={setHover({ t: "TransformResult", pat: props.t.result })}
          onMouseLeave={setHover({ t: "NoHover" })}
          onclick={transformNodeReverse}
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
      <For each={transforms}>
        {(t: Transform) =>
          TransformView({
            t,
            model: props.model,
            inject: props.inject,
          })
        }
      </For>
    </div>
  );
};

export const Toolbar: Component<{ model: Model; inject: Inject }> = (props) => {
  return (
    <div id="toolbar" style={`background-image: url(${toolbarbkg})`}>
      .
    </div>
  );
};

/*
paint plan:

this version only label nodes; does not replace them
we have a map from ids to (user-specified) attributes including paint color
paint colors come from a fixed palette which includes emojicon labels

flavor: Unflavored | {color: string, label: string}
palette: list(flavor)
attributes: {
  flavor,
  show = Overlay | Collapsed // overlay is color if flavored, collapsed is color + label or "..." if unflavored
}

model 1:
  model.paint = map(ids, attributes) 

view 1:
  for now implictly supress child Overlays, though retained Collapsed

actions 1:
  paintNode(id, flavor)
  showNode(id, show)
  unpaintAllOf(flavor)
  unpaintAll()
  
and then after that works, we can add a second painting abstraction, antipainting:
  add new flavor 'EscapePaint' (name needs work)
  this is only meaningful on decendents of a painted node
  and conceptually it creates a delimited multi-holed context
  simple use case: quasi-folding everything above a selected node

*/