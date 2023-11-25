
export type ID = number;

export type Node<T> =
  | { t: "Atom"; id: ID; sym: T }
  | { t: "Comp"; id: ID; kids: Node<T>[] };

export type Path = ID[];

export const path_eq = (p1: Path, p2: Path): boolean => {
  if (p1.length != p2.length) {
    return false;
  } else {
    return p1.every((value, index) => value === p2[index]);
  }
}

var id_gen = 0;
export const new_id = () => id_gen++;
