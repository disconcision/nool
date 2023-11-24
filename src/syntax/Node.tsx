export type Node<T> =
  | { t: "Atom"; id: number; sym: T }
  | { t: "Comp"; id: number; kids: Node<T>[] };

export type Path = number[];

var id_gen = 0;
export const new_id = () => id_gen++;
