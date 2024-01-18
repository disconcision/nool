import { zip } from "../Util";
import * as Node from "./Node";
import * as Exp from "./Exp";
import * as ID from "./ID";
import * as Path from "./Path";

export type Symbol = { t: "Var"; name: string } | { t: "Const"; name: string };

export type Pat = Node.t<Symbol>;
export type t = Pat;

export const const_id = (id: number, name: string): Pat =>
  Node.atom_id({ t: "Const", name }, id);

export const var_id = (id: number, name: string): Pat =>
  Node.atom_id({ t: "Var", name }, id);

export const comp_id = (id: number, kids: Pat[]): Pat => Node.comp_id(kids, id);

export const p_const = (name: string): Pat => const_id(ID.mk(), name);
export const p_var = (name: string): Pat => var_id(ID.mk(), name);
export const p_comp = (kids: Pat[]): Pat => comp_id(ID.mk(), kids);

type NameBinding = [string, Exp.t];

type IdBinding = [number, number];

export type Binding =
  | { t: "Val"; ids: IdBinding; val: NameBinding }
  | { t: "Ids"; ids: IdBinding };

type MatchResult = Binding[] | "NoMatch";

export type TransformResult = Exp.t | "NoMatch";

export const val = (
  id1: number,
  id2: number,
  name: string,
  exp: Exp.t
): Binding => ({
  t: "Val",
  val: [name, exp],
  ids: [id1, id2],
});

const ids = (id1: number, id2: number): Binding => ({
  t: "Ids",
  ids: [id1, id2],
});

const name_bindings = (bindings: Binding[]): NameBinding[] =>
  bindings
    .map((bind) => {
      switch (bind.t) {
        case "Val":
          return [bind.val];
        case "Ids":
          return [];
      }
    })
    .flat();

/* Enforces linearity: Duplicate bindings must have the same value.
   Leaves duplicates intact as they are used for highlighting. */
const concat_bindings = (a: MatchResult, b: MatchResult): MatchResult => {
  if (a === "NoMatch" || b === "NoMatch") return "NoMatch";
  let a_names = name_bindings(a);
  let b_has_different_valud_dupe = b.find(
    (bind) =>
      bind.t == "Val" &&
      a_names.find(
        ([name, exp]) => name == bind.val[0] && !Exp.equals(exp, bind.val[1])
      )
  );
  if (b_has_different_valud_dupe) return "NoMatch";
  return a.concat(b);
};

const kidsmatch = (pats: Pat[], exps: Exp.t[]): MatchResult => {
  if (pats.length !== exps.length) return "NoMatch";
  return zip(pats, exps)
    .map(([p, t]) => matches(p, t))
    .reduce(concat_bindings, []);
};

/* Try to match Exp with Pat at the root of Exp */
export const matches = (pat: Pat, exp: Exp.t): MatchResult => {
  switch (pat.t) {
    case "Atom":
      switch (pat.sym.t) {
        case "Var":
          return [val(pat.id, exp.id, pat.sym.name, exp)];
        case "Const":
          switch (exp.t) {
            case "Atom":
              return pat.sym.name == exp.sym
                ? [ids(pat.id, exp.id)]
                : "NoMatch";
            case "Comp":
              return "NoMatch";
          }
      }
      break;
    case "Comp": {
      switch (exp.t) {
        case "Atom":
          return "NoMatch";
        case "Comp":
          let r = kidsmatch(pat.kids, exp.kids);
          if (r == "NoMatch") return "NoMatch";
          else return r.concat(ids(pat.id, exp.id));
      }
    }
  }
};

const var_hydrate = (bindings: Binding[], pat_name: string): Exp.t => {
  const binding = bindings.find(
    (guy) => guy.t == "Val" && guy.val[0] == pat_name
  );
  if (binding && binding.t == "Val") return binding.val[1];
  else return Exp.atom(pat_name); //TODO: error instead?
};

const ids_hydrate = (bindings: Binding[], pat_id: number): number => {
  const binding = bindings.find(
    ({ ids: [id, _], t }) => id == pat_id && t == "Ids"
  );
  if (binding && binding.t == "Ids") return binding.ids[1];
  else return ID.mk(); //TODO: error instead?
};

