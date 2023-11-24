import { zip } from "../Util";
import { Node, new_id } from "./Node";

export type t = Node<string>;
export type Exp = t;

export const atom_id = (sym: string, id: number): t => ({ t: "Atom", id, sym });
export const comp_id = (kids: t[], id: number): t => ({ t: "Comp", id, kids });

export const atom = (sym: string): t => atom_id(sym, new_id());
export const comp = (kids: t[]): t => comp_id(kids, new_id());

/* Structural equality modulo ids */
export const equals = (a: t, b: t): boolean => {
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
};

export const erase = (e: t): t => {
  switch (e.t) {
    case "Atom":
      return { t: "Atom", id: 0, sym: e.sym };
    case "Comp":
      return { t: "Comp", id: 0, kids: e.kids.map(erase) };
  }
};

export const depth = (node: t): number => {
  switch (node.t) {
    case "Atom":
      return 0;
    case "Comp":
      return 1 + Math.max(...node.kids.map(depth));
  }
};

const replace_root_id = (e: t, new_id: number): t => {
  switch (e.t) {
    case "Atom":
      return { t: "Atom", id: new_id, sym: e.sym };
    case "Comp":
      return { t: "Comp", id: new_id, kids: e.kids };
  }
};
