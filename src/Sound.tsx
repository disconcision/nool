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
};

export const drag_sound_set = (t: number): void => {
  if (!drag_active) return;
  const tt = Math.max(0, Math.min(1, t));
  PLUCK_TS.forEach((th, i) => {
    if (drag_last_t < th && tt >= th) pluck(pluck_chords[i], PLUCK_VOLS[i]);
    if (drag_last_t >= th && tt < th)
      pluck(pluck_chords[i].map(octave_down), -24);
  });
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
