export type t = number;
export type ID = t;

var id_gen = 0;
export const mk = () => id_gen++;

/* persistence: restored exps carry minted ids — the counter must resume
 * past them or fresh mints would collide */
export const current = (): t => id_gen;
export const bump = (n: t): void => {
  if (n > id_gen) id_gen = n;
};
