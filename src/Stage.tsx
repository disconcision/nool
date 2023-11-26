import { Exp, atom, comp } from "./syntax/Exp";
import * as Statics from "./Statics";
import * as Path from "./syntax/Path";
import * as Projector from "./Projector";

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
  info: Statics.mk(exp),
  projectors: Projector.init,
};

export const put_exp = (stage: Stage, exp: Exp): Stage => ({
  ...stage,
  exp: exp,
  info: Statics.mk(exp),
});

export const put_selection = (stage: Stage, path: Path.t): Stage => ({
  ...stage,
  selection: path,
});
