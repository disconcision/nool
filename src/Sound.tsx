import * as Tone from "tone";
import pew from "./assets/sfx/pew.m4a";
import pshew from "./assets/sfx/pshew.m4a";
import klohk from "./assets/sfx/klohk.m4a";
import chchiu from "./assets/sfx/chchiu-out.wav";
import shwoph from "./assets/sfx/shwo-ph-out.wav";
import tiup from "./assets/sfx/tiup-comm-out.wav";

type Sound = {
  note: string;
  duration: string;
};

type Sfxbank = "pew" | "pshew" | "klohk" | "chchiu" | "shwoph" | "tiup";
const player_pew = new Tone.Player(pew).toDestination();

const player_pshew = new Tone.Player(pshew).toDestination();
const player_klohk = new Tone.Player(klohk).toDestination();
const player_chchiu = new Tone.Player(chchiu).toDestination();
//let ps = new Tone.PitchShift(-3).toDestination();
//player_chchiu.connect(ps);
player_chchiu.playbackRate = 1.6;

const player_shwoph = new Tone.Player(shwoph).toDestination();
player_shwoph.playbackRate = 1.4;
const player_tiup = new Tone.Player(tiup).toDestination();
const sfx_bank = (sfx: Sfxbank): Tone.Player =>
  ({
    pew: player_pew,
    pshew: player_pshew,
    klohk: player_klohk,
    chchiu: player_chchiu,
    shwoph: player_shwoph,
    tiup: player_tiup,
  }[sfx]);
export const sfx = (sfx: Sfxbank) => () => {
  let p =sfx_bank(sfx);
  //p.playbackRate = 1.4;
  //p.reverse =true;
  p.start();
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
  const letters = "ACEGBDF";
  return letters[n % letters.length];
};

export const select = (depth: number) => {
  
  //sfx_load_play("pew");
  //player.start();
  synth.triggerAttackRelease([number_to_letter(depth) + "1"], "32n");
};

export const noop = () => synth.triggerAttackRelease("F1", "32n");
