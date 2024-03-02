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

// ▨ ䷀ ䷂ ᖛᙊ ࢥ Ꭳ ◵
export const init: Exp = comp([
  atom("䷶"),
  comp([atom("ᖛ"), alg]),
  comp([atom("ᙊ"), moons]),
  comp([atom("ᝏ"), lab]),
]);
