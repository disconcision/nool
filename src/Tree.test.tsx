import { matches, atom, comp, p_var, p_const, p_comp } from './Tree';

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