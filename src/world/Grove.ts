/* The grove: hand-made expressions that populate the world, ranging from
 * bare atoms to something a bit bigger than the sandbox's seed. Operator
 * arities follow data/World.tsx: ➕/✖️ binary, ➖ unary. */

import { Exp, atom, comp } from "../syntax/Exp";

const plus = (a: Exp, b: Exp): Exp => comp([atom("➕"), a, b]);
const times = (a: Exp, b: Exp): Exp => comp([atom("✖️"), a, b]);
const neg = (a: Exp): Exp => comp([atom("➖"), a]);

/* smallest to largest; assigned to scattered sites in cycle */
export const varieties: Exp[] = [
  atom("🍄"),
  atom("🐝"),
  plus(atom("🌸"), atom("🐝")),
  times(atom("🎲"), atom("🍄")),
  plus(atom("☁️"), neg(atom("🦠"))),
  plus(times(atom("🎲"), atom("🌸")), times(atom("🎲"), atom("🦷"))),
  times(plus(atom("🍄"), atom("🍄")), neg(atom("🐝"))),
  plus(plus(atom("🧩"), neg(atom("🧩"))), times(atom("🦠"), atom("🎲"))),
];

/* the pass-blocker: a bit bigger than the sandbox seed */
export const gate: Exp = plus(
  plus(
    times(plus(atom("☁️"), atom("🍄")), atom("🎲")),
    neg(times(atom("🐝"), atom("🐝")))
  ),
  plus(
    times(atom("🦠"), plus(atom("🌸"), neg(atom("🌸")))),
    plus(times(atom("🎲"), atom("🦷")), neg(atom("☁️")))
  )
);
