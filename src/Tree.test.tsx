
import { Exp, erase, atom, comp} from './syntax/Exp';
import {  TransformResult,  matches, hydrate, transform,  p_var, p_const, p_comp } from './syntax/Pat';


describe("test matches", () => {
  it("atoms", () => {
    expect(matches(p_comp([]), comp([]))).toEqual([]);
    expect(matches(p_const('a'), atom('a'))).toEqual([]);
    expect(matches(p_const('a'), atom('b'))).toEqual('NoMatch');
    let tree_1 =  atom('b');
    let tree_2 = comp([atom('a'), atom('b')]);
    expect(matches(p_var('a'), tree_1)).toEqual([['a', tree_1]]);
    expect(matches(p_var('x'), tree_2)).toEqual([['x', tree_2]]);
  })
})

describe("test matches", () => {
  it("binary deconstruction", () => {
    let head = atom("+");
    let branch_1 = atom("1");
    let branch_2 = atom("2");
    let branch_3 = atom("3");
    let tree_1 = comp([head, branch_1, branch_2]);
    let pat_1 = p_comp([p_const('+'), p_var('a'), p_var('b')]);
    expect(matches(pat_1, tree_1)).toEqual([['a', branch_1], ['b', branch_2]]);

    let pat_2 = p_comp([p_var('+'), p_var('a'), p_var('b')]);
    expect(matches(pat_2, tree_1)).toEqual([['+', head], ['a', branch_1], ['b', branch_2]]);

    let tree_3 = comp([head, tree_1, branch_3]);
    let pat_3 = p_comp([p_const('+'), p_comp([p_const('+'), p_const('1'), p_var('b')]), p_var('c')]);
    expect(matches(pat_3, tree_3)).toEqual([['b', branch_2], ['c', branch_3]]);
  })
})

let expect_exp = (e_in:Exp, e_out:Exp)  =>
  expect(erase(e_in)).toEqual(erase(e_out));

describe("test hydrate", () => {
  it("basic hydration", () => {
    expect_exp(hydrate(p_var('a'), []), atom('a'));
    expect_exp(hydrate(p_const('a'), [['a', atom('1')]]), atom('a'));
    expect_exp(hydrate(p_var('a'), [['a', atom('1')]]), atom('1'));
    // duplicate bindings use first for now
    expect_exp(hydrate(p_var('a'), [['a', atom('1')],['a', atom('2')]]), atom('1'));
    expect_exp(
      hydrate(
        p_comp([p_const('+'), p_var('a'), p_var('b')]),
        [['a', atom('1')], ['b', atom('2')]]),
      comp([atom('+'), atom('1'), atom('2')]));
    expect_exp(
      hydrate(
          p_comp([p_const('+'), p_var('a'), p_comp([p_var('b'), p_var('c')])]),
          [['a', atom('1')], ['c', atom('2')]]),
        comp([atom('+'), atom('1'), comp([atom('b'), atom('2')])]));   
  })
});

describe("test root transform", () => {
  let expect_exp = (e_in:TransformResult, e_out:TransformResult)  =>
  expect(((e_in=='NoMatch')?'NoMatch':erase(e_in))).toEqual(((e_out=='NoMatch')?'NoMatch':erase(e_out)));
  it("transform degenerate cases", () => {
    expect_exp(transform(atom('1'),p_var('a'), p_var('b')), atom('b'));
    expect_exp(transform(atom('1'),p_const('1'), p_var('c')), atom('c'));
    expect_exp(transform(atom('1'),p_const('2'), p_var('d')), 'NoMatch');
  })
  
  it("end to end transform basic", () => {
    expect_exp(transform(atom('1'),p_var('a'), p_var('a')), atom('1'));
    expect_exp(transform(atom('1'),p_const('b'), p_var('b')), 'NoMatch');
  })

  it("end to end commutativity +", () => {
    expect_exp(
      transform(
        comp([atom('+'), atom('1'), atom('2')]),
        p_comp([p_const('+'), p_var('a'), p_var('b')]),
        p_comp([p_const('+'), p_var('b'), p_var('a')])),
      comp([atom('+'), atom('2'), atom('1')]));
  })

  it("end to end associativity +", () => {
      expect_exp(
        transform(
          comp([atom('+'), atom('1'), comp([atom("+"),atom('2'), atom('3')])]),
          p_comp([p_const('+'), p_var('a'), p_comp([p_const('+'), p_var('b'), p_var('c')])]),
          p_comp([p_const('+'), p_comp([p_const('+'), p_var('a'), p_var('b')]), p_var('c')])),
        comp([atom('+'), comp([atom('+'), atom('1'), atom('2')]), atom('3')]));
  })
});