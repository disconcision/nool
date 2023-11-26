import { Pat } from "./syntax/Pat";
import { Exp, atom, comp } from "./syntax/Exp";
import { Transform, transforms } from "./Transforms";
import * as Settings from "./Settings";
import * as Statics from "./Statics";
import * as Path from "./syntax/Path";

export type Id = number;

export type HoverTarget =
  | { t: "NoHover" }
  | { t: "StageNode"; id: Id }
  | { t: "TransformSource"; pat: Pat }
  | { t: "TransformResult"; pat: Pat };


//TODO:
type Stage = {
  exp: Exp;
  selection: Path.t;
  info: Statics.InfoMap;
  //project: Projectors.Map
};

export type Model = {
  stage: Exp;
  info: Statics.InfoMap;
  selection: Path.t;
  hover: HoverTarget;
  transforms: Transform[];
  settings: Settings.t;
};

// 🦷 🦠 🧩 🌸 ✖️ 🌘 🌕 0️⃣

const stage: Exp = comp([
  atom("➕"),
  comp([
    atom("➕"),
    comp([atom("➕"), atom("☁️"), comp([atom("➖"), atom("🍄")])]),
    atom("🍄"),
  ]),
  comp([
    atom("➕"),
    comp([atom("➕"), atom("🎲"), atom("🦠")]),
    comp([atom("➕"), atom("🧩"), atom("🐝")]),
  ]),
]);

export const init_model: Model = {
  stage: stage,
  info: Statics.mk(stage),
  selection: [],
  hover: { t: "NoHover" },
  transforms: transforms,
  settings: Settings.init,
};

//console.log("info: init:", Statics.mk(stage));
