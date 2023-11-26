export const zip = <A, B>(a: A[], b: B[]): [A, B][] =>
  a.map((i, j) => [i, b[j]]);
