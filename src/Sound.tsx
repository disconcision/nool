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

/* # Drag scrub — a granular playhead over the transform's own sample.
 * The rail parameter drives the position of a small looping grain
 * window, so dragging literally scrubs the rewrite's commit sound:
 * it unfolds as you pull, retreats as you back off, and reversed
 * candidates traverse it backwards (position mirror — cheaper than
 * re-reversing the buffer). Own GrainPlayers with own buffers so the
 * commit Players' reverse-toggling never cross-talks. */
const mk_scrub = (url: string): Tone.GrainPlayer => {
  const p = new Tone.GrainPlayer({
    url,
    loop: true,
    grainSize: 0.12,
    overlap: 0.08,
  }).toDestination();
  p.connect(revsfx);
  p.volume.value = -24;
  return p;
};
const scrub_players: Record<Sfxbank, Tone.GrainPlayer> = {
  pew: mk_scrub(pew),
  pshew: mk_scrub(pshew),
  klohk: mk_scrub(klohk),
  chchiu: mk_scrub(chchiu),
  shwoph: mk_scrub(shwoph),
  tiup: mk_scrub(tiup),
};
let scrubbing: Tone.GrainPlayer | null = null;
let scrub_rev = false;

const scrub_start = (bank: Sfxbank, reversed: boolean): void => {
  scrub_stop();
  const p = scrub_players[bank];
  if (!p.loaded) return;
  scrub_rev = reversed;
  scrubbing = p;
  p.volume.value = -24;
  p.start();
};

const scrub_set = (t: number): void => {
  if (!scrubbing) return;
  const dur = scrubbing.buffer.duration;
  const win = Math.min(0.15, dur / 3);
  const tt = Math.max(0, Math.min(1, t));
  const pos = (scrub_rev ? 1 - tt : tt) * Math.max(0, dur - win);
  scrubbing.loopStart = pos;
  scrubbing.loopEnd = pos + win;
  /* swell toward the commit point */
  scrubbing.volume.value = -24 + 14 * tt;
};

const scrub_stop = (): void => {
  if (!scrubbing) return;
  const p = scrubbing;
  scrubbing = null;
  /* fade before stopping so the grains don't clip off */
  p.volume.rampTo(-60, 0.08);
  window.setTimeout(() => p.stop(), 120);
};

/* # Drag sound modes — experiments, cycled with Shift+A (see App.tsx).
 *  scrub       granular playhead over the commit sample + sample on commit
 *  scrub-only  the scrub IS the sound; commit adds nothing
 *  detents     mechanical ticks: rail acquired, commit-threshold armed /
 *              disarmed; full sample on commit
 *  tension     filtered noise rising with t; full sample on commit
 *  plucks      quantized notes at t = ¼, ½, ¾ (descending when receding);
 *              full sample on commit
 *  commit-only just the sample on commit (pre-experiment baseline) */
export type DragSoundMode =
  | "scrub"
  | "scrub-only"
  | "detents"
  | "tension"
  | "plucks"
  | "commit-only";
const DRAG_SOUND_MODES: DragSoundMode[] = [
  "scrub",
  "scrub-only",
  "detents",
  "tension",
  "plucks",
  "commit-only",
];
let drag_mode: DragSoundMode = "scrub-only";
let drag_last_t = 0;

/* the scrub-only mode owns the whole gesture: no sample on commit */
export const suppress_commit_sample = (): boolean =>
  drag_mode === "scrub-only";

const detent = (note: string, vol: number): void => {
  synth.volume.value = vol;
  synth.triggerAttackRelease(note, "64n");
};

const tension_filter = new Tone.Filter(400, "lowpass").toDestination();
const tension_noise = new Tone.Noise("pink").connect(tension_filter);
tension_noise.volume.value = -60;

const PLUCK_TS = [0.25, 0.5, 0.75];
const PLUCK_UP = ["C4", "E4", "G4"];
const PLUCK_DOWN = ["C3", "E3", "G3"];

export const cycle_drag_sound = (): DragSoundMode => {
  drag_sound_stop();
  drag_mode =
    DRAG_SOUND_MODES[
      (DRAG_SOUND_MODES.indexOf(drag_mode) + 1) % DRAG_SOUND_MODES.length
    ];
  return drag_mode;
};

export const drag_sound_start = (bank: Sfxbank, reversed: boolean): void => {
  drag_last_t = 0;
  switch (drag_mode) {
    case "scrub":
    case "scrub-only":
      return scrub_start(bank, reversed);
    case "detents":
      return detent("A4", -18); // rail acquired
    case "tension":
      tension_noise.volume.value = -34;
      tension_noise.start();
      return;
    case "plucks":
    case "commit-only":
      return;
  }
};

export const drag_sound_set = (t: number): void => {
  const tt = Math.max(0, Math.min(1, t));
  switch (drag_mode) {
    case "scrub":
    case "scrub-only":
      scrub_set(tt);
      break;
    case "detents":
      if (drag_last_t <= 0.5 && tt > 0.5) detent("E5", -14); // armed
      if (drag_last_t > 0.5 && tt <= 0.5) detent("B3", -20); // disarmed
      break;
    case "tension":
      tension_filter.frequency.value = 150 + 2200 * tt * tt;
      tension_noise.volume.value = -34 + 16 * tt;
      break;
    case "plucks":
      PLUCK_TS.forEach((th, i) => {
        if (drag_last_t < th && tt >= th) detent(PLUCK_UP[i], -16);
        if (drag_last_t >= th && tt < th) detent(PLUCK_DOWN[i], -22);
      });
      break;
    case "commit-only":
      break;
  }
  drag_last_t = tt;
};

export const drag_sound_stop = (): void => {
  scrub_stop();
  tension_noise.volume.rampTo(-60, 0.08);
  window.setTimeout(() => tension_noise.stop(), 120);
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
