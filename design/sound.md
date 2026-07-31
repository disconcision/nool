# Sound design (drag-era)

Principle: each MEANING owns one AUDIO CHANNEL, so the sound system
stays legible as it grows — the ear reads pitch register as one thing,
chord quality as another, pan as another, without cross-talk.

## Channel assignments

| channel        | meaning                          | status            |
|----------------|----------------------------------|-------------------|
| register       | tree depth (select sound pitch)  | landed (pre-drag) |
| contour        | drag direction (advance/recede)  | landed            |
| pitch content  | the rule's operator multisets    | landed 2026-07-30 |
| dynamics       | crescendo toward commit          | landed 2026-07-30 |
| pan            | drag direction on screen         | open (sketched)   |
| timbre         | (unassigned)                     | open              |

(An earlier chord-quality channel — iso/grow/shrink triads from the
size delta, ladder rung 1 — was landed then superseded the same day by
rung 2: the multiset makes grow/shrink audible as content arriving or
departing, and says WHICH operator changed.)

## Decisions (2026-07-30)

- **Drags speak in plucks; the rewrite samples are button-mode sounds.**
  Verdict of a six-way bake-off (granular scrub of the commit sample,
  scrub-only, mechanical detents, tension noise, plucks, commit-only —
  all built behind a Shift+A cycle, since removed). The scrub read as
  stuck tape; plucks won. Grammar: quantized notes at the rail's
  quarter points, ascending advancing, dropped an octave receding — so
  a completed rising figure IS the commit signal and a revert walks
  back down. No separate commit accent (the octave-completing note is
  the natural addition if one is ever wanted).
- **Chord quality = structural effect, derived from the patterns.**
  size(result) − size(source): isomorphic rearrangements (commute,
  associate) pluck open fifths — nothing created or destroyed; growing
  rewrites a major triad; shrinking ones minor. Nothing hand-assigned;
  new rules get sounds automatically; and since flip swaps the
  patterns, a reversed rule is automatically its forward form's
  harmonic opposite. The sound algebra inherits the rewrite algebra.
- Drag commits play NO sample (deliberate — see Update.sound comment).
- Undo/redo are currently silent (open: should they speak? A candidate:
  the pluck contour of the undone rule, receding).

## The derivation ladder (how "non-arbitrary" gets deeper)

Each rung subsumes the previous; all derive the sound from the rule's
own patterns, pushing the axiomatic (hand-chosen) part smaller:

1. **Size delta** (landed, then superseded by 2): iso / grow / shrink
   → chord quality.
2. **Operator multiset** (landed 2026-07-30): the multiset of operators
   (comp heads) in the patterns. Alphabet: ➕→C, ✖️→G, ➖→Eb, other→D,
   ∅→A3 (the bare-variable world). The quarter-point plucks walk the
   content source → result: ¼ = source multiset, ½ = the invariant core
   (∩), ¾ = result — created content audibly arrives near commit,
   consumed content departs. Multiplicity stacks octaves (associate =
   the plus-note doubled). Advancing plucks crescendo; receding drops
   the chord an octave, quieter.
   Distinguishes what 1 cannot: commute_plus is {+} but associate_plus
   is {+,+} — "associativity has two pluses" becomes literally audible
   (multiplicity → octave doubling or repetition). Distinguishes
   families too (plus-rules vs times-rules vs mixed: distribute is
   {×,×,+} ⇄ {×,+}). The multiset CHANGES across a rewrite, so the
   drag can sonify the delta (identity-intro: a + note fades in).
   Axiomatic residue: one pitch class per operator symbol — a small
   "sound alphabet" (like a color basis); everything else derives. The
   alphabet carries forward unchanged if rung 3 lands.
3. **Pattern melody** (stretch): walk the result pattern in reading
   order — operator → its alphabet pitch, variables → scale degrees,
   depth → octave, quantized to a consonant scale. Each rule's motif IS
   its pattern: distribute's repeated variable is a repeated note,
   commute's figure is its operand order reversed. Subsumes 2 (the
   multiset is the melody's pitch content, unordered). Risk: derived
   motifs sounding like a modem; needs scale-quantization discipline.

Current toolbox operator multisets (source ⇄ result), for reference:
commute+ {+}⇄{+} · assoc+ {+,+}⇄{+,+} · identity+ {}⇄{+} ·
inverse+ {}⇄{+,−} · dbl-neg {}⇄{−,−} · commute× {×}⇄{×} ·
assoc× {×,×}⇄{×,×} · identity× {}⇄{×} · distribute {×,+}⇄{×,×,+}

Known asymmetry to listen for: shrinking rules lose their content at
the ½ pluck (∩ = the smaller multiset) while growing rules gain theirs
at ¾ — factoring "finishes early" sonically. If that grates, walking
½ linearly source → result instead of through the intersection is a
one-line change. Also queued: pan (below); a commit accent (the
octave-completing fourth pluck) if the completed-triad-as-commit-signal
ever feels insufficient.

## Harmony experiment (Shift+A, evaluating)

Layers the retired quality channel back UNDER the content chords: one
added note, a third above each chord's root — major (4 semitones) when
the rewrite grows, minor (3) when it shrinks, none when isomorphic
(open/hollow stays open). Content letters untouched; the third only
colors the mood. Off by default ("content"); Shift+A toggles
("content+harmony"), logged to console. Keep or delete after listening.

## Pan (concept 3, sketched)

Stereo pan per pluck = the active rail's horizontal direction
(normalized dx). Geometry channel, deliberately projection-relative:
the ear hears WHERE the gesture goes, pitch says WHAT it does. One
Panner node; per-pluck, not continuous.

## Angle→pitch, rejected

Mapping rail angle to pitch was considered and rejected: the same rule
drags at different angles in different projections, so identity would
be projection-dependent. Geometry belongs on pan, identity on pitch.
