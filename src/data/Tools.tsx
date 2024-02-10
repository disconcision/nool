import * as Pat from "../syntax/Pat";
import * as Sound from "../Sound";
import * as Transform from "../Transform";

type Base = { source: Pat.t; result: Pat.t; sound: Sound.Sfxbank };

const zero = Pat.p_const("🌑");
const one = Pat.p_const("🌘");
const hole = Pat.p_const("❓");

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
const equals_x = bin_x("🟰");

const B = Pat.p_const("ɖ");
const Bx = bin_x("ɖ");
const By = bin_y("ɖ");
const two = Bx(zero, one);

const b_def_0: Base = {
  source: plus_x(one, one),
  result: two,
  sound: "tiup",
};
const b_def_1: Base = {
  source: Bx(var_a, var_b),
  result: plus_x(var_a, times_x(var_b, two)),
  sound: "tiup",
};
const b_thm_0: Base = {
  source: Bx(one, var_a),
  result: plus_x(Bx(zero, var_a), one),
  sound: "tiup",
};
const b_thm_1: Base = {
  source: Bx(var_a, zero),
  result: times_x(var_a, two),
  sound: "tiup",
};
const b_thm_2: Base = {
  source: plus_x(Bx(zero, var_a), By(var_c, var_b)),
  result: Bx(var_c, plus_x(var_a, var_b)),
  sound: "tiup",
};
const b_thm_3: Base = {
  source: plus_x(Bx(one, var_a), By(one, var_b)),
  result: Bx(zero, plus_x(plus_x(var_a, var_b), one)),
  sound: "tiup",
};

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

const mk_mk = (result: Pat.t): Base => ({
  source: hole,
  result: result,
  sound: "klohk", //TODO
});
const mk_wrap = (result: Pat.t): Base => ({
  source: var_a,
  result: result,
  sound: "klohk", //TODO
});
const mk_one = mk_mk(one);
const mk_zero = mk_mk(zero);
const mk_var_a = mk_mk(var_a);
const mk_var_b = mk_mk(var_b);
const mk_var_c = mk_mk(var_c);
const mk_plus = mk_mk(plus_x(hole, hole));
const mk_times = mk_mk(times_x(hole, hole));
const mk_equals = mk_mk(equals_x(hole, hole));
const mk_neg = mk_mk(neg_x(hole));
const mk_neg_wrap = mk_wrap(neg_x(var_a));
const mk_times_l_wrap = mk_wrap(times_x(var_a, hole));
const mk_times_r_wrap = mk_wrap(times_x(hole, var_a));
const mk_plus_l_wrap = mk_wrap(plus_x(var_a, hole));
const mk_plus_r_wrap = mk_wrap(plus_x(hole, var_a));
const mk_equals_l_wrap = mk_wrap(equals_x(var_a, hole));
const mk_equals_r_wrap = mk_wrap(equals_x(hole, var_a));
const zap: Base = {
  source: var_a,
  result: hole,
  sound: "klohk",
};

const makers = [
  mk_one,
  mk_zero,
  mk_var_a,
  mk_var_b,
  mk_var_c,
  mk_neg,
  mk_plus,
  mk_times,
  mk_equals,
  mk_neg_wrap,
  mk_times_l_wrap,
  mk_times_r_wrap,
  mk_plus_l_wrap,
  mk_plus_r_wrap,
  mk_equals_l_wrap,
  mk_equals_r_wrap,
  //zap,
];

const mk = ({ source, result, sound }: Base): Transform.t => ({
  name: "",
  source,
  result,
  sound: Sound.sfx(sound),
  sound_rev: Sound.sfx_reverse(sound),
  reversed: false,
});

export const init = [
  b_def_0,
  b_def_1,
  b_thm_0,
  b_thm_1,
  b_thm_2,
  b_thm_3,
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

export const _init = makers.map(mk);
