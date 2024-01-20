import { Exp, atom, comp } from "../syntax/Exp";
import * as Pat from "../syntax/Pat";
import * as Path from "../syntax/Path";
import * as Id from "../syntax/ID";

const exp_comm_plus: Exp = comp([
  atom("="),
  comp([atom("➕"), atom("♫"), atom("♥")]),
  comp([atom("➕"), atom("♥"), atom("♫")]),
]);

const exp_assoc_plus: Exp = comp([
  atom("="),
  comp([atom("➕"), atom("♫"), comp([atom("➕"), atom("♥"), atom("✿")])]),
  comp([atom("➕"), comp([atom("➕"), atom("♫"), atom("♥")]), atom("✿")]),
]);

const exp_id_plus: Exp = comp([
  atom("="),
  atom("♫"),
  comp([atom("➕"), atom("🌑"), atom("♫")]),
]);

const exp_inv_plus: Exp = comp([
  atom("="),
  atom("🌑"),
  comp([atom("➕"), atom("♫"), atom("🌑")]),
]);

const exp_double_neg: Exp = comp([
  atom("="),
  atom("♫"),
  comp([atom("➖"), comp([atom("➖"), atom("♫")])]),
]);

const exp_comm_times: Exp = comp([
  atom("="),
  comp([atom("✖️"), atom("♫"), atom("♥")]),
  comp([atom("✖️"), atom("♥"), atom("♫")]),
]);

const exp_assoc_times: Exp = comp([
  atom("="),
  comp([atom("✖️"), atom("♫"), comp([atom("✖️"), atom("♥"), atom("✿")])]),
  comp([atom("✖️"), comp([atom("✖️"), atom("♫"), atom("♥")]), atom("✿")]),
]);

const exp_id_times: Exp = comp([
  atom("="),
  atom("♫"),
  comp([atom("✖️"), atom("🌑"), atom("♫")]),
]);

const exp_dist_times_plus: Exp = comp([
  atom("="),
  comp([
    atom("➕"),
    comp([atom("✖️"), atom("♫"), atom("♥")]),
    comp([atom("✖️"), atom("♫"), atom("✿")]),
  ]),
  comp([atom("✖️"), atom("♫"), comp([atom("➕"), atom("♥"), atom("✿")])]),
]);

type pair_of_id_and_symbol = { id: Id.t; symbol: string };

const extract_id_symbol_list = (e: Exp): pair_of_id_and_symbol[] => {
  switch (e.t) {
    case "Atom":
      return [{ id: e.id, symbol: e.sym }];
    case "Comp":
      return e.kids.flatMap((kid, i) =>
        extract_id_symbol_list(kid).map((pair) => ({
          id: pair.id,
          symbol: pair.symbol,
        }))
      );
  }
};

type map_of_ids = Map<Id.t, Id.t>;

const is_var_symbol = (s: string): boolean => {
  switch (s) {
    case "♫":
    case "♥":
    case "✿":
      return true;
    default:
      return false;
  }
};

const get_or_fresh_id = (map: map_of_ids, id: number): number => {
  let res = map.get(id);
  if (res !== undefined) return res;
  return Id.mk();
};

const head_id = (e: Exp): number | undefined => {
  if (e.t == "Comp" && e.kids.length > 0 && e.kids[0].t == "Atom")
    return e.kids[0].id;
  return undefined;
};

//try to get id from head using above; if it's there, comp id becomes that id + 1000
const get_of_fresh_comp_id = (map: map_of_ids, e: Exp): number =>
  get_or_fresh_id(map, head_id(e) ?? Id.mk()) + 1000;

const convert_exp_to_pat_getting_ids_from_map = (
  e: Exp,
  map: map_of_ids
): Pat.t => {
  switch (e.t) {
    case "Atom":
      const id = get_or_fresh_id(map, e.id);
      if (is_var_symbol(e.sym)) return Pat.var_id(id, e.sym);
      return Pat.const_id(id, e.sym);
    case "Comp":
      return Pat.comp_id(
        get_of_fresh_comp_id(map, e),
        e.kids.map((kid) => convert_exp_to_pat_getting_ids_from_map(kid, map))
      );
  }
};

type res = "NotTool" | { source: Pat.t; result: Pat.t };

/*
want to transform expressions rooted with =
into transformation, i.e. a pair of Pats
basically we want to form an association (vague)
between the nodes of the source and result expressions,
as expressed through their ids

basic cases (leftovers, identified pairs)
a = a ([],      [(a,a)])
a = b ([a,b],   [])
1 = 1 ([],      [(1,1)])
+ a b = + b a ([], [(+,+),(a,a),(b,b)])
+1 +2 a b c = +3 a +4 b c ([], [(+1,+3),(+2,+4),(a,a),(b,b),(c,c)])
+ *1 a b *2 b c = *3 a + b c ([], [(+,+),(*1,*3),(*3,*3) (a,a),(b,b),(c,c)])
+ a - a = 0 ([], 

attempt: take side with most nodes. collect all heads/atoms in 2 lists,
order by (say) traversal order.
partition into clusters of same symbol, perserving relative order
match source/result clusters by symbol. if a symbol occurs in 1
but not the other, these are leftovers (all get root id?)
for clusters of the same var-class symbol, all of the nodes
in the combined source/result cluster are identified.
for the clusters of the same const-class symbol,
then match up the atoms in each cluster by traversal order.
pair these up. if there is an odd one, process it first, grouping it with first pair

so at the end we have:
leftovers: list of nodes
identified: list of pairs (or triples) of nodes

we then 
*/

