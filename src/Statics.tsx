import * as Exp from "./syntax/Exp";
import { ID, Path } from "./syntax/Node";

export type Info = {
  //id: ID;
  path: Path;
  //depth: number; // length of path
  //parent: number; // head of path
};

export type InfoMap = Map<ID, Info>;

export const mk = (exp: Exp.t): InfoMap => {
  const map = new Map<ID, Info>();
  const visit = (exp: Exp.t, path: Path = []): void => {
    const id = exp.id;
    const info = { path: [...path] };
    map.set(id, info);
    switch (exp.t) {
      case "Comp":
        exp.kids.forEach((kid) => visit(kid, [...path, id]));
        break;
      case "Atom":
        // No operation for Atom case so far
        break;
    }
  };
  visit(exp);
  return map;
}