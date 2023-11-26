import {
  Pat,
  TransformResult,
  transform_at_id,
  transform_at_path,
} from "./syntax/Pat";
import { Exp } from "./syntax/Exp";
import * as Path from "./syntax/Path";

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
