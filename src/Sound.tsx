import * as Tone from 'tone';

type Sound = {
  note: string,
  duration: string,
};

  //create a synth and connect it to the main output (your speakers)
const synth = new Tone.PolySynth(Tone.Synth).toDestination();
//play a middle 'C' for the duration of an 8th note

export const mk = (note: string, duration: string) =>() => synth.triggerAttackRelease(note, duration);

export const select = () => synth.triggerAttackRelease("A1", "32n");
