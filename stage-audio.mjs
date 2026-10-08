// Stage audio (decisions D8, D21): sources, analysis features and the beat
// tracker worklet, owned by the stage window. Line input is analysis-only and
// never reaches the speakers; files and the demo can be monitored.
import { AudioEngine } from "./audio.mjs";

export class StageAudio {
  constructor(onStatus = () => {}) {
    this.engine = new AudioEngine(onStatus);
    this.onStatus = onStatus;
    this.node = null;
    this.ready = null; // one worklet setup, however many callers race
    this.tracker = null;
    this.source = "off";
  }
  get context() {
    return this.engine.context;
  }
  ensure() {
    this.ready ??= this.#setup().catch((error) => {
      this.ready = null;
      throw error;
    });
    return this.ready;
  }
  async #setup() {
    await this.engine.start();
    const context = this.engine.context;
    await context.audioWorklet.addModule(
      new URL("./beat-worklet.mjs", import.meta.url),
    );
    this.node = new AudioWorkletNode(context, "phosphor-beat", {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
    });
    this.engine.analyser.connect(this.node);
    // A worklet must be pulled by the graph; route it to a silent sink.
    const sink = context.createGain();
    sink.gain.value = 0;
    this.node.connect(sink).connect(context.destination);
    this.node.port.onmessage = (event) => (this.tracker = event.data);
  }
  async use({ source, deviceId = "", file = null, muted = false }) {
    await this.ensure();
    this.node.port.postMessage({ reset: true });
    this.tracker = null;
    if (source === "input") await this.engine.input(deviceId);
    else if (source === "file" && file) await this.engine.file(file);
    else if (source === "demo") await this.engine.demo("techno");
    else this.engine.stop();
    this.engine.mute(muted);
    this.source = this.engine.kind === "silent" ? "off" : source;
  }
  // Tracker state with nextBeatTime converted to performance.now() seconds.
  trackerNow() {
    const s = this.tracker;
    const context = this.engine.context;
    if (!s || !context || s.nextBeatTime === null) return s;
    const stamp = context.getOutputTimestamp?.();
    if (!stamp?.performanceTime) return s;
    return {
      ...s,
      nextBeatTime:
        (stamp.performanceTime + (s.nextBeatTime - stamp.contextTime) * 1000) /
        1000,
    };
  }
  features(dt) {
    return this.engine.sample(dt);
  }
  async devices() {
    return this.engine.devices();
  }
  status() {
    const t = this.tracker;
    return {
      source: this.source,
      level: this.engine.features.energy,
      bpm: t?.bpm ?? null,
      locked: !!t?.locked,
      coasting: !!t?.coasting,
      confidence: t?.confidence ?? 0,
    };
  }
  dispose() {
    this.engine.dispose();
    this.node = this.ready = null;
  }
}
