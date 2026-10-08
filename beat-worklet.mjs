// AudioWorklet host for the beat tracker. Posts tracker state with beat
// times on the AudioContext clock about every 10 ms.
import { BeatTracker } from "./beat-tracker.mjs";

class BeatProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.reset();
    this.port.onmessage = (event) => {
      if (event.data?.reset) this.reset();
    };
  }
  reset() {
    // sampleRate and currentTime are AudioWorkletGlobalScope globals.
    this.tracker = new BeatTracker({ sampleRate });
    this.start = null;
    this.count = 0;
    this.mono = new Float32Array(128);
  }
  process(inputs) {
    const channels = inputs[0];
    if (channels?.length) {
      if (this.start === null) this.start = currentTime;
      const n = channels[0].length;
      if (this.mono.length !== n) this.mono = new Float32Array(n);
      this.mono.fill(0);
      for (const channel of channels)
        for (let i = 0; i < n; i++)
          this.mono[i] += channel[i] / channels.length;
      this.tracker.process(this.mono);
    }
    if (++this.count % 4 === 0 && this.start !== null) {
      const state = this.tracker.state();
      this.port.postMessage({
        ...state,
        nextBeatTime:
          state.nextBeatTime === null ? null : this.start + state.nextBeatTime,
        contextTime: currentTime,
      });
    }
    return true;
  }
}
registerProcessor("phosphor-beat", BeatProcessor);
