import {
  Pat,
  TransformResult,
  transform_at_id,
  transform_at_path,
} from "./syntax/Pat";
import { Exp } from "./syntax/Exp";
import * as Path from "./syntax/Path";
import * as Action from "./Action";
import { select } from "./Sound";

export type Transform = {
  name: string;
  source: Pat;
  result: Pat;
  sound: () => void;
  sound_rev: () => void;
  reversed: boolean;
};

export type t = Transform;

export const rev = (t: Transform): Transform => ({
  name: t.name,
  source: t.result,
  result: t.source,
  sound: t.sound,
  sound_rev: t.sound_rev,
  reversed: !t.reversed,
});

const at_id =
  ({ source, result }: Transform, id: number) =>
  (exp: Exp): TransformResult =>
    transform_at_id(exp, source, result, id);

export const at_path =
  ({ source, result }: Transform, path: Path.t) =>
  (exp: Exp): TransformResult =>
    transform_at_path(exp, source, result, path);

export const flip_at_index = (ts: Transform[], index: number): Transform[] =>
  ts.map((t, i) => (i === index ? rev(t) : t));

export const init_selector = (selector: number[]): number[] =>
  selector.length < 2 ? [0, 0] : selector;

export const move_up = (selector: number[]): number[] => {
  const [hd, ...tl] = init_selector(selector);
  return [(hd - 1 + 4) % 4, ...tl];
};

export const move_down = (selector: number[]): number[] => {
  const [hd, ...tl] = init_selector(selector);
  return [(hd + 1 + 4) % 4, ...tl];
};

export const move_left = (selector: number[]): number[] => {
  const [hd, snd, ...tl] = init_selector(selector);
  return [hd, (snd - 1 + 2) % 2, ...tl];
};

export const move_right = (selector: number[]): number[] => {
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
