import * as ID from "./ID";

export type t = ID.t[];
export type Path = t;

export const empty: t = [];

export const eq = (p1: t, p2: t): boolean => {
  if (p1.length != p2.length) {
    return false;
  } else {
    return p1.every((value, index) => value === p2[index]);
  }
};

export const doesp1startwithp2 = (p1: t, p2: t): boolean => {
  if (p1.length < p2.length) {
    return false;
  } else {
    return p2.every((value, index) => value === p1[index]);
  }
};
