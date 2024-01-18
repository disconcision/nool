import * as Pat from "../syntax/Pat";
import * as Sound from "../Sound";
import * as Transform from "../Transform";

type Base = { source: Pat.t; result: Pat.t; sound: Sound.Sfxbank };

const zero = Pat.p_const("🌑");
const one = Pat.p_const("🌘");

const var_a = Pat.p_var("♫");
const var_b = Pat.p_var("♥");
const var_c = Pat.p_var("✿");

const un_x = (op: string) => (a: Pat.t) =>
  Pat.comp_id(-6, [Pat.const_id(-16, op), a]);
const un_y = (op: string) => (a: Pat.t) =>
  Pat.comp_id(-7, [Pat.const_id(-17, op), a]);
const bin_x = (op: string) => (a: Pat.t, b: Pat.t) =>
  Pat.comp_id(-8, [Pat.const_id(-18, op), a, b]);
const bin_y = (op: string) => (a: Pat.t, b: Pat.t) =>
  Pat.comp_id(-9, [Pat.const_id(-19, op), a, b]);

const neg_x = un_x("➖");
const neg_y = un_y("➖");
const plus_x = bin_x("➕");
const plus_y = bin_y("➕");
const times_x = bin_x("✖️");
const times_y = bin_y("✖️");

const commute_plus: Base = {
  source: plus_x(var_a, var_b),
  result: plus_x(var_b, var_a),
  sound: "tiup",
};

const associate_plus: Base = {
  source: plus_y(var_a, plus_x(var_b, var_c)),
  result: plus_y(plus_x(var_a, var_b), var_c),
  sound: "shwoph",
};

const identity_plus: Base = {
  source: var_a,
  result: plus_x(zero, var_a),
  sound: "chchiu",
};

const inverse_plus: Base = {
  source: zero,
  result: plus_x(var_a, neg_x(var_a)),
  sound: "klohk",
};

const double_neg: Base = {
  source: var_a,
  result: neg_x(neg_y(var_a)),
  sound: "klohk",
};

const commute_times: Base = {
  source: times_x(var_a, var_b),
  result: times_x(var_b, var_a),
  sound: "tiup",
};

const associate_times: Base = {
  source: times_y(var_a, times_x(var_b, var_c)),
  result: times_y(times_x(var_a, var_b), var_c),
  sound: "shwoph",
};

const identity_times: Base = {
  source: var_a,
  result: times_x(one, var_a),
  sound: "chchiu",
};

const distribute_times_plus: Base = {
  source: plus_x(times_y(var_a, var_b), times_y(var_a, var_c)),
  result: times_y(var_a, plus_x(var_b, var_c)),
  sound: "shwoph",
};

const mk = ({ source, result, sound }: Base): Transform.t => ({
  name: "",
  source,
  result,
  sound: Sound.sfx(sound),
  sound_rev: Sound.sfx_reverse(sound),
  reversed: false,
});

export const init = [
  associate_plus,
  commute_plus,
  identity_plus,
  inverse_plus,
  associate_times,
  commute_times,
  identity_times,
  distribute_times_plus,
  double_neg,
].map(mk);
