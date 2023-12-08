import {
  Pat,
  p_var,
  p_const,
  p_comp,
  p_comp_id,
  p_const_id,
} from "./syntax/Pat";
import * as Sound from "./Sound";
import * as Transform from "./Transform";
import * as Path from "./syntax/Path";

export type t = {
  selector: Path.t;
  transforms: Transform.t[];
};

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

export const commute_plus: Transform.t = {
  name: "⇿",
  source: p_comp_id(-2, [plus_1, var_a, var_b]),
  result: p_comp_id(-2, [plus_1, var_b, var_a]),
  sound: Sound.sfx("tiup"), //Sound.mk("F2", "8n"),
  sound_rev: Sound.sfx_reverse("tiup"),
  reversed: false,
};

export const associate_plus: Transform.t = {
  name: "⥂",
  source: plus_y(var_a, plus_x(var_b, var_c)),
  result: plus_y(plus_x(var_a, var_b), var_c),
  sound: Sound.sfx("shwoph"), //Sound.mk("D2", "8n"),
  sound_rev: Sound.sfx_reverse("shwoph"),
  reversed: false,
};

export const identity_plus: Transform.t = {
  name: "⟲",
  source: var_a,
  result: p_comp([p_const("➕"), p_const("🌑"), var_a]),
  sound: Sound.sfx("chchiu"), //Sound.mk("A2", "8n"),
  sound_rev: Sound.sfx_reverse("chchiu"),
  reversed: false,
};

export const inverse_plus: Transform.t = {
  name: "⇿",
  source: plus_x(var_a, neg_x(var_a)),
  result: p_const("🌑"),
  sound: Sound.sfx("klohk"), //Sound.mk("C3", "8n"),
  sound_rev: Sound.sfx_reverse("klohk"),
  reversed: false,
};

export const init_transforms = [
  associate_plus,
  commute_plus,
  identity_plus,
  Transform.rev(inverse_plus),
];

export const init: t = {
  selector: [],
  transforms: init_transforms,
};

const update_selector = (tools: t, f: (_: Path.t) => Path.t): t => ({
  ...tools,
  selector: f(tools.selector),
});

export const move = (
  tools: t,
  direction: "up" | "down" | "left" | "right"
): t => {
  switch (direction) {
    case "up":
      return update_selector(tools, Transform.move_up);
    case "down":
      return update_selector(tools, Transform.move_down);
    case "left":
      return update_selector(tools, Transform.move_left);
    case "right":
      return update_selector(tools, Transform.move_right);
  }
};
