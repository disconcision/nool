import {
  Pat,
  Exp,
  TransformResult,
  transform_at_id,
  p_var,
  p_const,
  p_comp,
  p_comp_id,
  p_const_id,
} from "./Tree";

export type Transform = {
  name: string;
  source: Pat;
  result: Pat;
};

export const rev = (t: Transform): Transform => ({
  name: t.name + "⇦",
  source: t.result,
  result: t.source,
});

export const do_at =
  ({ source, result }: Transform, id: number) =>
  (exp: Exp): TransformResult =>
    transform_at_id(exp, source, result, id);

const var_a = p_var("✿");
const var_b = p_var("♫");
const var_c = p_var("♥");
const plus_1 = p_const_id(-3, "➕");
const plus_x = (a: Pat, b: Pat) => p_comp_id(-4, [p_const_id(-5, "➕"), a, b]);
const plus_y = (a: Pat, b: Pat) => p_comp_id(-2, [p_const_id(-3, "➕"), a, b]);

export const commute_plus: Transform = {
  name: "comm",
  source: p_comp_id(-2, [plus_1, var_a, var_b]),
  result: p_comp_id(-2, [plus_1, var_b, var_a]),
};

export const associate_plus: Transform = {
  name: "ass",
  source: plus_y(var_a, plus_x(var_b, var_c)),
  result: plus_y(plus_x(var_a, var_b), var_c),
};

export const identity_plus: Transform = {
  name: "id",
  source: var_a,
  result: p_comp([p_const("➕"), p_const("0️⃣"), var_a]),
};

export const transforms = [identity_plus, commute_plus, associate_plus];

export const transforms_directed = [
  commute_plus,
  associate_plus,
  rev(associate_plus),
  identity_plus,
  rev(identity_plus),
];
