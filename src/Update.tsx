import { Exp, TransformResult } from "./Tree";
import { Model, Id, HoverTarget } from "./Model";
import Flipping from "flipping/src/adapters/web";

export type Inject = (_: Action) => void;

export type Action =
  | { t: "transformNode"; f: (_: Exp) => TransformResult }
  | { t: "setSelect"; id: Id }
  | { t: "setHover"; target: HoverTarget };

const flipping = new Flipping({
  duration: 175, //175,
  //stagger: 1,
  //selector:  (_el:Element) => {return [_el]},
  //parent: this,
  attribute: "data-flip-key",
  //activeSelector: (_el:any) => {return (true)},
});

const flipping2 = new Flipping({
  duration: 250, //250,
  easing: "cubic-bezier(0.68, -0.6, 0.32, 1.6)",
  //stagger: 10,
  //selector:  (_el:Element) => {return [_el]},
  //parent: this,
  attribute: "data-flip-key-comp",
  //activeSelector: (_el:any) => {return (true)},
});

// generate a list of n flippings, with attributes 'data-flip-key-n'
let make_flippings = (n: number): Flipping[] => {
  let result: Flipping[] = [];
  for (let i = 0; i < n; i++) {
    result.push(
      new Flipping({
        duration: 175,
        attribute: `data-flip-key-${i}`,
      })
    );
  }
  return result;
};

// call flipping.read on a list of flippings
let read_flippings = (flippings: Flipping[]) => {
  for (let i = 0; i < flippings.length; i++) {
    flippings[i].read();
  }
};

// call flipping.flip on a list of flippings
let flip_flippings = (flippings: Flipping[]) => {
  for (let i = 0; i < flippings.length; i++) {
    flippings[i].flip();
  }
};
interface ExDocument extends Document {
  startViewTransition?: any;
}
const doc: ExDocument = document;

interface ExCSSStyleDeclaration extends CSSStyleDeclaration {
  viewTransitionName?: any;
}

//TODO: separate effects from functional update somehow
export const update = (model: Model, setModel: any, action: Action): Model => {
  switch (action.t) {
    case "transformNode":
      let result = action.f(model.stage);
      //flipping.read();
      //flipping2.read();
      if (result != "NoMatch") {
        /*const guy = document.getElementById("3") as HTMLElement;
        if (guy?.style) {
          let style = guy.style as ExCSSStyleDeclaration;
          style.viewTransitionName = "modal"};*/
        const m = { ...model, stage: result };
        doc.startViewTransition((_:any) => {
          /*if (guy?.style) {
            let style = guy.style as ExCSSStyleDeclaration;
            style.viewTransitionName = "";
          };*/
          setModel(m);
          });
        //setModel(m);
        //flipping2.flip();
        //flipping.flip();
        return m;
      } else {
        setModel(model);
        return model;
      }
    case "setSelect":
      const m = { ...model, selection: { id: action.id /*,mask:[]*/ } };
      setModel(m);
      return model;
    case "setHover":
      const m2 = { ...model, hover: action.target };
      setModel(m2);
      console.log("model.hover is now:", action.target);
      return model;
  }
};
