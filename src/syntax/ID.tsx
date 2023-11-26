export type t = number;
export type ID = t;

var id_gen = 0;
export const mk = () => id_gen++;
