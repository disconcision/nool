import {
  Pat,
  TransformResult,
  transform_at_id,
  p_var,
  p_const,
  p_comp,
  p_comp_id,
  p_const_id,
} from "./syntax/Pat";
import { Exp } from "./syntax/Exp";

export type Transform = {
  name: string;
  source: Pat;
  result: Pat;
};

export const rev = (t: Transform): Transform => ({
  name: t.name,
  source: t.result,
  result: t.source,
});

export const do_at =
  ({ source, result }: Transform, id: number) =>
  (exp: Exp): TransformResult =>
    transform_at_id(exp, source, result, id);

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
};

export const associate_plus: Transform = {
  name: "⥂",
  source: plus_y(var_a, plus_x(var_b, var_c)),
  result: plus_y(plus_x(var_a, var_b), var_c),
};

export const identity_plus: Transform = {
  name: "⟲",
  source: var_a,
  result: p_comp([p_const("➕"), p_const("🌑"), var_a]), //0️⃣
};

export const inverse_plus: Transform = {
  name: "⇿",
  source: plus_x(var_a, neg_x(var_a)),
  result: p_const("🌑"),
};

export const transforms: Transform[] = [
  identity_plus,
  commute_plus,
  associate_plus,
  inverse_plus,
];

export const transforms_directed: Transform[] = [
  commute_plus,
  associate_plus,
  rev(associate_plus),
  identity_plus,
  rev(identity_plus),
  inverse_plus,
  rev(inverse_plus),
];

export const flip_at_index = (ts: Transform[], index: number): Transform[] =>
  ts.map((t, i) => (i === index ? rev(t) : t));
