import * as Pat from "./syntax/Pat";
import { Exp } from "./syntax/Exp";
import * as Path from "./syntax/Path";

export type Transform = {
  name: string;
  source: Pat.t;
  result: Pat.t;
  sound: () => void;
  sound_rev: () => void;
  reversed: boolean;
};

export type t = Transform;

export const flip = (t: Transform): Transform => ({
  ...t,
  source: t.result,
  result: t.source,
  reversed: !t.reversed,
});

const at_id =
  ({ source, result }: Transform, id: number) =>
  (exp: Exp): Pat.TransformResult =>
    Pat.transform_at_id(exp, source, result, id);

export const at_path =
  ({ source, result }: Transform, path: Path.t) =>
  (exp: Exp): Pat.TransformResult =>
    Pat.transform_at_path(exp, source, result, path);
