import * as Tone from "tone";
import pew from "./assets/sfx/pew.m4a";
import pshew from "./assets/sfx/pshew.m4a";
import klohk from "./assets/sfx/klohk.m4a";
import chchiu from "./assets/sfx/chchiu-out.wav";
import shwoph from "./assets/sfx/shwo-ph-out.wav";
import tiup from "./assets/sfx/tiup-comm-out.wav";

let revsfx = new Tone.Reverb({ decay: 4, wet: 0.3 }).toDestination();

export type Sfxbank = "pew" | "pshew" | "klohk" | "chchiu" | "shwoph" | "tiup";

const player_pew = new Tone.Player(pew).toDestination().connect(revsfx);
player_pew.playbackRate = 1.3;
const player_pshew = new Tone.Player(pshew).toDestination().connect(revsfx);
player_pshew.playbackRate = 1.3;
const player_klohk = new Tone.Player(klohk).toDestination().connect(revsfx);
const player_chchiu = new Tone.Player(chchiu).toDestination().connect(revsfx);
//let ps = new Tone.PitchShift(-3).toDestination();
//player_chchiu.connect(ps);
player_chchiu.playbackRate = 1.7;
const player_shwoph = new Tone.Player(shwoph).toDestination().connect(revsfx);
player_shwoph.playbackRate = 1.7;
const player_tiup = new Tone.Player(tiup).toDestination().connect(revsfx);
player_tiup.volume.value = -12;

const sfx_bank = (sfx: Sfxbank): Tone.Player =>
  ({
    tiup: player_tiup,
    shwoph: player_shwoph,
    chchiu: player_chchiu,
    klohk: player_klohk,
    pew: player_pew,
    pshew: player_pshew,
    
  }[sfx]);

export const sfx = (sfx: Sfxbank) => () => {
  let p = sfx_bank(sfx);
  p.reverse = false;
  p.start();
};

export const sfx_reverse = (sfx: Sfxbank) => () => {
  let p = sfx_bank(sfx);
  p.reverse = true;
  p.start();
};

/* # Drag plucks — quantized chords as a drag crosses the quarter points
 * of its rail, dropped an octave when it recedes. Drags speak in plucks;
 * the rewrite samples are button-mode sounds. (Chosen over granular
 * sample-scrubbing, detents, and a tension layer — all tried,
 * 2026-07-30.)
 *
 * Pluck CONTENT is the rule's operator multiset (see design/sound.md):
 * each operator symbol has a pitch class — the sound ALPHABET, the one
 * axiomatic choice; everything above it derives. A rule's quarter-point
 * plucks walk its content from source to result: ¼ = source multiset,
 * ½ = the invariant core (source ∩ result), ¾ = result multiset.
 * Multiplicity stacks octaves ("associativity has two pluses" is the
 * plus-note doubled), created content audibly arrives, consumed content
 * departs, and flip swaps the walk. Advancing plucks crescendo;
 * receding replays the chord an octave down, quieter. */
const OP_PITCH: Record<string, string> = { "➕": "C", "✖️": "G", "➖": "Eb" };
const OP_FALLBACK = "D"; // operators outside the alphabet
const EMPTY_NOTE = "A3"; // the bare-variable world: no structure yet
const OCTAVES = [4, 5, 3, 6]; // multiplicity → octave stacking

const op_note = (op: string): string => OP_PITCH[op] ?? OP_FALLBACK;

const chord_of = (ops: string[]): string[] => {
  if (ops.length === 0) return [EMPTY_NOTE];
  const sorted = [...ops].sort(
    (a, b) => op_note(a).localeCompare(op_note(b)) || a.localeCompare(b)
  );
  const counts = new Map<string, number>();
  return sorted.map((op) => {
    const n = counts.get(op) ?? 0;
    counts.set(op, n + 1);
    return `${op_note(op)}${OCTAVES[Math.min(n, OCTAVES.length - 1)]}`;
  });
};

/* multiset intersection */
const isect = (a: string[], b: string[]): string[] => {
  const rest = [...b];
  return a.filter((x) => {
    const i = rest.indexOf(x);
    if (i < 0) return false;
    rest.splice(i, 1);
    return true;
  });
};

/* # Harmony experiment (Shift+A toggles): layer the retired quality
 * channel back UNDER the content chords — one added note, a third above
 * each chord's root: major (4 semitones) when the rewrite grows, minor
 * (3) when it shrinks, none when isomorphic. The content letters are
 * untouched; the third only colors the mood. */
let harmonized = false;
export const toggle_harmony = (): string =>
  (harmonized = !harmonized) ? "content+harmony" : "content";

