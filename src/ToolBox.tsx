import * as Transform from "./Transform";
import * as Tools from "./data/Tools";
import * as Path from "./syntax/Path";
import * as Action from "./Action";

export type t = {
  selector: Path.t;
  transforms: Transform.t[];
};

export const init: t = {
  selector: [],
  transforms: Tools.init,
};

export const update_selector = (tools: t, f: (_: Path.t) => Path.t): t => ({
  ...tools,
  selector: f(tools.selector),
});

export const init_selector = (selector: number[]): number[] =>
  selector.length < 2 ? [0, 0] : selector;

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
