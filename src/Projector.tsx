import * as ID from "./syntax/ID";

type PaintColor = "Cyan" | "Magenta" | "Yellow";

type Painter = PaintColor | "Unpainted";

type Folded = "Folded" | "Quasifolded" | "Enfolded" | "NotFolded";

type Projector = {
  //painter: Painter;
  folded: Folded;
};

type t = Projector;

export type PMap = Map<ID.t, t>;

export const init: PMap = (() => {
  const map = new Map<ID.t, t>();
  map.set(66, { folded: "Folded" });
  map.set(68, { folded: "Folded" });
  return map;
})();

export type Action = "toggleFoldCurrent";

export const update = (id: ID.t, action: Action, projectors: PMap): PMap => {
  switch (action) {
    case "toggleFoldCurrent":
      const map: PMap = new Map(projectors);
      const current = map.get(id);
      if (current === undefined) {
        console.log("Projector.update: id not found, adding new entry:" + id);
        map.set(id, { folded: "Folded" });
      } else {
        console.log("Projector.update: id found, changing folding state:" + id);
        map.set(id, {
          ...current,
          folded: current.folded === "Folded" ? "NotFolded" : "Folded",
        });
      }
      return map;
  }
};

export const is_folded = (id: ID.t, projectors: PMap): boolean => {
  const proj = projectors.get(id);
  return proj !== undefined && proj.folded === "Folded";
};

/*
paint plan:

this version only label nodes; does not replace them
we have a map from ids to (user-specified) attributes including paint color
paint colors come from a fixed palette which includes emojicon labels

flavor: Unflavored | {color: string, label: string}
palette: list(flavor)
attributes: {
  flavor,
  show = Overlay | Collapsed // overlay is color if flavored, collapsed is color + label or "..." if unflavored
}

model 1:
  model.paint = map(ids, attributes) 

view 1:
  for now implictly supress child Overlays, though retained Collapsed

actions 1:
  paintNode(id, flavor)
  showNode(id, show)
  unpaintAllOf(flavor)
  unpaintAll()
  
and then after that works, we can add a second painting abstraction, antipainting:
  add new flavor 'EscapePaint' (name needs work)
  this is only meaningful on decendents of a painted node
  and conceptually it creates a delimited multi-holed context
  simple use case: quasi-folding everything above a selected node

*/
