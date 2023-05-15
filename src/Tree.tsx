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
export const p_var_id = (id:number, name: string): Pat => ({t: 'Atom', id, sym:{t: 'Var', name}});
export const p_const_id = (id:number, name: string): Pat => ({t: 'Atom', id, sym:{t: 'Const', name}});
export const p_const = (name: string): Pat => ({t: 'Atom', id:new_id(), sym:{t: 'Const', name}});
export const p_comp_id = (id: number,kids: Pat[]): Pat => ({t: 'Comp', id, kids});
export const p_comp = (kids: Pat[]): Pat => ({t: 'Comp', id:new_id(), kids});

type NameBinding = [string, Exp];
type IdBinding = [number, number];
type Binding = {t:'Val', ids:IdBinding, val:NameBinding} | {t:'Ids', ids:IdBinding}
let val = (id1: number, id2: number, name: string, exp: Exp): Binding => ({t:'Val', val:[name, exp], ids:[id1, id2]});
let ids = (id1: number, id2: number): Binding => ({t:'Ids', ids:[id1, id2]});
type MatchResult = Binding[] | 'NoMatch';
export type TransformResult = Exp | 'NoMatch';

/* Try to match Exp with Pat at the root of Exp */
export const matches = (pat: Pat, exp: Exp): MatchResult => {
  switch(pat.t) {
    case 'Atom': {
      switch(pat.sym.t) {
        case 'Var': return [val(pat.id, exp.id, pat.sym.name, exp)];
        case 'Const': {
          switch(exp.t) {
            case 'Atom': return pat.sym.name == exp.sym ? [ids(pat.id, exp.id)] : 'NoMatch';
            case 'Comp': return 'NoMatch'; }}}};
    break;
    case 'Comp': {
      switch(exp.t) {
        case 'Atom': return 'NoMatch';
        case 'Comp':
          let r = kidsmatch(pat.kids, exp.kids);
          if (r == 'NoMatch') return 'NoMatch';
          else return r.concat(ids(pat.id, exp.id));
}}}};

const var_hydrate = (bindings: Binding[],pat_name:string):Exp =>{
  let binding = bindings.find((guy) =>  guy.t == 'Val' && guy.val[0] == pat_name );
  if (binding && binding.t =='Val') return binding.val[1];
  else return atom(pat_name); //TODO: error instead?
}

const ids_hydrate = (bindings: Binding[],pat_id:number):number =>{
  let binding = bindings.find(({ids:[id, _], t}) => id == pat_id && t == 'Ids');
  if (binding && binding.t =='Ids') return binding.ids[1];
  else return new_id(); //TODO: error instead?
}

/* Recursively substitute the provided bindings into the Pat template */
export const hydrate = (pat: Pat, bindings: Binding[]): Exp => {
  switch(pat.t) {
    case 'Atom': {
      switch(pat.sym.t) {
        case 'Var': return var_hydrate(bindings,pat.sym.name);
        case 'Const': return atom_id(pat.sym.name, ids_hydrate(bindings,pat.id))}}
    case 'Comp': return comp_id(pat.kids.map(kid => hydrate(kid, bindings)), ids_hydrate(bindings,pat.id));
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

let map_or = (acc: Exp[]|'NoMatch', b: TransformResult): Exp[]|'NoMatch' => {
  if (acc === 'NoMatch' || b === 'NoMatch') return 'NoMatch';
  return acc.concat([b])
};

/* descend into tree to find exp node of certain id, and then try to do the transform */
export const transform_at_id = (exp: Exp, pat: Pat, template: Pat, id: number): TransformResult => {
  console.log('transform_at_id', id);
  switch(exp.t) {
    case 'Atom': return exp.id == id ? transform(exp, pat, template) : exp;
    case 'Comp': if (exp.id == id) {
      return transform(exp, pat, template)
    }
    else {
      let kids =
        exp.kids
        .map(kid => transform_at_id(kid, pat, template, id))
        .reduce(map_or, [])
      return kids === 'NoMatch' ? 'NoMatch' : {...exp, kids};}
    }};