const SEMI_OF: Record<string, number> = {
  C: 0, "C#": 1, Db: 1, D: 2, Eb: 3, E: 4, F: 5,
  "F#": 6, Gb: 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11,
};
const SEMI_NAMES = ["C","C#","D","Eb","E","F","F#","G","Ab","A","Bb","B"];
const transpose = (note: string, semis: number): string => {
  const m = note.match(/^([A-G][b#]?)(\d)$/);
  if (!m) return note;
  const midi = SEMI_OF[m[1]] + 12 * (+m[2] + 1) + semis;
  return `${SEMI_NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
};

let drag_active = false;
let drag_last_t = 0;
let pluck_chords: string[][] = [];

const pluck = (notes: readonly string[], vol: number): void => {
  synth.volume.value = vol;
  synth.triggerAttackRelease(notes as string[], "64n");
};

const octave_down = (n: string): string => n.replace(/\d/, (d) => `${+d - 1}`);

const PLUCK_TS = [0.25, 0.5, 0.75];
const PLUCK_VOLS = [-20, -17, -14]; // crescendo toward commit

export const drag_sound_start = (
  source_ops: string[],
  result_ops: string[]
): void => {
  drag_active = true;
  drag_last_t = 0;
  pluck_chords = [
    chord_of(source_ops),
    chord_of(isect(source_ops, result_ops)),
    chord_of(result_ops),
  ];
  if (harmonized) {
    const delta = result_ops.length - source_ops.length;
    if (delta !== 0)
      pluck_chords = pluck_chords.map((c) => [
        ...c,
        transpose(c[0], delta > 0 ? 4 : 3),
      ]);
  }
};

export const drag_sound_set = (t: number): void => {
  if (!drag_active) return;
  const tt = Math.max(0, Math.min(1, t));
  /* A jump can cross several thresholds in one call (the Snap mechanic
   * lands on t=1 from anywhere). Voice only the last chord crossed:
   * stacked same-instant plucks re-trigger shared voices at an identical
   * start time, which Tone rejects with an uncaught error. */
  let advancing = -1;
  let receding = -1;
  PLUCK_TS.forEach((th, i) => {
    if (drag_last_t < th && tt >= th) advancing = i;
    if (drag_last_t >= th && tt < th) receding = i;
  });
  if (advancing >= 0) pluck(pluck_chords[advancing], PLUCK_VOLS[advancing]);
  else if (receding >= 0) pluck(pluck_chords[receding].map(octave_down), -24);
  drag_last_t = tt;
};

export const drag_sound_stop = (): void => {
  drag_active = false;
  drag_last_t = 0;
};

const player = new Tone.Player(pew).toDestination();
let rev2 = new Tone.Reverb(2).toDestination();
player.connect(rev2);

const synth = new Tone.PolySynth(Tone.Synth).toDestination();
//const distortion = new Tone.Distortion(0.4).toDestination();
//synth.connect(distortion);
/*var phaser = new Tone.Phaser({
	"frequency" : 350,
	"octaves" : 4,
	"baseFrequency" : 500
}).toDestination();
synth.connect(phaser);*/
let rev = new Tone.Reverb(10).toDestination();
synth.connect(rev);

let tremolo = new Tone.Tremolo(70, 1.0).toDestination().start();
synth.connect(tremolo);

/* # The bong — striking the seed (the ∞ between the boxes), a demo's
 * closing touchstone. A deep membrane boom on C — the pluck alphabet's
 * root — with the alphabet's open fifth (C+G: plus and times) chiming
 * above it, left to ring through a long tail. */
const bong_verb = new Tone.Reverb({ decay: 6, wet: 0.5 }).toDestination();
const bong_drum = new Tone.MembraneSynth({
  pitchDecay: 0.09,
  octaves: 7,
  envelope: { attack: 0.001, decay: 1.1, sustain: 0.01, release: 1.6 },
}).toDestination();
bong_drum.connect(bong_verb);
bong_drum.volume.value = -2;
const bong_chime = new Tone.PolySynth(Tone.Synth, {
  envelope: { attack: 0.004, decay: 1.2, sustain: 0.04, release: 2.5 },
}).toDestination();
bong_chime.connect(bong_verb);
bong_chime.volume.value = -16;

export const bong = (): void => {
  const now = Tone.now();
  bong_drum.triggerAttackRelease("C2", "2n", now);
  bong_chime.triggerAttackRelease(["C4", "G4"], "1n", now + 0.02);
};
//let vib = new Tone.Vibrato ( 10,0.3 ).toDestination();
//synth.connect(vib);

export const mk = (note: string, duration: string) => () =>
  synth.triggerAttackRelease(note, duration);

const number_to_letter = (n: number): string => {
  const letters = "ACFBDG";
  return letters[n % letters.length];
};

export const select = (depth: number, pitch:number, volume:number) => {
  //const chorus = new Tone.Chorus(4, 2.5, 0.5).toDestination().start();
  //synth.connect(chorus);
  //const cheby = new Tone.Chebyshev(2).toDestination();
  //synth.connect(cheby);
  synth.volume.value = volume;
  synth.triggerAttackRelease([number_to_letter(depth) + pitch], "32n");
};

export const unselect = (note: string, volume:number) => {
  //const chorus = new Tone.Chorus(4, 2.5, 0.5).toDestination().start();
  //synth.connect(chorus);
  //const cheby = new Tone.Chebyshev(2).toDestination();
  //synth.connect(cheby);
  synth.volume.value = volume;
  synth.triggerAttackRelease([note], "8n");
};

export const noop = () => synth.triggerAttackRelease("F1", "32n");
