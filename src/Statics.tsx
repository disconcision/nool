import * as Exp from "./syntax/Exp";
import * as Path from "./syntax/Path";
import * as ID from "./syntax/ID";
import { size } from "./syntax/Node";
import * as Symbols from "./data/Symbols";

type code_form = "Let" | "Fun" | "Atom" | "App" | "If";
type math_form = "Const" | "UnOp" | "BinOp" | "Digits" | "Free";

export type cls =
  | { t: "Delim" }
  | { t: "Room" }
  | { t: "File" }
  | { t: "Math"; form: math_form }
  | { t: "Code"; form: code_form }
  | { t: "Unknown" };

export const string_of_cls = (cls: cls): string => {
  switch (cls.t) {
    case "Delim":
      return "Delim";
    case "Room":
      return "Room";
    case "File":
      return "File";
    case "Unknown":
      return "Unknown";
    case "Math":
      return "Math:" + cls.form;
    case "Code":
      return "Code" + cls.form;
  }
};

const is_room = (e: Exp.t): boolean =>
  e.t == "Comp" && Symbols.rooms.has(Exp.head(e));

const is_file = (e: Exp.t): boolean =>
  e.t == "Comp" && e.kids.length == 2 && Symbols.filenames.has(Exp.head(e));

export const get_code_form = (e: Exp.t): code_form | "NotCode" => {
  if (e.t == "Comp") {
    const k = (i: number) => Exp.of_atom(e.kids[i]);
    const l = e.kids.length;
    if (l == 1) return "Atom";
    if (l == 4 && k(1) == "(" && k(3) == ")") return "App";
    if (l == 6 && k(0) == "let" && k(2) == "=" && k(4) == "in") return "Let";
    if (l == 3 && k(0) == "fun" && k(2) == "->") return "Fun";
    if (l == 6 && k(0) == "if" && k(2) == "then" && k(4) == "else") return "If";
  }
  return "NotCode";
};

export const is_delim = (cf: code_form, i: number): boolean => {
  switch (cf) {
    case "Let":
      return i === 0 || i === 2 || i === 4;
    case "Fun":
      return i === 0 || i === 2;
    case "App":
      return i === 1 || i === 3;
    case "If":
      return i === 0 || i === 2 || i === 4;
    default:
      return i === 0;
  }
};

const get_math_form = (e: Exp.t): math_form | "NotMath" => {
  if (e.t == "Atom" && Symbols.math_const.has(e.sym)) return "Const";
  if (e.t == "Atom") return "Free";
  if (e.t == "Comp") {
    const k = (i: number) => Exp.of_atom(e.kids[i]);
    const l = e.kids.length;
    if (l == 2 && Symbols.math_un_ops.has(k(0))) return "UnOp";
    if (l == 3 && k(0) == Symbols.digit) return "Digits";
    if (l == 3 && Symbols.math_bin_ops.has(k(0))) return "BinOp";
  }
  return "NotMath";
};

export const cls_of = (exp: Exp.t): cls => {
  switch (exp.t) {
    case "Comp":
      if (exp.kids.length == 0) return { t: "Unknown" };
      if (is_room(exp)) return { t: "Room" };
      if (is_file(exp)) return { t: "File" };
      const code_form = get_code_form(exp);
      if (code_form != "NotCode") return { t: "Code", form: code_form };
      const math_form = get_math_form(exp);
      if (math_form != "NotMath") return { t: "Math", form: math_form };
      return { t: "Unknown" };
    case "Atom":
      return { t: "Unknown" };
  }
};

export type Info = {
  path: Path.t;
  ancestors: ID.t[];
  size: number;
  depth: number;
  cls: cls;
  //id: ID;
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
      cls: cls_of(exp),
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
    return { path: [], depth: 0, size: 0, ancestors: [], cls: {t:"Unknown"} };
  } else {
    return info;
  }
};
