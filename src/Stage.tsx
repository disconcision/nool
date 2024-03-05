import * as Exp from "./syntax/Exp";
import * as Statics from "./Statics";
import * as Path from "./syntax/Path";
import * as Projector from "./Projector";
import * as World from "./data/World";
import { is_path_valid, id_at } from "./syntax/Node";
import * as ID from "./syntax/ID";

export type selection = "unselected" | Path.t;

export type Stage = {
  exp: Exp.t;
  selection: selection;
  info: Statics.InfoMap; //derived from exp
  projectors: Projector.PMap; //annotations
};

export type t = Stage;

const exp: Exp.t = World.init;

export const init: Stage = {
  exp,
  selection: "unselected",
  info: Statics.mk(exp, []),
  projectors: Projector.init,
};

export const put_exp = (stage: Stage, exp: Exp): Stage => ({
  ...stage,
  exp: exp,
  info: Statics.mk(exp, []),
});

export const put_selection = (stage: Stage, path: selection): Stage => ({
  ...stage,
  selection: path,
});

export const unset_selection = (stage: Stage): Stage =>
  put_selection(stage, "unselected");

const rev = (path: Path.t): Path.t => {
  const blah = [...path];
  return blah.reverse();
};

const move_up = (exp: Exp.t, selection: number[]): Path.t => {
  if (selection.length === 0) return selection;
  const [last, ...tl] = rev(selection);
  const new_path = rev([last - 1, ...tl]);
  //TODO: hack, hardcoded skipping of head via !=1 check
  if (last != 1 && is_path_valid(new_path, exp)) {
    return new_path;
  } else return selection;
};

const move_down = (exp: Exp.t, selection: number[]): Path.t => {
  /* first, try to increment last idx of selection.
  if that gives a valid path, return it.
  then try to increment second last index, etc.
  If none of those are valid,
  drop the last element of the selection, and recurse.
   */
  if (selection.length === 0) return selection;
  for (let i = selection.length - 1; i >= 0; i--) {
    const new_path = [...selection];
    new_path[i]++;
    for (let j = i + 1; j < new_path.length; j++) {
      new_path[j] = 1; /* 1 is starting index as we're skipping the head */
    }
    if (is_path_valid(new_path, exp)) {
      return new_path;
    }
  }
  return move_down(exp, Array(selection.length).fill(0));
};

const move_left = (_exp: Exp.t, selection: number[]): Path.t => {
  if (selection.length === 0) {
    return selection;
  } else {
    return selection.slice(0, selection.length - 1);
  }
};

const move_right = (exp: Exp.t, selection: number[]): Path.t => {
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
  if (stage.selection === "unselected") return [];
  const selection = stage.selection;
  switch (direction) {
    case "up":
      return move_up(stage.exp, selection);
    case "down":
      return move_down(stage.exp, selection);
    case "left":
      return move_left(stage.exp, selection);
    case "right":
      return move_right(stage.exp, selection);
  }
};

export const move = (
  stage: Stage,
  direction: "up" | "down" | "left" | "right"
) => put_selection(stage, move_(stage, direction));

export const indicated_id = (stage: Stage): ID.t | undefined =>
  stage.selection === "unselected"
    ? undefined
    : id_at(stage.selection, stage.exp);

export const projected_width = (stage: t) =>{
  console.log("width: " +Exp.width(Projector.project_folds(stage.projectors, stage.exp)))
  return Exp.width(Projector.project_folds(stage.projectors, stage.exp));}
