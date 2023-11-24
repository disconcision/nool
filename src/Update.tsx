import { TransformResult } from "./syntax/Pat";
import { Transform } from "./Transforms";
import { Exp } from "./syntax/Exp";
import { Model, Id, HoverTarget } from "./Model";
import { flip_at_index } from "./Transforms";
import Flipping from "flipping/src/adapters/web";
import * as Sound from "./Sound";
import * as Settings from "./Settings";

export type Inject = (_: Action) => void;

export type Action =
  | {
      t: "transformNode";
      idx: number;
      transform: Transform;
      f: (_: Exp) => TransformResult;
    }
  | { t: "setSelect"; id: Id }
  | { t: "setHover"; target: HoverTarget }
  | { t: "flipTransform"; idx: number }
  | { t: "setSetting"; action: Settings.Action };

export const sound = (model: Model, action: Action): void => {
  switch (action.t) {
    case "transformNode":
      action.transform.sound();
    case "setSelect":
      Sound.select();
    case "setHover":
    case "flipTransform":
    case "setSetting":
      undefined;
  }
};

export const update = (model: Model, action: Action): Model => {
  switch (action.t) {
    case "transformNode":
      let result = action.f(model.stage);
      if (result != "NoMatch") {
        return { ...model, stage: result };
      } else {
        return model;
      }
    case "setSelect":
      return { ...model, selection: { id: action.id } };
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
  }
};

const flipping = new Flipping({
  attribute: "data-flip-key",
  duration: 250,
  easing: "cubic-bezier(0.68, -0.6, 0.32, 1.6)",
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
