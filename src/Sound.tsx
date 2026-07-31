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

export const scrub_start = (bank: Sfxbank, reversed: boolean): void => {
  scrub_stop();
  const p = scrub_players[bank];
  if (!p.loaded) return;
  scrub_rev = reversed;
  scrubbing = p;
  p.volume.value = -24;
  p.start();
};

export const scrub_set = (t: number): void => {
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

export const scrub_stop = (): void => {
  if (!scrubbing) return;
  const p = scrubbing;
  scrubbing = null;
  /* fade before stopping so the grains don't clip off */
  p.volume.rampTo(-60, 0.08);
  window.setTimeout(() => p.stop(), 120);
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
