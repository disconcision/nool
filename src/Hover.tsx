import * as ID from "./syntax/ID";
import * as Pat from "./syntax/Pat";
import * as Model from "./Model";

export type t =
  | { t: "NoHover" }
  | { t: "StageNode"; id: ID.t }
  | { t: "TransformSource"; pat: Pat.t; idx: number }
  | { t: "TransformResult"; pat: Pat.t; idx: number };

export const init: t = { t: "NoHover" };

export const eq = (a: t, b: t): boolean => {
  switch (a.t) {
    case "NoHover":
      return b.t == "NoHover";
    case "StageNode":
      return b.t == "StageNode" && (a.id === b.id);
    case "TransformSource":
      return b.t == "TransformSource" && Pat.eq(a.pat, b.pat);
    case "TransformResult":
      return b.t == "TransformResult" && Pat.eq(a.pat, b.pat);
  }
}

export const get_binding = (model: Model.t): Pat.Binding[] => {
  switch (model.hover.t) {
    case "NoHover":
      return [];
    case "StageNode":
      return [];
    case "TransformSource":
      if (model.stage.selection == "unselected") return [];
      const rs = Pat.matches_at_path(
        model.stage.exp,
        model.hover.pat,
        model.stage.selection
      );
      return rs == "NoMatch" ? [] : rs;
    case "TransformResult":
      if (model.stage.selection == "unselected") return [];
      const rr = Pat.matches_at_path(
        model.stage.exp,
        model.hover.pat,
        model.stage.selection
      );
      return rr == "NoMatch" ? [] : rr;
  }
};
