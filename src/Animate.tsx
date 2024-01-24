import Flipping from "flipping/lib/adapters/web";
import * as Model from "./Model";
import * as Action from "./Action";

const blah = (s: string) => `
::view-transition-old(${s}),
::view-transition-new(${s}) {
  transition: transform 550ms cubic-bezier(0.68, -0.6, 0.32, 1.6);
}
`;

export const init = (): void => {
  //TODO: unhardcode id max
  var style = document.createElement("style");
  for (let id = 0; id < 100; id++) {
    style.innerHTML += `#node-${id}.animate { view-transition-name: flip-node-${id}; }\n`;
    //style.innerHTML += `#pat-${id} { view-transition-name: flip-pat-${id}; }`;
    //style.innerHTML += blah(`flip-node-${id}`);
    //style.innerHTML += blah(`flip-pat-${id}`);
  }
  document.getElementsByTagName("head")[0].appendChild(style);
};

const flipping = new Flipping({
  attribute: "data-flip-key",
  duration: 250,
  easing: "cubic-bezier(0.68, -0.6, 0.32, 1.6)",
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
  flipping.read();
  if (action.t === "transformNodeAndFlipTransform") {
    console.log("reading comp");
    flipping_comp.read();
  }
};

export const flip = (model: Model.t, action: Action.t): void => {
  if (action.t === "transformNodeAndFlipTransform")
    console.log("shouldanimate: " + action.transform.should_animate);
  if (
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
  flipping.flip();
  //tool_flip.flip();
};
