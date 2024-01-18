import { Exp, atom, comp } from "./syntax/Exp";

// 🦷 🦠 🧩 🌸 ✖️ 🌘 🌕 0️⃣

export const init: Exp = comp([
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

export const moons: Exp = comp([
  atom("➕"),
  comp([
    atom("➕"),
    comp([atom("➕"), atom("🌘🌕"), comp([atom("➖"), atom("🌘🌕🌕🌕🌘")])]),
    atom("🌘🌕 "),
  ]),
  comp([
    atom("➕"),
    comp([atom("✖️"), atom("🌕"), atom("🌘")]),
    comp([atom("✖️"), atom("🌘🌕🌘🌕 "), atom("🌘🌘")]),
  ]),
]);