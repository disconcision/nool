import * as Node from "./Node";

export type t = Node.t<string>;
export type Exp = t;

export const atom_id = Node.atom_id;
export const comp_id = Node.comp_id;
export const atom = Node.atom;
export const comp = Node.comp;
export const equals = Node.equals;
export const equals_id = Node.equals_id;
export const erase = Node.erase;
export const depth = Node.depth;

export const head = (e: Exp): string =>
  e.t == "Comp" && e.kids.length > 0 && e.kids[0].t == "Atom"
    ? e.kids[0].sym
    : "headless";

export const head_is = (s: string, e: Exp): boolean => head(e) === s;

export const head_id = (e: Exp): number | undefined =>
  e.t == "Comp" && e.kids.length > 0 && e.kids[0].t == "Atom"
    ? e.kids[0].id
    : undefined;

const cons =
  (base: string) =>
  (hd: string, tl: Exp): Exp =>
    comp([atom(base), atom(hd), tl]);
    
export const flat =
  (base: string) =>
  (contents: string[]): Exp =>
    contents.length == 0
      ? atom("ɖ")
      : contents
          .slice(0, -1)
          .reduceRight(
            (acc, cur) => cons(base)(cur, acc),
            atom(contents.slice(-1)[0])
          );
