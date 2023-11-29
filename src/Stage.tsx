import { Exp, atom, comp } from "./syntax/Exp";
import * as Statics from "./Statics";
import * as Path from "./syntax/Path";
import * as Projector from "./Projector";
import { is_path_valid } from "./syntax/Node";

export type Stage = {
  exp: Exp;
  selection: Path.t;
  info: Statics.InfoMap; //derived from exp
  projectors: Projector.PMap; //annotations
};

export type t = Stage;

// 🦷 🦠 🧩 🌸 ✖️ 🌘 🌕 0️⃣

const exp: Exp = comp([
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

export const init: Stage = {
  exp: exp,
  selection: [],
  info: Statics.mk(exp, []),
  projectors: Projector.init,
};

export const put_exp = (stage: Stage, exp: Exp): Stage => ({
  ...stage,
  exp: exp,
  info: Statics.mk(exp, []),
});

export const put_selection = (stage: Stage, path: Path.t): Stage => ({
  ...stage,
  selection: path,
});

const rev = (path: Path.t): Path.t => {
  const blah = [...path];
  return blah.reverse();
};

const move_up = (exp: Exp, selection: number[]): Path.t => {
  if (selection.length === 0) return selection;
  const [last, ...tl] = rev(selection);
  const new_path = rev([last - 1, ...tl]);
  //TODO: hack, hardcoded skipping of head via !=1 check
  if (last != 1 && is_path_valid(new_path, exp)) {
    return new_path;
  } else return selection;
};

const move_down = (exp: Exp, selection: number[]): Path.t => {
  if (selection.length === 0) return selection;
  const [last, ...tl] = rev(selection);
  const new_path = rev([last + 1, ...tl]);
  if (is_path_valid(new_path, exp)) {
    return new_path;
  } else return selection;
};

const move_left = (_exp: Exp, selection: number[]): Path.t => {
  if (selection.length === 0) {
    return selection;
  } else {
    return selection.slice(0, selection.length - 1);
  }
};

const move_right = (exp: Exp, selection: number[]): Path.t => {
  const new_selection = [...selection, 1];
  if (is_path_valid(new_selection, exp)) {
    return new_selection;
  } else {
    return selection;
  }
};

export const move_ = (
  stage: Stage,
  direction: "up" | "down" | "left" | "right"
): Path.t => {
  switch (direction) {
    case "up":
      return move_up(stage.exp, stage.selection);
    case "down":
      return move_down(stage.exp, stage.selection);
    case "left":
      return move_left(stage.exp, stage.selection);
    case "right":
      return move_right(stage.exp, stage.selection);
  }
};

export const move = (
  stage: Stage,
  direction: "up" | "down" | "left" | "right"
) => put_selection(stage, move_(stage, direction));
