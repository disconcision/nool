import * as Pat from "../syntax/Pat";
import * as Sound from "../Sound";
import * as Transform from "../Transform";

type Base = { source: Pat.t; result: Pat.t; sound: Sound.Sfxbank };

const mk = ({ source, result, sound }: Base): Transform.t => ({
  name: "",
  source,
  result,
  sound: Sound.sfx(sound),
  sound_rev: Sound.sfx_reverse(sound),
  reversed: false,
});

const zero = Pat.const_id(-1, "🌑");
const one = Pat.const_id(-2, "🌘");

const var_a = Pat.var_id(-3, "♫");
const var_b = Pat.var_id(-4, "♥");
const var_c = Pat.var_id(-5, "✿");

const un_x = (op: string) => (a: Pat.t) =>
  Pat.comp_id(-6, [Pat.const_id(-16, op), a]);
const bin_x = (op: string) => (a: Pat.t, b: Pat.t) =>
  Pat.comp_id(-7, [Pat.const_id(-17, op), a, b]);
const bin_y = (op: string) => (a: Pat.t, b: Pat.t) =>
  Pat.comp_id(-8, [Pat.const_id(-18, op), a, b]);

const neg_x = un_x("➖");
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

export const init = [
  associate_plus,
  commute_plus,
  identity_plus,
  inverse_plus,
  associate_times,
  commute_times,
  identity_times,
  distribute_times_plus,
].map(mk);
