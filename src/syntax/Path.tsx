import * as ID from "./ID";

export type t = ID.t[];
export type Path = t;

export const eq = (p1: t, p2: t): boolean => {
  if (p1.length != p2.length) {
    return false;
  } else {
    return p1.every((value, index) => value === p2[index]);
  }
};
