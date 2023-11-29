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

/*
we want left to select first child, unless path is innvalid; then select the root
we want right to select parent, unless already at root, then do nothing
we want up to select the 'previous' node at the same depth in the path;
by this we mean a prev sibling if it has one, otherwise try the parent's last sibling's last child.
if no children, the the parent's last sibling itself, and so on.
similarly for down, but in the other direction.
*/
export const move_ = (
  stage: Stage,
  direction: "up" | "down" | "left" | "right"
): Path.t => {
  const { selection } = stage;
  switch (direction) {
    case "up":
      if (selection.length === 0) return selection;
      const blah = [...selection];
      const [last, ...tl] = blah.reverse();
      const new_path = [last - 1, ...tl].reverse();
      //TODO: hack, hardcoded skipping of head via !=1 check
      if (last != 1 && is_path_valid(new_path, stage.exp)) {
        return new_path;
      } else return selection;
    case "down":
      if (selection.length === 0) return selection;
      const blah1 = [...selection];
      const [last1, ...tl1] = blah1.reverse();
      const new_path1 = [last1 + 1, ...tl1].reverse();
      if (is_path_valid(new_path1, stage.exp)) {
        return new_path1;
      } else return selection;
    case "left":
      if ((selection.length = 0)) {
        return selection;
      } else {
        return selection.slice(0, selection.length - 1);
      }
    case "right":
      const new_selection = [...selection, 1];
      if (is_path_valid(new_selection, stage.exp)) {
        return new_selection;
      } else {
        return selection;
      }
  }
};

export const move = (
  stage: Stage,
  direction: "up" | "down" | "left" | "right"
) => put_selection(stage, move_(stage, direction));
