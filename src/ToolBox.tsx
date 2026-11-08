import * as Transform from "./Transform";
import * as Tools from "./data/Tools";
import * as Path from "./syntax/Path";
import * as Action from "./Action";

/* Per-rule drag loadout: which directions of a rule generate drag
 * candidates. Directions are CANONICAL (relative to the rule as written in
 * data/Tools, i.e. Transform.reversed === false is "fwd"), so a rule the
 * select mode has flipped in the box keeps its loadout meaning; the arrow
 * glyph in the row is drawn relative to the row's displayed orientation.
 * "both" is drawn as the equals sign: the rule as a two-way identity. */
export type DragDir = "off" | "both" | "fwd" | "rev";

export type t = {
  selector: Path.t;
  transforms: Transform.t[];
  size: number;
  /* index-aligned with transforms */
  dragActive: DragDir[];
};

export const init: t = {
  selector: [],
  transforms: Tools.init,
  size: 5,
  /* default loadout (by name, so toolbox reordering can't silently shift
   * it). Additive identity is one-way, zero-REMOVING only (0+a → a):
   * zero-adding candidates made every drag soupy, worst on touch. */
  dragActive: Tools.init.map((t): DragDir => default_dir(t.name)),
};

export function default_dir(name: string): DragDir {
  switch (name) {
    case "associate_plus":
    case "commute_plus":
    case "distribute_times_plus":
    case "inverse_plus":
    case "identity_times":
      return "both";
    case "identity_plus":
      return "rev";
    default:
      return "off";
  }
}

/* Tap cycle on a rule row: off → both (=) → fwd (→) → rev (←) → off */
const next_dir: Record<DragDir, DragDir> = {
  off: "both",
  both: "fwd",
  fwd: "rev",
  rev: "off",
};

export const toggle_drag_tool = (tools: t, idx: number): t => ({
  ...tools,
  dragActive: tools.dragActive.map((a, i) => (i === idx ? next_dir[a] : a)),
});

/* May a candidate built from `transform` (some orientation of a box rule)
 * be offered as a drag target under `dir`? */
export const dir_allows = (dir: DragDir, transform: Transform.t): boolean =>
  dir === "both" ||
  (dir === "fwd" && !transform.reversed) ||
  (dir === "rev" && transform.reversed);

export const update_selector = (tools: t, f: (_: Path.t) => Path.t): t => ({
  ...tools,
  selector: f(tools.selector),
});

export const init_selector = (selector: number[]): number[] =>
  selector.length < 2 ? [0, 1] : selector;

const move_up =
  (len: number) =>
  (selector: number[]): number[] => {
    const [hd, ...tl] = init_selector(selector);
    return [(hd - 1 + len) % len, ...tl];
  };

const move_down =
  (len: number) =>
  (selector: number[]): number[] => {
    const [hd, ...tl] = init_selector(selector);
    return [(hd + 1 + len) % len, ...tl];
  };

const move_left = (selector: number[]): number[] => {
  const [hd, snd, ...tl] = init_selector(selector);
  return [hd, (snd - 1 + 2) % 2, ...tl];
};

const move_right = (selector: number[]): number[] => {
  const [hd, snd, ...tl] = init_selector(selector);
  return [hd, (snd + 1 + 2) % 2, ...tl];
};

export const get = (selector: number[]): Action.t => {
  selector = selector.length < 2 ? [0, 0] : selector;
  return {
    t: "applyTransform",
    idx: selector[0],
    direction: selector[1] == 0 ? "forward" : "reverse",
  };
};

export const move = (
  tools: t,
  direction: "up" | "down" | "left" | "right"
): t => {
  const len = tools.transforms.length;
  switch (direction) {
    case "up":
      return update_selector(tools, move_up(len));
    case "down":
      return update_selector(tools, move_down(len));
    case "left":
      return update_selector(tools, move_left);
    case "right":
      return update_selector(tools, move_right);
  }
};

export const get_pat = (tools: t) => {
  let t = tools.transforms[tools.selector[0]];
  return tools.selector[1] === 1 ? t.result : t.source;
};

export const unset = (tools: t): t => ({
  ...tools,
  selector: [],
});

const flip_at_index = (ts: Transform.t[], idx: number): Transform.t[] =>
  ts.map((t, i) => (i === idx ? Transform.flip(t) : t));

export const flip_transform = (tools: t, idx: number): t => ({
  ...tools,
  transforms: flip_at_index(tools.transforms, idx),
});
