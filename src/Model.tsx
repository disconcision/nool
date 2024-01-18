import * as Settings from "./Settings";
import * as Stage from "./Stage";
import * as Hover from "./Hover";
import * as ToolBox from "./ToolBox";

export type Model = {
  stage: Stage.t;
  tools: ToolBox.t;
  settings: Settings.t;
  hover: Hover.t;
};

export type t = Model;

export const init: Model = {
  stage: Stage.init,
  tools: ToolBox.init,
  settings: Settings.init,
  hover: Hover.init,
};
