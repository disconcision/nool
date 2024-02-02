import { Exp, atom, comp, flat } from "../syntax/Exp";
import { empty } from "../syntax/Path";

// ☁️ 🧩 🦷 🦠  🌸 🍄 🎲 🐝
// ➕ ➖ ✖️ ➗ 🟰 🌕 🌘 🌑 0️⃣ 1️⃣ ❓

const B = flat("ɖ");

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
  comp([
    atom("➕"),
    comp([
      atom("➕"),
      B(["🌘", "🌑"]),
      comp([atom("➕"), B(["🌘", "🌑", "🌑", "🌑", "🌘"]), atom("🌘")]),
    ]),
    B(["🌘", "🌑"]),
  ]),
  comp([atom("✖️"), B(["🌘", "🌑", "🌘", "🌑"]), B(["🌘", "🌘"])]),
]);

export const init: Exp = comp([atom("䷶"), alg, moons, lab]);
