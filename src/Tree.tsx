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
const atom_id = (sym: string, id:number): Exp => ({t: 'Atom', id, sym});
export const atom = (sym: string): Exp => atom_id(sym, new_id());
const comp_id  = (kids: Exp[], id:number): Exp => ({t: 'Comp', id, kids});
export const comp = (kids: Exp[]): Exp => comp_id(kids, new_id());

export const erase = (e: Exp): Exp => {
  switch(e.t) {
    case 'Atom': return {t: 'Atom', id:0, sym: e.sym};
    case 'Comp': return {t: 'Comp', id:0, kids: e.kids.map(erase)};}};
    

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
export type TransformResult = Exp | 'NoMatch';

/* Try to match Exp with Pat at the root of Exp */
export const matches = (pat: Pat, exp: Exp): MatchResult => {
  switch(pat.t) {
    case 'Atom': {
      switch(pat.sym.t) {
        case 'Var': return [[pat.sym.name, exp]];
        case 'Const': {
          switch(exp.t) {
            case 'Atom': return pat.sym.name == exp.sym ? [] : 'NoMatch';
            case 'Comp': return 'NoMatch'; }}}};
    break;
    case 'Comp': {
      switch(exp.t) {
        case 'Atom': return 'NoMatch';
        case 'Comp':
          let r= kidsmatch(pat.kids, exp.kids);
          if (r == 'NoMatch') return 'NoMatch';
          else return r;
        return r
}}}};

const var_hydrate = (bindings: Binding[],pat_name:string) =>{
  let binding = bindings.find(([name, _]) => name == pat_name);
  if (binding) return binding[1];
  else return atom(pat_name); //TODO: error instead?
}

/* Recursively substitute the provided bindings into the Pat template */
export const hydrate = (pat: Pat, bindings: Binding[]): Exp => {
  switch(pat.t) {
    case 'Atom': {
      switch(pat.sym.t) {
        case 'Var': return var_hydrate(bindings,pat.sym.name);
        case 'Const': return atom(pat.sym.name); }}
    case 'Comp': return comp(pat.kids.map(kid => hydrate(kid, bindings)));
}};

export const transform = (exp: Exp, pat: Pat, template: Pat): TransformResult => {
  let bindings = matches(pat, exp);
  if (bindings === 'NoMatch') return 'NoMatch';
  return hydrate(template, bindings);
};

let concat_bindings = (a: MatchResult, b: MatchResult): MatchResult => {
    if (a === 'NoMatch' || b === 'NoMatch') return 'NoMatch';
    return a.concat(b);
};

let kidsmatch = (pats: Pat[], exps: Exp[]): MatchResult => {
  if (pats.length !== exps.length) return 'NoMatch';
  return zip(pats, exps)
    .map(([p, t]) => matches(p, t))
    .reduce(concat_bindings, [])
};