// parition both symbol lists into clusters of same symbol
// preserving relative order

const parition_symbol_list_into_vars_and_consts = (
  symbols: pair_of_id_and_symbol[]
): [pair_of_id_and_symbol[], pair_of_id_and_symbol[]] => {
  return [
    symbols.filter((pair) => is_var_symbol(pair.symbol)),
    symbols.filter((pair) => !is_var_symbol(pair.symbol)),
  ];
};

/* given a map from ids to symbols, return a map from ids to ids,where each kind
   of symbol gets mapped to an Id. The same symbol always needs to be mapped to the same id.
   you'll need to keep track of seen symbols, with another map i guess.
   when you see a symbol for the first time, that id will become the id for that symbol. */
const make_id_to_id_map = (map: Map<Id.t, string>): Map<Id.t, Id.t> => {
  const res = new Map();
  const seen_symbols = new Map();
  for (const [id, symbol] of map) {
    const seen_id = seen_symbols.get(symbol);
    if (seen_id === undefined) {
      res.set(id, id);
      seen_symbols.set(symbol, id);
    } else res.set(id, seen_id);
  }
  return res;
};

const make_id_to_symbol_map = (
  pairs: pair_of_id_and_symbol[]
): Map<Id.t, string> => {
  const map = new Map();
  for (const pair of pairs) {
    map.set(pair.id, pair.symbol);
  }
  return map;
};

/* Try to match up identically-symbolled consts in pairs
   If there are differing amounts of a given symbol in
   both lists, all remainders are associated with the
   first pair with that symbol in the source */
const match_up_consts = (
  source_consts: pair_of_id_and_symbol[],
  result_consts: pair_of_id_and_symbol[]
): map_of_ids => {
  const res = new Map();
  while (source_consts.length > 0) {
    const source_pair = source_consts[0];
    const current_symbol = source_pair.symbol;
    const canonical_id = source_pair.id;
    const matches_in_source = source_consts.filter(
      (pair) => pair.symbol == current_symbol
    );
    const matches_in_results = result_consts.filter(
      (pair) => pair.symbol == current_symbol
    );
    const common_length = Math.min(
      matches_in_source.length,
      matches_in_results.length
    );
    /* Pair up all the consts of this symbol we can, in order */
    for (let i = 0; i < common_length; i++) {
      const source_id = matches_in_source[i].id;
      const result_id = matches_in_results[i].id;
      res.set(source_id, source_id);
      res.set(result_id, source_id);
    }
    /* For everything left over, map it to the canonical id (first id
       of that symbol in the source. This is basically for just for
       distributivity at the moment and hasn't been that thought out
       in general */
    for (let i = common_length; i < matches_in_source.length; i++) {
      res.set(matches_in_source[i].id, canonical_id);
    }
    for (let i = common_length; i < matches_in_results.length; i++) {
      res.set(matches_in_results[i].id, canonical_id);
    }
    /* Remove the elements matching Symbol from both lists */
    source_consts = source_consts.filter(
      (pair) => pair.symbol != current_symbol
    );
    result_consts = result_consts.filter(
      (pair) => pair.symbol != current_symbol
    );
  }
  return res;
};

const convert_inner = (s: Exp, r: Exp): res => {
  const source_symbols = extract_id_symbol_list(s);
  const result_symbols = extract_id_symbol_list(r);
  const [source_vars, source_consts] =
    parition_symbol_list_into_vars_and_consts(source_symbols);
  const [result_vars, result_consts] =
    parition_symbol_list_into_vars_and_consts(result_symbols);
  //console.log("source consts");
  // console.log(source_consts);
  // console.log("result consts");
  // console.log(result_consts);
  const combined_vars = [...source_vars, ...result_vars];
  const var_map = make_id_to_id_map(make_id_to_symbol_map(combined_vars));
  const const_map = match_up_consts(source_consts, result_consts);
  //console.log("const map");
  //console.log(const_map);
  const combined_map = new Map([...var_map, ...const_map]);
  const source = convert_exp_to_pat_getting_ids_from_map(s, combined_map);
  const result = convert_exp_to_pat_getting_ids_from_map(r, combined_map);
  return { source, result };
};

/* If the expression is rooted in binop =, treat
  lhs and rhs as source and result of a transformation */
export const convert = (e: Exp): res => {
  if (
    e.t == "Comp" &&
    e.kids.length == 3 &&
    e.kids[0].t == "Atom" &&
    e.kids[0].sym == "="
  )
    return convert_inner(e.kids[1], e.kids[2]);
  return "NotTool";
};

export const test = () => {
  console.log("test");
  console.log(convert(exp_comm_plus));
  console.log(convert(exp_assoc_plus));
  console.log(convert(exp_id_plus));
  console.log(convert(exp_inv_plus));
  console.log(convert(exp_double_neg));
  console.log(convert(exp_comm_times));
  console.log(convert(exp_assoc_times));
  console.log(convert(exp_id_times));
  console.log(convert(exp_dist_times_plus));
};
