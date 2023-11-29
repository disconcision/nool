import * as Transforms from "./Transform";
import * as Settings from "./Settings";
import * as Stage from "./Stage";
import * as Hover from "./Hover";
import * as Tools from "./Tools";

export type Model = {
  stage: Stage.t;
  tools: Tools.t;
  settings: Settings.t;
  hover: Hover.t;
};

export type t = Model;

export const init: Model = {
  stage: Stage.init,
  tools: Tools.init,
  settings: Settings.init,
  hover: Hover.init,
};
