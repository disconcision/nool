import { Transform, rev } from "./Transform";
import { Model } from "./Model";
import { at_path } from "./Transform";
import Flipping from "flipping/lib/adapters/web";
import * as Sound from "./Sound";
import * as Settings from "./Settings";
import * as Stage from "./Stage";
import * as Action from "./Action";
import * as Path from "./syntax/Path";

export const sound = (model: Model, action: Action.t): void => {
  switch (action.t) {
    case "transformNode":
      let result = action.f(model.stage.exp);
      if (result != "NoMatch") {
        return action.transform.reversed
          ? action.transform.sound_rev()
          : action.transform.sound();
      } else {
        Sound.noop();
      }
      break;
    case "setSelect":
      Sound.select(action.path.length);
      break;
    case "cycleSelectKids":
    case "selectParent":
    case "selectFirstChild":
      Sound.select(model.stage.selection.length);
      break;
    case "setHover":
    case "flipTransform":
    case "setSetting":
    case "applyTransform":
      undefined;
  }
};

const flip_at_index = (ts: Transform[], index: number): Transform[] =>
  ts.map((t, i) => (i === index ? rev(t) : t));

export const update = (model: Model, action: Action.t): Model => {
  switch (action.t) {
    case "transformNode":
      let result = action.f(model.stage.exp);
      if (result != "NoMatch") {
        const new_stage = Stage.put_exp(model.stage, result);
        return { ...model, stage: new_stage };
      } else {
        return model;
      }
    case "setSelect":
      return { ...model, stage: Stage.put_selection(model.stage, action.path) };
    case "setHover":
      return { ...model, hover: action.target };
    case "flipTransform":
      return {
        ...model,
        tools: flip_at_index(model.tools, action.idx),
      };
    case "setSetting":
      return {
        ...model,
        settings: Settings.update(model.settings, action.action),
      };
    case "cycleSelectKids":
      //TODO: robustify this
      const old_path = [...model.stage.selection].reverse();
      if (old_path.length == 0) return model;
      const [hd, ...tl] = old_path;
      const new_hd = hd == 1 ? 2 : 2 ? 1 : hd;
      const selection3 = [new_hd, ...tl].reverse();
      return { ...model, stage: Stage.put_selection(model.stage, selection3) };
    case "selectParent":
      const path = model.stage.selection;
      const selection =
        path.length == 0 ? path : path.slice(0, path.length - 1);
      return { ...model, stage: Stage.put_selection(model.stage, selection) };
    case "selectFirstChild":
      //TODO: this goes too far. also not robust
      const path2 = model.stage.selection;
      const selection2 = path2.concat([1]);
      return { ...model, stage: Stage.put_selection(model.stage, selection2) };
    case "applyTransform":
      if (action.idx < 0 || action.idx >= model.tools.length) return model;
      let transform = model.tools[action.idx];
      let result2 = at_path(transform, model.stage.selection)(model.stage.exp);
      if (result2 != "NoMatch") {
        transform.sound(); //TODO
        return { ...model, stage: Stage.put_exp(model.stage, result2) };
      } else {
        return model;
      }
  }
};

const flipping = new Flipping({
  attribute: "data-flip-key",
  duration: 250,
  easing: "cubic-bezier(0.68, -0.6, 0.32, 1.6)",
  //parent: document.getElementById("stage")!,
  //stagger: 1,
  //selector:  (_el:Element) => {return [_el]},
  //parent: this,
  //activeSelector: (_el:any) => {return (true)},
});

const flipping_comp = new Flipping({
  attribute: "data-flip-key-comp",
  duration: 250,
  easing: "cubic-bezier(0.68, -0.6, 0.32, 1.6)",
});

export const go = (model: Model, setModel: any, action: Action.t): void => {
  if (model.settings.sound) sound(model, action);
  if (model.settings.motion != "Off") flipping.read();
  if (model.settings.motion == "On") flipping_comp.read();
  setModel(update(model, action));
  const new_model = update(model, action);
  if (model.settings.motion == "On") flipping_comp.flip();
  if (model.settings.motion != "Off") flipping.flip();
};
