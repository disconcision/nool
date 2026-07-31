import * as Settings from "./Settings";
import * as Stage from "./Stage";
import * as Hover from "./Hover";
import * as ToolBox from "./ToolBox";
import { Exp } from "./syntax/Exp";

/* Undo/redo over WORLD states (stage exps): every successful rewrite —
 * button, drag, or restart — pushes the pre-state; undo/redo walk it. */
export type History = { past: Exp[]; future: Exp[] };

export type Model = {
  stage: Stage.t;
  tools: ToolBox.t;
  settings: Settings.t;
  hover: Hover.t;
  history: History;
};

export type t = Model;

export const init: Model = {
  stage: Stage.init,
  tools: ToolBox.init,
  settings: Settings.init,
  hover: Hover.init,
  history: { past: [], future: [] },
};
