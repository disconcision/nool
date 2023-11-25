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
};

/*export const id_at = (p: Path, n: Node<any>): ID => {
  switch (n.t) {
    case "Atom":
      return n.id;
    case "Comp":
      let [hd, ...tl] = p;
      return id_at(tl, n.kids[hd]);
  }
};*/

var id_gen = 0;
export const new_id = () => id_gen++;
