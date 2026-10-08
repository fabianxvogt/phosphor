import test from "node:test";
import assert from "node:assert/strict";
import {
  MidiInput,
  AudioEngine,
  AudioFeatureBus,
  DARK_TECHNO_PATTERN,
} from "../audio.mjs";
import { synth } from "./beat-synth.mjs";

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

// Independent radix-two FFT adapter: real sample signals enter the same
// feature seam as AnalyserNode's unsmoothed decibel spectrum.
function spectrumDB(samples) {
  const size = samples.length;
  const real = Float64Array.from(samples, (x, i) =>
    x * (0.42 - 0.5 * Math.cos(2 * Math.PI * i / size) +
      0.08 * Math.cos(4 * Math.PI * i / size)),
  );
  const imaginary = new Float64Array(size);
  for (let i = 1, j = 0; i < size; i++) {
    let bit = size >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) [real[i], real[j]] = [real[j], real[i]];
  }
  for (let width = 2; width <= size; width *= 2) {
    const angle = -2 * Math.PI / width;
    for (let start = 0; start < size; start += width) {
      for (let j = 0; j < width / 2; j++) {
        const a = start + j, b = a + width / 2;
        const cosine = Math.cos(angle * j), sine = Math.sin(angle * j);
        const r = real[b] * cosine - imaginary[b] * sine;
        const im = real[b] * sine + imaginary[b] * cosine;
        real[b] = real[a] - r;
        imaginary[b] = imaginary[a] - im;
        real[a] += r;
        imaginary[a] += im;
      }
    }
  }
  return Float32Array.from({ length: size / 2 }, (_, i) =>
    20 * Math.log10(Math.hypot(real[i], imaginary[i]) / size),
  );
}

function extractSignal(samples, sampleRate, dt = 0.01) {
  const bus = new AudioFeatureBus();
  const frame = new Float32Array(2048);
  const rows = [];
  for (let t = 0; t < samples.length / sampleRate; t += dt) {
    const end = Math.round(t * sampleRate);
    frame.fill(0);
    const start = Math.max(0, end - frame.length);
    frame.set(samples.subarray(start, end), frame.length - (end - start));
    rows.push({ time: t, ...bus.sample(frame, spectrumDB(frame), sampleRate, t, dt) });
  }
  return rows;
}

test("D61 kick train excites the low envelope and produces one timely hit per kick", () => {
  const signal = synth({
    segments: [{ beats: 8, bpm: 120, hats: false }],
    sampleRate: 24000,
    noise: 0,
  });
  const rows = extractSignal(signal.samples, signal.sampleRate);
  const hits = rows.filter((r) => r.hit);
  assert.equal(hits.length, 8);
  for (let i = 0; i < hits.length; i++) {
    assert.ok(hits[i].time >= signal.truth[i].time);
    assert.ok(hits[i].time - signal.truth[i].time < 0.08, `kick ${i} late`);
  }
  assert.ok(Math.max(...rows.map((r) => r.low)) > 0.6);
  assert.ok(Math.max(...rows.map((r) => r.high)) < 0.1);
  assert.ok(rows.every((r) => r.low === r.bass));
  assert.ok(rows.at(-1).low < 0.02, "low body releases between phrases");
});

test("D61 silence has zero envelopes, onset, spectral flux and hits", () => {
  const rows = extractSignal(new Float32Array(24000), 24000);
  for (const row of rows) {
    for (const feature of ["energy", "low", "mid", "high", "onset", "flux"])
      assert.equal(row[feature], 0, feature);
    assert.equal(row.hit, false);
    assert.equal(row.active, false);
  }
});

test("D61 broadband noise bursts produce flux and respect the 120 ms hit refractory", () => {
  const sampleRate = 24000;
  const samples = new Float32Array(sampleRate);
  let seed = 7;
  for (const at of [0.2, 0.25, 0.55])
    for (let i = 0; i < 0.025 * sampleRate; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      samples[Math.round(at * sampleRate) + i] = (seed / 2 ** 32 - 0.5) * 1.2;
    }
  const rows = extractSignal(samples, sampleRate);
  const hits = rows.filter((r) => r.hit);
  assert.equal(hits.length, 2);
  assert.ok(hits[0].time >= 0.2 && hits[0].time < 0.28);
  assert.ok(hits[1].time >= 0.55 && hits[1].time < 0.63);
  const peakFlux = Math.max(...rows.map((r) => r.flux));
  const peakHigh = Math.max(...rows.map((r) => r.high));
  assert.ok(peakFlux > 0.1, `noise flux ${peakFlux} rises above silence`);
  assert.ok(peakHigh > 0.1, `noise high envelope ${peakHigh}`);
  assert.equal(rows.find((r) => r.time > 0.1).flux, 0);
  assert.ok(rows.at(-1).flux < peakFlux * 0.2, "noise flux releases");
  for (let i = 1; i < hits.length; i++)
    assert.ok(hits[i].time - hits[i - 1].time >= 0.12);
});
