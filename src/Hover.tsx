import * as ID from "./syntax/ID";
import * as Pat from "./syntax/Pat";

export type t =
  | { t: "NoHover" }
  | { t: "StageNode"; id: ID.t }
  | { t: "TransformSource"; pat: Pat.t }
  | { t: "TransformResult"; pat: Pat.t };

export const init: t = { t: "NoHover" };