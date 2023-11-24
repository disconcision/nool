import { Pat } from "./syntax/Pat";
import { Exp, atom, comp } from "./syntax/Exp";
import { Transform, transforms, transforms_directed } from "./Transforms";

export type Id = number;

export type HoverTarget =
  | { t: "NoHover" }
  | { t: "StageNode"; id: Id }
  | { t: "TransformSource"; pat: Pat }
  | { t: "TransformResult"; pat: Pat };

type Selection = {
  id: Id;
};

export type Model = {
  stage: Exp;
  selection: Selection;
  hover: HoverTarget;
  transforms: Transform[];
  transforms_directed: Transform[];
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
  selection: { id: -1 },
  hover: { t: "NoHover" },
  transforms: transforms,
  transforms_directed: transforms_directed,
};
