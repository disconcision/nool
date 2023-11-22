import { Exp, TransformResult } from "./Tree";
import { Model, Id, HoverTarget } from "./Model";
import { flip_at_index } from "./Transforms";
import Flipping from "flipping/src/adapters/web";

export type Inject = (_: Action) => void;

export type Action =
  | { t: "transformNode"; idx: number; f: (_: Exp) => TransformResult }
  | { t: "setSelect"; id: Id }
  | { t: "setHover"; target: HoverTarget }
  | { t: "flipTransform"; idx: number };

const flipping = new Flipping({
  duration: 250,
  easing: "cubic-bezier(0.68, -0.6, 0.32, 1.6)",
  //stagger: 1,
  //selector:  (_el:Element) => {return [_el]},
  //parent: this,
  attribute: "data-flip-key",
  //activeSelector: (_el:any) => {return (true)},
});

const flipping2 = new Flipping({
  duration: 250,
  easing: "cubic-bezier(0.68, -0.6, 0.32, 1.6)",
  attribute: "data-flip-key-comp",
});

export const update_ = (model: Model, setModel: any, action: Action): Model => {
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
  }
};

export const update = (model: Model, setModel: any, action: Action): void => {
  flipping.read();
  //flipping2.read();
  setModel(update_(model, setModel, action));
  //flipping2.flip();
  flipping.flip();
};
