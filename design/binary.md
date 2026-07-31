# Binary moon arithmetic — plan

Port of the world-tree branch's binary numerals onto the post-draggable
architecture. The world-tree versions (Tools.tsx, Statics.tsx, ExpView
digit rendering on that branch) are the reference prototype; nothing is
merged from there, everything is re-landed deliberately.

## What this is (keep this characterization)

The digit operator ɖ is **Horner-form digit-cons**: a two-place
constructor whose value is `value(B(rest, d)) = 2·value(rest) + d`.
Iterating it builds positional notation the same way Coq's `positive`
type does — numerals as an inductive structure, one digit per layer.
It is "a times and a plus with the right associativity" made into a
single operator: B(a, b) ≡ a·2 + b, with the ·2 and the + fused and
hidden. Positional notation in ordinary mathematics is *already* an
invisible operator; ɖ just makes it a node.

Because nool is an untyped term algebra, nothing restricts digit
positions to digits. That is a feature, not a leak: **"numeral" is a
normal-form predicate, not a type.** Intermediate states where a
position holds `🌘➕🌘` are the visible mechanics of carrying — the
pedagogy is watching them normalize away. Types, if they ever enter,
enter at a different level of abstraction; the classifier below is
display/logic delineation, not typing.

## Decision: snoc convention (this is the fix)

The world-tree rules mixed two conventions and one rule (b_thm_1) was
arithmetically wrong under the convention the others used. Resolution:
**left-nested (snoc) chains, most significant digit innermost, kid
order = reading order.**

- `B(rest, d)` = rest·2 + d. The nested part is first, the new low
  digit second, so a chain displays MSB-first like ordinary notation.
- Chains bottom out in a bare digit atom (the leading digit); no nil.
- `flat` folds LEFT over the digit list (world-tree's folds right).
- Carries propagate right-to-left, as in school arithmetic.

Rule set under snoc (two = B(🌘, 🌑), reads "10"):

| name | rule | reading |
|---|---|---|
| b_def_0 | 🌘 ➕ 🌘 → B(🌘, 🌑) | one plus one is "10" |
| b_def_1 | B(a, b) → (a ✖️ two) ➕ b | the definition (Horner step) |
| b_thm_0 | B(a, 🌘) → B(a, 🌑) ➕ 🌘 | peel the low 1-bit |
| b_thm_1 | B(a, 🌑) → a ✖️ two | trailing zero = doubling |
| b_thm_2 | B(a, 🌑) ➕ B(b, c) → B(a ➕ b, c) | column add, no carry |
| b_thm_3 | B(a, 🌘) ➕ B(b, 🌘) → B((a ➕ b) ➕ 🌘, 🌑) | column add, carry |

All six verified against value semantics. Note b_thm_1 is exactly the
rule as originally written on world-tree — it was correct all along
*under this convention*; the branch's other rules were the ones in cons.
This set plus commute/associate/identity of ➕ suffices to add arbitrary
normalized numerals (checked by hand: 11₂+11₂ derives 110₂; the +1
absorption goes through reversed b_thm_0).

Normal form: every position a digit atom, and the leading (innermost)
digit is 🌘 — except the numeral 🌑 itself.

## Classification, not statics (what world-tree's "statics" was)

World-tree's Statics grew a `cls` per node — Room / File / Delim /
Math(Const|UnOp|BinOp|Digits|Free) / Code(Let|Fun|App|If) — computed
structurally (head symbol + arity against symbol sets in
data/Symbols.tsx) into the InfoMap, consumed by the view for layout
(digit flattening, code delimiter styling) and by Exp.width. It was
never a type system: it's a **read-only classifier driving display and
logic gating**. That's the right scope here too. Plan:

- `Statics.cls`: bring over the Math forms (+ Digits) only; Room/File
  and Code forms come with their own features, not this one.
- View reads cls, not string equality on "ɖ" (world-tree ExpView and
  ToolsView both hard-matched the symbol; centralize in the classifier).
- Add `is_normal_numeral` as a classifier judgment for styling normal
  vs mid-carry numerals differently, and later for level goals.

## Rendering & interaction

- Digit chains render linearized: heads (ɖ) dropped, chain flattened to
  a digit row (CSS strips node chrome inside `.digits`, as world-tree
  did — port those rules onto the current stylesheet, they're small).
- The nested comps are still real nodes: selection, grabs, and morphs
  need no special handling — a digit chain is an ordinary right?-left-
  nested comp to Motion and Drag. Verify grip derivation (pattern-level
  moverhood) does something sensible for digit patterns.
- Toolbox: same flattening for ɖ-headed pats (world-tree's ToolsView
  did this; re-derive from cls).
- Sound: give ɖ a pitch class in the drag-pluck alphabet (OP_PITCH —
  currently ➕ C, ✖️ G, ➖ Eb; unlisted ops fall back to D). Suggest an
  explicit choice so digit rules don't all sound like fallback.

## Ergonomics ladder

The def rules are slow on purpose; the thm rules are the compressed
steps. The expected long-run answer to "carry chains are tedious" is
the macro system: demonstrate a carry once, derive the composite rule
(see the dragology tree-macro demo's derive-by-diff), keep it in
inventory. Until then, the thm rules + a binary folder in the noolbox
are the ergonomic floor. Loadout note: binary rules should ship as a
group (folder) that can be enabled per-world/per-file.

## Staging

1. Land rules + digit rendering + classifier behind the existing
   loadout toggles, with a moons example reachable (interim: a second
   world exp or swap; properly: world-tree multiplicity, see TODO).
2. Fold interplay (once folds land): a folded numeral is a single
   rigid layer to Motion; rule matching inside folds gated per the
   fold-semantics decision (folding signals keep-whole intent —
   variables may bind a folded subtree; structural matches inside a
   fold either don't fire or must break the fold).
3. Later: base-parametric ɖ (decimal), digit strings as polynomial
   coefficient lists (replace 2 by a variable) — same operator, more
   worlds.
