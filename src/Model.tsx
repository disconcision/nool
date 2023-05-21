import { Exp, Pat, comp, atom } from "./Tree";

export type Id = number;
//type SelectionMask = [number, string][];

export type HoverTarget =
  | { t: "NoHover" }
  | { t: "StageNode"; id: Id }
  | { t: "TransformSource"; pat: Pat }
  | { t: "TransformResult"; pat: Pat };

type Selection = {
  id: Id;
  //mask: SelectionMask,
};

export type Model = {
  stage: Exp;
  selection: Selection /*| 'NoSelection'*/;
  hover: HoverTarget;
};

const exp0: Exp = comp([
  atom("➕"),
  atom("🎲"),
  comp([atom("➕"), atom("🦷"), atom("🍄")]),
]);

const exp1: Exp = comp([
  atom("➕"),
  atom("🌕"),
  comp([atom("➕"), comp([atom("✖️"), atom("🌘"), atom("🌕")]), atom("🌘")]),
]);

const exp2: Exp = comp([
  atom("➕"),
  atom("🐝"),
  comp([atom("➕"), atom("🌸"), atom("🍄")]),
]);

export const init_model: Model = {
  stage: exp0,
  selection: { id: -1 /*, mask:[]*/ },
  hover: { t: "NoHover" },
};
