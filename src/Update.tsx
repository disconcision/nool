import { TransformResult } from "./syntax/Pat";
import { Transform } from "./Transforms";
import { Path } from "./syntax/Node";
import { Exp } from "./syntax/Exp";
import { Model, Id, HoverTarget } from "./Model";
import { flip_at_index, do_at_path } from "./Transforms";
import Flipping from "flipping/lib/adapters/web";
import * as Sound from "./Sound";
import * as Settings from "./Settings";
import * as Statics from "./Statics";

export type Inject = (_: Action) => void;

export type Action =
  | {
      t: "transformNode";
      idx: number;
      transform: Transform;
      f: (_: Exp) => TransformResult;
    }
  | { t: "setSelect"; path: Path }
  | { t: "setHover"; target: HoverTarget }
  | { t: "flipTransform"; idx: number }
  | { t: "setSetting"; action: Settings.Action }
  | { t: "cycleSelectKids"; direction: "up" | "down" }
  | { t: "selectParent" }
  | { t: "selectFirstChild" }
  | { t: "applyTransform"; idx: number };

export const sound = (model: Model, action: Action): void => {
  switch (action.t) {
    case "transformNode":
      let result = action.f(model.stage);
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
      Sound.select(model.selection.length);
      break;
    case "setHover":
    case "flipTransform":
    case "setSetting":
    case "applyTransform":
      undefined;
  }
};

export const update = (model: Model, action: Action): Model => {
  switch (action.t) {
    case "transformNode":
      let result = action.f(model.stage);
      if (result != "NoMatch") {
        //console.log("info:", Statics.mk(result));
        return { ...model, info: Statics.mk(result), stage: result };
      } else {
        return model;
      }
    case "setSelect":
      return { ...model, selection: action.path };
    case "setHover":
      return { ...model, hover: action.target };
    case "flipTransform":
      return {
        ...model,
        transforms: flip_at_index(model.transforms, action.idx),
      };
    case "setSetting":
      return {
        ...model,
        settings: Settings.update(model.settings, action.action),
      };
    case "cycleSelectKids":
      //TODO: robustify this
      const old_path = [...model.selection].reverse();
      if (old_path.length == 0) return model;
      const [hd, ...tl] = old_path;
      const new_hd = hd == 1 ? 2 : 2 ? 1 : hd;
      const selection3 = [new_hd, ...tl].reverse();
      return { ...model, selection: selection3 };
    case "selectParent":
      const path = model.selection;
      const selection =
        path.length == 0 ? path : path.slice(0, path.length - 1);
      return { ...model, selection };
    case "selectFirstChild":
      //TODO: this goes too far. also not robust
      const path2 = model.selection;
      const selection2 = path2.concat([1]);
      return { ...model, selection: selection2 };
    case "applyTransform":
      if (action.idx < 0 || action.idx >= model.transforms.length) return model;
      let transform =  model.transforms[action.idx];
      let result2 = do_at_path(
       transform,
        model.selection
      )(model.stage);
      if (result2 != "NoMatch") {
        transform.sound();
        return { ...model, info: Statics.mk(result2), stage: result2 };
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

export const go = (model: Model, setModel: any, action: Action): void => {
  if (model.settings.sound) sound(model, action);
  if (model.settings.motion != "Off") flipping.read();
  if (model.settings.motion == "On") flipping_comp.read();
  setModel(update(model, action));
  if (model.settings.motion == "On") flipping_comp.flip();
  if (model.settings.motion != "Off") flipping.flip();
};
