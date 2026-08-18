import { Component, createMemo } from "solid-js";
import { Model } from "../Model";
import * as Action from "../Action";
import { ExpView } from "./ExpView";
import * as Hover from "../Hover";
import * as Drag from "../drag/Drag";
import { depth } from "../syntax/Node";

const stage_scale = (d: number) => (d == 0 ? 1 : 4 / (d + 1));

export const StageView: Component<{
  model: Model;
  inject: (_: Action.t) => void;
}> = (props) => {
  const mask = createMemo(() => Hover.get_binding(props.model));
  return (
    <div
      id="stage"
      style={`font-size: ${stage_scale(depth(props.model.stage.exp))}em`}
    >
      <div id="debug" style="display:none">
        <div>selection.path: {props.model.stage.selection}</div>
      </div>
      <div class={`node-container ${props.model.settings.projection}`}>
        <ExpView
          stage={props.model.stage}
          inject={props.inject}
          mask={mask()}
          symbols={props.model.settings.symbols}
          grab={
            props.model.settings.dragging
              ? (id, e) => Drag.grab(props.model, props.inject, id, e)
              : undefined
          }
          grabHeads={
            props.model.settings.dragging && props.model.settings.projectionDrag
          }
        />
      </div>
    </div>
  );
};
