
export type ID = number;

export type Node<T> =
  | { t: "Atom"; id: ID; sym: T }
  | { t: "Comp"; id: ID; kids: Node<T>[] };

export type Path = ID[];

var id_gen = 0;
export const new_id = () => id_gen++;
