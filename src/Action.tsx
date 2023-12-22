import * as Exp from "./syntax/Exp";
import * as Path from "./syntax/Path";
import * as Hover from "./Hover";
import * as Settings from "./Settings";
import * as Transform from "./Transform";
import { TransformResult } from "./syntax/Pat";

export type Inject = (_: Action) => void;

export type Direction = "up" | "down" | "left" | "right";

export type Action =
  | { t: "restart" }
  | { t: "setSetting"; action: Settings.Action }
  | { t: "setHover"; target: Hover.t }
  | { t: "setSelect"; path: Path.t }
  | { t: "moveStage"; direction: Direction }
  | { t: "moveTool"; direction: Direction }
  | { t: "unsetSelections"}
  | {
      t: "transformNode";
      idx: number;
      transform: Transform.t;
      f: (_: Exp.t) => TransformResult;
    }
  | { t: "applyTransform"; idx: number; direction: "forward" | "reverse" }
  | { t: "applyTransformSelected" }
  | { t: "flipTransform"; idx: number };

export type t = Action;
