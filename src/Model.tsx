import { Pat } from "./syntax/Pat";
import { Exp, atom, comp } from "./syntax/Exp";
import { Transform, transforms, transforms_directed } from "./Transforms";
import * as Settings from "./Settings";
import * as Statics from "./Statics";
import * as Node from "./syntax/Node";

export type Id = number;

export type HoverTarget =
  | { t: "NoHover" }
  | { t: "StageNode"; id: Id }
  | { t: "TransformSource"; pat: Pat }
  | { t: "TransformResult"; pat: Pat };

export type Model = {
  stage: Exp;
  info: Statics.InfoMap;
  selection: Node.Path;
  hover: HoverTarget;
  transforms: Transform[];
  transforms_directed: Transform[];
  settings: Settings.t;
};

// 🦷 🦠 🧩 🌸 ✖️ 🌘 🌕

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

const _stage1: Exp = comp([
  atom("➕"),
  atom("🌕"),
  comp([atom("➕"), comp([atom("✖️"), atom("🌘"), atom("🌕")]), atom("🌘")]),
]);

const _stage2: Exp = comp([
  atom("➕"),
  atom("🐝"),
  comp([atom("➕"), atom("🌸"), atom("🍄")]),
]);

export const init_model: Model = {
  stage: stage,
  info: Statics.mk(stage),
  selection: [],
  hover: { t: "NoHover" },
  transforms: transforms,
  transforms_directed: transforms_directed,
  settings: Settings.init,
};

//console.log("info: init:", Statics.mk(stage));
