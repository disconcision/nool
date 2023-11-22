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

export const update_ = (model: Model, action: Action): Model => {
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

export const update = (model: Model, setModel: any, action: Action): void => {
  flipping.read();
  //flipping_comp.read();
  setModel(update_(model, action));
  //flipping_comp.flip();
  flipping.flip();
};
