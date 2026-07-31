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

/* # Drag plucks — quantized notes as a drag crosses the quarter points
 * of its rail, descending (lower octave) when it recedes. Drags speak in
 * plucks; the rewrite samples are button-mode sounds. (Chosen over
 * granular sample-scrubbing, detents, and a tension layer — all tried,
 * 2026-07-30.)
 *
 * Chord quality carries the rewrite's STRUCTURAL EFFECT, derived from
 * its patterns (nothing hand-assigned): isomorphic rearrangements pluck
 * open fifths (nothing created or destroyed), growing rewrites a major
 * triad, shrinking a minor one. flip swaps the patterns, so a reversed
 * rule automatically sounds like its forward form's harmonic opposite. */
export type DragQuality = "iso" | "grow" | "shrink";
const TRIADS: Record<DragQuality, [string, string, string]> = {
  iso: ["C4", "G4", "C5"],
  grow: ["C4", "E4", "G4"],
  shrink: ["C4", "Eb4", "G4"],
};
let drag_active = false;
let drag_last_t = 0;
let pluck_up: readonly string[] = TRIADS.iso;

const pluck = (note: string, vol: number): void => {
  synth.volume.value = vol;
  synth.triggerAttackRelease(note, "64n");
};

const octave_down = (n: string): string => n.replace(/\d/, (d) => `${+d - 1}`);

const PLUCK_TS = [0.25, 0.5, 0.75];

export const drag_sound_start = (quality: DragQuality): void => {
  drag_active = true;
  drag_last_t = 0;
  pluck_up = TRIADS[quality];
};

export const drag_sound_set = (t: number): void => {
  if (!drag_active) return;
  const tt = Math.max(0, Math.min(1, t));
  PLUCK_TS.forEach((th, i) => {
    if (drag_last_t < th && tt >= th) pluck(pluck_up[i], -16);
    if (drag_last_t >= th && tt < th) pluck(octave_down(pluck_up[i]), -22);
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
