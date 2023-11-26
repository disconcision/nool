import * as Node from "./Node";

export type t = Node.t<string>;
export type Exp = t;

export const atom_id = Node.atom_id;
export const comp_id = Node.comp_id;
export const atom = Node.atom;
export const comp = Node.comp;
export const equals = Node.equals;
export const erase = Node.erase;
export const depth = Node.depth;
