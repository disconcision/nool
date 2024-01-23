import Flipping from "flipping/lib/adapters/web";
import * as Model from "./Model";
import * as Action from "./Action";

const flipping = new Flipping({
  attribute: "data-flip-key",
  duration: 250,
  easing: "cubic-bezier(0.68, -0.6, 0.32, 1.6)",
  //parent: document.getElementById("stage")!,
  //stagger: 1,
  //selector:  (_el:Element) => {return [_el]},
  parent: this,
  //activeSelector: (_el:any) => {return (true)},
});

const flipping_comp = new Flipping({
  attribute: "data-flip-key-comp",
  duration: 250,
  easing: "cubic-bezier(0.68, -0.6, 0.32, 1.6)",
});

const tool_flip = new Flipping({
  attribute: "tool-flip",
  duration: 50,
  easing: "linear",
});

export const read = (model: Model.t, action: Action.t): void => {
  //tool_flip.read();
  if (model.settings.motion != "Off") flipping.read();
  if (model.settings.motion == "On") {
    flipping_comp.read();
  } else if (action.t === "transformNodeAndFlipTransform") {
    console.log("reading comp");
    flipping_comp.read();
  }
};

export const flip = (model: Model.t, action: Action.t): void => {
  if (action.t === "transformNodeAndFlipTransform")
    console.log("shouldanimate: " + action.transform.should_animate);
  if (model.settings.motion == "On") {
    console.log("flipping on");
    flipping_comp.flip();
    flipping.flip();
  } else if (
    action.t === "transformNodeAndFlipTransform" &&
    action.transform.should_animate
  ) {
    console.log("flipping comp");
    flipping_comp.flip();
    /* HACK: for ??? flipping twice is load bearing for this for some reason.
       But we don't want to flip twice in other cases e.g. reprojection,
       or it fucks it up. */
    flipping.flip();
  } else if (action.t === "transformNodeAndFlipTransform") {
    flipping.flip();
  }
  if (model.settings.motion != "Off") flipping.flip();
  //tool_flip.flip();
};
