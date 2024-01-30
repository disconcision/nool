import { Exp, atom, comp } from "../syntax/Exp";

// ☁️ 🧩 🦷 🦠  🌸 🍄 🎲 🐝
// ➕ ➖ ✖️ ➗ 🟰 🌕 🌘 0️⃣ 1️⃣

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

export const _init:Exp = atom("❓");

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

const pv = (hd: string, tl: Exp) => comp([atom("."), atom(hd), tl]);

export const moons2: Exp = comp([
  atom("➕"),
  comp([
    atom("➕"),
    comp([
      atom("➕"),
      pv("🌘", atom("🌕")),
      comp([atom("➖"), pv("🌘", pv("🌕", pv("🌕", pv("🌕", atom("🌘")))))]),
    ]),
    pv("🌘", atom("🌕")),
  ]),
  comp([
    atom("➕"),
    comp([
      atom("✖️"),
      pv("🌘", pv("🌕", pv("🌘", atom("🌕")))),
      pv("🌘", atom("🌘")),
    ]),
  ]),
]);
