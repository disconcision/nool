import * as Exp from "./syntax/Exp";
import * as Path from "./syntax/Path";
import * as ID from "./syntax/ID";
import { size } from "./syntax/Node";

export type Info = {
  path: Path.t;
  ancestors: ID.t[];
  size: number;
  depth: number;
  //id: ID;
  //depth: number; // length of path
  //parent: number; // head of path
};

export type InfoMap = Map<ID.t, Info>;

export const mk = (exp: Exp.t, ancestors: ID.t[]): InfoMap => {
  const map = new Map<ID.t, Info>();
  const go = (exp: Exp.t, path: Path.t = []): void => {
    const id = exp.id;
    const info = {
      path: [...path],
      size: size(exp),
      depth: path.length,
      // add id to beginning of ancestors
      ancestors: [id, ...ancestors],
    };
    map.set(id, info);
    switch (exp.t) {
      case "Comp":
        exp.kids.forEach((kid, index) => go(kid, [...path, index]));
        break;
      case "Atom":
        // No operation for Atom case so far
        break;
    }
  };
  go(exp);
  return map;
};

export const get = (map: InfoMap, id: ID.t): Info => {
  const info = map.get(id);
  if (info == undefined) {
    console.log(`InfoMap.get: id ${id} not found`);
    //throw new Error(`InfoMap.get: id ${id} not found`);
    return { path: [], depth: 0, size: 0, ancestors: [] };
  } else {
    return info;
  }
};
