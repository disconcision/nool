import { Exp } from "./syntax/Exp";
import * as Statics from "./Statics";
import * as Path from "./syntax/Path";
import * as Projector from "./Projector";
import * as World from "./data/World";

export type selection = "unselected" | Path.t;

export type Stage = {
  exp: Exp;
  selection: selection;
  info: Statics.InfoMap; //derived from exp
  projectors: Projector.PMap; //annotations
};

export type t = Stage;

const exp: Exp = World.init;

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
