import { Exp, atom, comp, flat } from "../syntax/Exp";
import * as Symbols from "../data/Symbols";

// ☁️ 🧩 🦷 🦠  🌸 🍄 🎲 🐝
// ➕ ➖ ✖️ ➗ 🟰 🌕 🌘 🌑 0️⃣ 1️⃣ ❓

const B = flat(Symbols.digit);

export const alg: Exp = comp([
  atom("➕"),
  comp([
    atom("➕"),
    comp([atom("➕"), atom("☁️"), comp([atom("➖"), atom("🍄")])]),
    atom("🍄"),
  ]),
  comp([
    atom("➕"),
    comp([atom("✖️"), atom("🎲"), atom("🦠")]),
    comp([atom("✖️"), atom("🎲"), atom("🐝")]),
  ]),
]);

const lab: Exp = comp([atom("➕"), atom("❓"), atom("❓")]);

const moons: Exp = comp([
  atom("➕"),
  comp([atom("➕"), B(["🌘", "🌘", "🌑", "🌑", "🌘"]), B(["🌘", "🌑", "🌘"])]),
  comp([
    atom("➕"),
    comp([atom("➕"), atom("🌘"), atom("🌘")]),
    comp([atom("➕"), atom("🌘"), comp([atom("➕"), atom("🌘"), atom("🌘")])]),
  ]),
]);

const let_exp = (pat: Exp, def: Exp, body: Exp): Exp =>
  comp([atom("let"), pat, atom("="), def, atom("in"), body]);

const fun_exp = (pat: Exp, body: Exp): Exp =>
  comp([atom("fun"), pat, atom("->"), body]);

const var_exp = (name: string): Exp => atom(name);

const app_exp = (fun: Exp, arg: Exp): Exp =>
  comp([fun, atom("("), arg, atom(")")]);

const if_exp = (cond: Exp, then: Exp, els: Exp): Exp =>
  comp([atom("if"), cond, atom("then"), then, atom("else"), els]);

const code: Exp = let_exp(
  var_exp("x"),
  atom("1️"),
  app_exp(var_exp("f"), var_exp("x"))
);

// ▨ ䷀ ䷂ ᖛ ᙊ ࢥ Ꭳ ◵
export const init: Exp = comp([
  atom("䷶"),
  comp([atom("ᖛ"), alg]),
  comp([atom("ᙊ"), moons]),
  comp([atom("◵"), code]),
  comp([atom("ᝏ"), lab]),
]);
