import * as ID from "./syntax/ID";
import * as Exp from "./syntax/Exp";

//type PaintColor = "Cyan" | "Magenta" | "Yellow";
//type Painter = PaintColor | "Unpainted";

type Folded = "Folded" | "Enfolded" | "NotFolded";

type Projector = {
  //painter: Painter;
  folded: Folded;
};

type t = Projector;

export const basic: Projector = { folded: "NotFolded" };

export type PMap = Map<ID.t, t>;

export const init: PMap = (() => {
  const map = new Map<ID.t, t>();
  map.set(77, { folded: "Folded" });
  map.set(79, { folded: "Folded" });
  map.set(81, { folded: "Folded" });
  map.set(20, { folded: "Enfolded" });
  map.set(82, { folded: "Folded" });
  return map;
})();

export type Action = "toggleFoldCurrent" | "toggleEnfoldCurrent";

export const get = (projectors: PMap, id: ID.t): t => {
  const res = projectors.get(id);
  return res == undefined ? basic : res;
};

export const update = (id: ID.t, action: Action, projectors: PMap): PMap => {
  const map: PMap = new Map(projectors);
  const current = get(map, id);
  switch (action) {
    case "toggleFoldCurrent":
      if (current === undefined) {
        map.set(id, { folded: "Folded" });
      } else {
        map.set(id, {
          ...current,
          folded: current.folded === "Folded" ? "NotFolded" : "Folded",
        });
      }
      return map;
    case "toggleEnfoldCurrent":
      if (current === undefined) {
        console.log("Projector.update: id not found, adding new entry:" + id);
        map.set(id, { folded: "Enfolded" });
      } else {
        console.log("Projector.update: id found, changing folding state:" + id);
        map.set(id, {
          ...current,
          folded: current.folded === "Enfolded" ? "NotFolded" : "Enfolded",
        });
      }
      return map;
  }
};

export const is_folded = (id: ID.t, projectors: PMap): boolean =>
  get(projectors, id).folded === "Folded";

export const is_enfolded = (id: ID.t, projectors: PMap): boolean =>
  get(projectors, id).folded === "Enfolded";

const get_enfolded = (projectors: PMap, node: Exp.t): Exp.t[] => {
  let p = get(projectors, node.id);
  if (p.folded == "Enfolded") {
    return [node];
  } else {
    switch (node.t) {
      case "Atom":
        return [];
      case "Comp":
        if (p.folded == "Folded") {
          return [];
        } else {
          return node.kids
            .map((kid) =>
              get_enfolded(projectors, project_folds(projectors, kid))
            )
            .flat();
        }
    }
  }
};

export const has_enfolded = (projectors: PMap, node: Exp.t): boolean =>
  get_enfolded(projectors, node).length > 0;

let get_id = (node: Exp.t) => {
  const res = Exp.head_id(node);
  return res == undefined ? -1 : res;
};

let summary_head = (node: Exp.t): Exp.t => ({
  t: "Atom",
  id: get_id(node),
  sym: Exp.head(node),
});

let blank_head = (node: Exp.t): Exp.t => ({
  t: "Atom",
  id: get_id(node),
  sym: "",
});

/* TODO: maybe dont allow enfolds inside enfolds */
export const project_folds = (projectors: PMap, node: Exp.t): Exp.t => {
  switch (node.t) {
    case "Atom":
      return node;
    case "Comp":
      switch (get(projectors, node.id).folded) {
        case "Folded":
          const enfolded = node.kids
            .map((kid) => get_enfolded(projectors, kid))
            .flat();
          const head =
            enfolded.length == 0 ? [summary_head(node)] : [blank_head(node)];
          return {
            ...node,
            kids: head.concat(enfolded),
          };
        default:
          return {
            ...node,
            kids: node.kids.map((kid) => project_folds(projectors, kid)),
          };
      }
  }
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
