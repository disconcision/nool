export type Node = { t: 'Atom', s: string} | {t: 'Comp', s:string, kids: Node[]};

export let atom = (s: string): Node => ({t: 'Atom', s});
export let comp = (s: string, kids: Node[]): Node => ({t: 'Comp', s, kids});

export type TNode<T> = { t: 'Atom', s: T} | {t: 'Comp', s:T, kids: TNode<T>[]};
  
type APat = {t: 'Var', s: string} | {t: 'Const', s: string};
type Pat = TNode<APat>;

type Binding = [string, Node];
type MatchResult = Binding[] | undefined;

const zip = <A,B,>(a:A[], b:B[]):[A,B][] => a.map((i, j) => [i, b[j]]);
//function zip<A,B> (a:A[], b:B[]):[A,B][] {return a.map((i, j) => [i, b[j]])};

let matches = (pat: Pat, tree: Node): MatchResult => {
    switch(pat.t) {
        case 'Atom': {
            switch(pat.s.t) {
                case 'Var': return [[pat.s.s, tree]];
                case 'Const': {
                    switch(tree.t) {
                        case 'Atom': return pat.s.s == tree.s ? [] : undefined;
                        case 'Comp': return undefined;}}}};
        break;
        case 'Comp': {
            switch(pat.s.t) {
                case 'Var':
                    switch(tree.t) {
                        case 'Atom': return undefined;
                        case 'Comp':
                            let m = kidmatches(pat.kids, tree.kids);
                            return m ? [[pat.s.s, tree], ...m] : undefined;
                    }
                case 'Const': {
                    switch(tree.t) {
                        case 'Atom': return undefined;
                        case 'Comp': {
                            if (pat.s.s != tree.s) return undefined;
                            return kidmatches(pat.kids, tree.kids);}}}}}}};

let kidmatches = (pats: Pat[], kids: Node[]): MatchResult => {
  let bindings = zip(pats, kids).map(([p,kids]) => matches(p,kids));
  return bindings.includes(undefined) ? undefined : bindings.reduce((a,b) => a!.concat(b!), []);};


/*
 * Examples:
 * 
 * turn 0 with 1
 * turn a with a + 0
 * 
 * turn a + b into b + a
 * 
 * turn 0 + 1 into 0 + (0 + 1)
 * turn a + (b + c) into (a + b) + c
 * 
 * checkMatch (pattern, flattree) => bool
 * returns true if pat matches tree starting at root
 * better: returns {m:Matches, bindings:MatchPairs[]} | {m:DoesNotMatch}
 * 
 * saturateTemplate (template, bindings) => tree
 * */