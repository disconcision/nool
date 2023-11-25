import * as Tone from "tone";

type Sound = {
  note: string;
  duration: string;
};

const synth = new Tone.PolySynth(Tone.Synth).toDestination();
//const distortion = new Tone.Distortion(0.4).toDestination();
//synth.connect(distortion);
/*var phaser = new Tone.Phaser({
	"frequency" : 350,
	"octaves" : 4,
	"baseFrequency" : 500
}).toDestination();
synth.connect(phaser);*/
let rev = new Tone.Reverb ( 10 ).toDestination();
synth.connect(rev);
//let vib = new Tone.Vibrato ( 10,0.3 ).toDestination();
//synth.connect(vib);

export const mk = (note: string, duration: string) => () =>
  synth.triggerAttackRelease(note, duration);

export const select = () => synth.triggerAttackRelease("A1", "32n");

export const noop = () => synth.triggerAttackRelease("F1", "32n");
