import { zip } from "../Util";
import * as ID from "./ID";
import * as Path from "./Path";

export type t<T> =
  | { t: "Atom"; id: ID.t; sym: T }
  | { t: "Comp"; id: ID.t; kids: t<T>[] };

export type Node<T> = t<T>;

export function atom_id<T>(sym: T, id: number): t<T> {
  return { t: "Atom", id, sym };
}

export function comp_id<T>(kids: t<T>[], id: number): t<T> {
  return { t: "Comp", id, kids };
}

export function atom<T>(sym: T): t<T> {
  return atom_id(sym, ID.mk());
}

export function comp<T>(kids: t<T>[]): t<T> {
  return comp_id(kids, ID.mk());
}

/* Zero out all ids */
export function erase<T>(e: t<T>): t<T> {
  switch (e.t) {
    case "Atom":
      return atom_id(e.sym, 0);
    case "Comp":
      return comp_id(e.kids.map(erase), 0);
  }
}

/* Length of longest path from root to a leaf */
export function depth<T>(node: t<T>): number {
  switch (node.t) {
    case "Atom":
      return 0;
    case "Comp":
      return 1 + Math.max(...node.kids.map(depth));
  }
}

/* Structural equality modulo ids */
export function equals<T>(a: t<T>, b: t<T>): boolean {
  switch (a.t) {
    case "Atom":
      switch (b.t) {
        case "Atom":
          return a.sym == b.sym;
        case "Comp":
          return false;
      }
    case "Comp":
      switch (b.t) {
        case "Atom":
          return false;
        case "Comp":
          return (
            a.kids.length == b.kids.length &&
            zip(a.kids, b.kids).every(([a, b]) => equals(a, b))
          );
      }
  }
}

export function size<T>(node: t<T>): number {
  switch (node.t) {
    case "Atom":
      return 1;
    case "Comp":
      return 1 + node.kids.reduce((acc, n) => acc + size(n), 0);
  }
}

/* Replace the id of the root node with new_id */
function replace_root_id<T>(e: t<T>, new_id: number): t<T> {
  switch (e.t) {
    case "Atom":
      return atom_id(e.sym, new_id);
    case "Comp":
      return comp_id(e.kids, new_id);
  }
}

/* If path is valid, return indicated subtree */
export function subtree_at<T>(p: Path.t, n: t<T>): t<T> | undefined {
  switch (n.t) {
    case "Atom":
      return p.length === 0 ? n : undefined;
    case "Comp":
      if (p.length === 0) return n;
      let [hd, ...tl] = p;
      if (n.kids[hd] == undefined) return undefined;
      return subtree_at(tl, n.kids[hd]);
  }
}

/* If path is valid, returns ID of indicated node */
export function id_at<T>(p: Path.t, n: t<T>): ID.t | undefined {
  const subtree = subtree_at(p, n);
  if (subtree == undefined) return undefined;
  else return subtree.id;
}

export function is_path_valid<T>(p: Path.t, n: t<T>): boolean {
  return subtree_at(p, n) != undefined;
}

export function freshen_traverse<T>(
  node: t<T>,
  seen: Set<ID.t>,
  replace: (id: ID.t) => ID.t
): t<T> {
  const blah = seen.has(node.id)
    ? replace_root_id(node, replace(node.id))
    : node;
  if (!seen.has(node.id)) seen.add(node.id);
  switch (blah.t) {
    case "Atom":
      return blah;
    case "Comp":
      return comp_id(
        blah.kids.map((k) => freshen_traverse(k, seen, replace)),
        blah.id
      );
  }
}

/**
 * Traverse a node tree. Keep track of ids seen.
 * When an id is seen twice, replace it with a new id.
 */
export function freshen<T>(node: t<T>): t<T> {
  console.log("freshening");
  return freshen_traverse(node, new Set(), (_) => ID.mk());
}
