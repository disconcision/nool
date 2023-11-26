import {
  Pat,
  TransformResult,
  transform_at_id,
  transform_at_path,
  p_var,
  p_const,
  p_comp,
  p_comp_id,
  p_const_id,
} from "./syntax/Pat";
import { Exp } from "./syntax/Exp";
import * as Path from "./syntax/Path";
import * as Sound from "./Sound";

export type Transform = {
  name: string;
  source: Pat;
  result: Pat;
  sound: () => void;
  sound_rev: () => void;
  reversed: boolean;
};

export const rev = (t: Transform): Transform => ({
  name: t.name,
  source: t.result,
  result: t.source,
  sound: t.sound,
  sound_rev: t.sound_rev,
  reversed: !t.reversed,
});

const do_at =
  ({ source, result }: Transform, id: number) =>
  (exp: Exp): TransformResult =>
    transform_at_id(exp, source, result, id);

export const do_at_path =
  ({ source, result }: Transform, path: Path.t) =>
  (exp: Exp): TransformResult =>
    transform_at_path(exp, source, result, path);

const var_a = p_var("♫");
const var_b = p_var("♥");
const var_c = p_var("✿");

const plus_1 = p_const_id(-10, "➕");
const plus_x = (a: Pat, b: Pat) =>
  p_comp_id(-40, [p_const_id(-50, "➕"), a, b]);
const plus_y = (a: Pat, b: Pat) =>
  p_comp_id(-20, [p_const_id(-30, "➕"), a, b]);

const neg_1 = p_const_id(-60, "➖");
const neg_x = (a: Pat) => p_comp_id(-40, [neg_1, a]);

export const commute_plus: Transform = {
  name: "⇿",
  source: p_comp_id(-2, [plus_1, var_a, var_b]),
  result: p_comp_id(-2, [plus_1, var_b, var_a]),
  sound: Sound.sfx("tiup"), //Sound.mk("F2", "8n"),
  sound_rev: Sound.sfx_reverse("tiup"),
  reversed: false,
};

export const associate_plus: Transform = {
  name: "⥂",
  source: plus_y(var_a, plus_x(var_b, var_c)),
  result: plus_y(plus_x(var_a, var_b), var_c),
  sound: Sound.sfx("shwoph"), //Sound.mk("D2", "8n"),
  sound_rev: Sound.sfx_reverse("shwoph"),
  reversed: false,
};

export const identity_plus: Transform = {
  name: "⟲",
  source: var_a,
  result: p_comp([p_const("➕"), p_const("🌑"), var_a]),
  sound: Sound.sfx("chchiu"), //Sound.mk("A2", "8n"),
  sound_rev: Sound.sfx_reverse("chchiu"),
  reversed: false,
};

export const inverse_plus: Transform = {
  name: "⇿",
  source: plus_x(var_a, neg_x(var_a)),
  result: p_const("🌑"),
  sound: Sound.sfx("klohk"), //Sound.mk("C3", "8n"),
  sound_rev: Sound.sfx_reverse("klohk"),
  reversed: false,
};

export const transforms: Transform[] = [
  identity_plus,
  commute_plus,
  associate_plus,
  inverse_plus,
];