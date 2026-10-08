import test from "node:test";
import assert from "node:assert/strict";
import { MidiInput, AudioEngine, DARK_TECHNO_PATTERN } from "../audio.mjs";

test("F1 MIDI connect shares pending and completed access without duplicate delivery", async () => {
  const prior = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  let requests = 0;
  const port = {};
  const access = { inputs: new Map([["one", port]]) };
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      requestMIDIAccess: async () => {
        requests++;
        return access;
      },
    },
  });
  const controls = [];
  const midi = new MidiInput(
    (m) => controls.push(m),
    () => {},
  );
  try {
    await Promise.all([midi.connect(), midi.connect()]);
    await midi.connect();
    assert.equal(requests, 1);
    port.onmidimessage({ data: [144, 60, 127], timeStamp: 1 });
    assert.equal(controls.length, 1);
    midi.dispose();
    assert.equal(port.onmidimessage, null);
  } finally {
    if (prior) Object.defineProperty(globalThis, "navigator", prior);
    else delete globalThis.navigator;
  }
});
test("B dark techno is the default lookahead demo, with sine remaining selectable", async () => {
  const status = [];
  const audio = new AudioEngine((value) => status.push(value));
  const param = () => ({
    value: 0,
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {},
  });
  const node = () => ({
    gain: param(),
    frequency: param(),
    connect() {},
    disconnect() {},
    start() {},
    stop() {},
  });
  audio.context = {
    currentTime: 0,
    sampleRate: 1000,
    createGain: node,
    createOscillator: node,
    createBiquadFilter: node,
    createBufferSource: node,
    createBuffer: () => ({ getChannelData: () => new Float32Array(1000) }),
  };
  audio.start = async () => {};
  audio.analyser = node();
  audio.monitor = node();
  try {
    await audio.demo();
    assert.equal(status.at(-1), "Dark techno · 16-step lookahead");
    audio.context.currentTime = 1;
    audio.tempo = 128;
    audio.pumpDemo();
    await audio.demo("sine");
    assert.equal(status.at(-1), "Original demo pulse");
  } finally {
    audio.stop();
  }
});
test("B tab audio stops video and routes only to analysis, never the monitor", async () => {
  const prior = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  let videoStopped = 0;
  const video = { stop: () => videoStopped++ };
  const track = { stop() {} };
  const stream = {
    getTracks: () => [video, track],
    getVideoTracks: () => [video],
    getAudioTracks: () => [track],
  };
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { mediaDevices: { getDisplayMedia: async () => stream } },
  });
  const audio = new AudioEngine();
  audio.start = async () => {};
  const connections = [];
  audio.analyser = {};
  audio.monitor = {};
  audio.context = {
    createMediaStreamSource: () => ({
      connect: (to) => connections.push(to),
      disconnect() {},
    }),
  };
  try {
    assert.equal(typeof audio.tab, "function");
    await audio.tab();
    assert.equal(videoStopped, 1);
    assert.deepEqual(connections, [audio.analyser]);
    assert.equal(audio.kind, "tab");
  } finally {
    audio.stop();
    if (prior) Object.defineProperty(globalThis, "navigator", prior);
    else delete globalThis.navigator;
  }
});
test("R8 dark techno matches B's exact sixteen-step pattern", () => {
  // Literal copied from B core.mjs:16–33, not derived from A's implementation.
  assert.deepEqual(DARK_TECHNO_PATTERN, [
    { kick: 1, clap: 0, hat: 0, openHat: 0, bass: 1, perc: 0 },
    { kick: 0, clap: 0, hat: 0.42, openHat: 0, bass: 0, perc: 0 },
    { kick: 0, clap: 0, hat: 0.58, openHat: 0, bass: 0, perc: 0 },
    { kick: 0, clap: 0, hat: 0.36, openHat: 0, bass: 0.55, perc: 0.28 },
    { kick: 0.82, clap: 1, hat: 0, openHat: 0, bass: 0.78, perc: 0 },
    { kick: 0, clap: 0, hat: 0.62, openHat: 0, bass: 0, perc: 0 },
    { kick: 0, clap: 0, hat: 0.52, openHat: 0.68, bass: 0.62, perc: 0 },
    { kick: 0, clap: 0, hat: 0.38, openHat: 0, bass: 0, perc: 0.22 },
    { kick: 1, clap: 0, hat: 0, openHat: 0, bass: 1, perc: 0 },
    { kick: 0, clap: 0, hat: 0.46, openHat: 0, bass: 0, perc: 0 },
    { kick: 0, clap: 0, hat: 0.62, openHat: 0, bass: 0.58, perc: 0 },
    { kick: 0, clap: 0, hat: 0.38, openHat: 0, bass: 0, perc: 0.32 },
    { kick: 0.9, clap: 1, hat: 0, openHat: 0, bass: 0.82, perc: 0 },
    { kick: 0, clap: 0, hat: 0.64, openHat: 0, bass: 0, perc: 0 },
    { kick: 0, clap: 0, hat: 0.54, openHat: 0.74, bass: 0.7, perc: 0 },
    { kick: 0, clap: 0, hat: 0.4, openHat: 0, bass: 0, perc: 0.26 },
  ]);
});