/* Recursively substitute the provided bindings into the Pat template */
export const hydrate = (pat: Pat, bindings: Binding[]): Exp.t => {
  switch (pat.t) {
    case "Atom": {
      switch (pat.sym.t) {
        case "Var":
          return var_hydrate(bindings, pat.sym.name);
        case "Const":
          return Exp.atom_id(pat.sym.name, ids_hydrate(bindings, pat.id));
      }
    }
    case "Comp":
      return Exp.comp_id(
        pat.kids.map((kid) => hydrate(kid, bindings)),
        ids_hydrate(bindings, pat.id)
      );
  }
};

export const transform = (
  exp: Exp.t,
  pat: Pat,
  template: Pat
): TransformResult => {
  let bindings = matches(pat, exp);
  if (bindings === "NoMatch") return "NoMatch";
  let result = hydrate(template, bindings);
  return result;
};

/* Return first non-NoMatch result */
let matchresult_map_or = (acc: MatchResult, b: MatchResult): MatchResult => {
  if (acc != "NoMatch") return acc;
  else return b;
};

/* Descend into tree to find exp node of id, and then try to match the pattern */
export const matches_at_id = (
  exp: Exp.t,
  pat: Pat,
  id: number
): MatchResult => {
  if (exp.id == id) {
    return matches(pat, exp);
  } else {
    switch (exp.t) {
      case "Atom":
        return "NoMatch";
      case "Comp":
        return exp.kids
          .map((kid) => matches_at_id(kid, pat, id))
          .reduce((acc, b) => (acc != "NoMatch" ? acc : b), "NoMatch");
    }
  }
};

export const matches_at_path = (
  exp: Exp.t,
  pat: Pat,
  path: Path.t
): MatchResult => {
  if (path.length === 0) {
    return matches(pat, exp);
  } else {
    let [hd, ...tl] = path;
    switch (exp.t) {
      case "Atom":
        return "NoMatch";
      case "Comp":
        return matches_at_path(exp.kids[hd], pat, tl);
    }
  }
};

let map_or = (
  acc: Exp.t[] | "NoMatch",
  b: TransformResult
): Exp.t[] | "NoMatch" => {
  if (acc === "NoMatch" || b === "NoMatch") return "NoMatch";
  return acc.concat([b]);
};

/* descend into tree to find exp node of certain id, and then try to do the transform */
export const transform_at_id = (
  exp: Exp.t,
  pat: Pat,
  template: Pat,
  id: number
): TransformResult => {
  switch (exp.t) {
    case "Atom":
      return exp.id == id ? transform(exp, pat, template) : exp;
    case "Comp":
      if (exp.id == id) {
        return transform(exp, pat, template);
      } else {
        let kids = exp.kids
          .map((kid) => transform_at_id(kid, pat, template, id))
          .reduce(map_or, []);
        return kids === "NoMatch" ? "NoMatch" : { ...exp, kids };
      }
  }
};

export const transform_at_path = (
  exp: Exp.t,
  pat: Pat,
  template: Pat,
  path: Path.t
): TransformResult => {
  if (path.length === 0) {
    return transform(exp, pat, template);
  } else {
    let [hd, ...tl] = path;
    switch (exp.t) {
      case "Atom":
        return "NoMatch";
      case "Comp":
        //TODO: cleanup...
        const res = transform_at_path(exp.kids[hd], pat, template, tl);
        if (res === "NoMatch") return "NoMatch";
        let kids = exp.kids.map((kid, index) => {
          if (index === hd) {
            const res = transform_at_path(kid, pat, template, tl);
            if (res === "NoMatch") return kid;
            else return res;
          } else return kid;
        });
        return { ...exp, kids };
    }
  }
};

export const transform_at_path2 = (
  exp: Exp.t,
  pat: Pat,
  template: Pat,
  path: Path.t
): TransformResult => {
  if (path.length === 0) {
    return transform(exp, pat, template);
  } else {
    let [hd, ...tl] = path;
    switch (exp.t) {
      case "Atom":
        return "NoMatch";
      case "Comp":
        //TODO: cleanup...
        const res = transform_at_path(exp.kids[hd], pat, template, tl);
        if (res === "NoMatch") return "NoMatch";
        let kids = exp.kids.map((kid, index) => {
          if (index === hd) {
            const res = transform_at_path(kid, pat, template, tl);
            if (res === "NoMatch") return kid;
            else return res;
          } else return kid;
        });
        return { ...exp, kids };
    }
  }
};
