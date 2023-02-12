import { zip } from "./Util";

type Symbol =
  | {t: 'Var', name: string}
  | {t: 'Const', name: string};

type Node<T> =
  | {t: 'Atom', id:number, sym: T}
  | {t: 'Comp', id:number, kids: Node<T>[]};

var id_gen = 0;
const new_id = () => id_gen++;
  
export type Exp = Node<string>;
export const atom = (sym: string): Exp => ({t: 'Atom', id:new_id(), sym});
export const comp = (kids: Exp[]): Exp => ({t: 'Comp', id:new_id(), kids});

export const depth = (node: Exp):number  => {switch(node.t){
  case 'Atom': return 0;
  case 'Comp': return 1 + Math.max(...node.kids.map(depth));
}};

export type Pat = Node<Symbol>;
export const p_var = (name: string): Pat => ({t: 'Atom', id:new_id(), sym:{t: 'Var', name}});
export const p_const = (name: string): Pat => ({t: 'Atom', id:new_id(), sym:{t: 'Const', name}});
export const p_comp = (kids: Pat[]): Pat => ({t: 'Comp', id:new_id(), kids});

type Binding = [string, Exp];
type MatchResult = Binding[] | 'NoMatch';

export const matches = (pat: Pat, tree: Exp): MatchResult => {
  switch(pat.t) {
    case 'Atom': {
      switch(pat.sym.t) {
        case 'Var': return [[pat.sym.name, tree]];
        case 'Const': {
          switch(tree.t) {
            case 'Atom': return pat.sym.name == tree.sym ? [] : 'NoMatch';
            case 'Comp': return 'NoMatch'; }}}};
    break;
    case 'Comp': {
      switch(tree.t) {
        case 'Atom': return 'NoMatch';
        case 'Comp': return kidsmatch(pat.kids, tree.kids);
}}}};

let concat_bindings = (a: MatchResult, b: MatchResult): MatchResult => {
    if (a === 'NoMatch' || b === 'NoMatch') return 'NoMatch';
    return a.concat(b);
};

let kidsmatch = (pats: Pat[], trees: Exp[]): MatchResult => {
  if (pats.length !== trees.length) return 'NoMatch';
  return zip(pats, trees)
    .map(([p, t]) => matches(p, t))
    .reduce(concat_bindings, [])
};