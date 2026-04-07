import * as Tone from 'tone';

let toneStarted = false;

/**
 * Must be called from a user gesture before audio playback.
 */
export async function ensureToneStarted() {
  if (!toneStarted) {
    await Tone.start();
    toneStarted = true;
  }
  return true;
}

export function createFretboardSynth() {
  return new Tone.Synth({
    oscillator: { type: 'fatsawtooth' },
    envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.8 },
  }).toDestination();
}

export function createMelodySynth() {
  return new Tone.Synth({
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.02, decay: 0.1, sustain: 0.45, release: 0.35 },
  }).toDestination();
}

export function createChordPolySynth() {
  return new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.02, decay: 0.2, sustain: 0.25, release: 0.55 },
  }).toDestination();
}

export function disposeAudioNode(node) {
  if (node && typeof node.dispose === 'function') {
    node.dispose();
  }
}

export function stopTransportAndCancel() {
  Tone.Transport.stop();
  Tone.Transport.cancel();
  Tone.Transport.position = 0;
}
