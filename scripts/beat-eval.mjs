// Evaluate the beat tracker on real recordings, locally only (mixes never
// enter the repo). Usage:
//   npm run beat:eval -- path/to/mix.wav [more files…] [--minutes 20] [--clicks]
// WAV (PCM 16/24/32-bit or float) is read natively; other formats need
// ffmpeg on PATH. --clicks writes artifacts/beat/<name>.clicks.wav: the mix
// with a click on every predicted beat, for listening checks.
// Phase: each predicted beat (not coasting) is paired with the strongest
// 150–2000 Hz attack within ±120 ms — the band where house and techno kicks
// stand out from sub basslines and off-beat hats. Single attacks are noisy,
// so the score is the most common offset (4 ms kernel) over ±8 beats; windows
// whose attacks disagree are reported as unscored, not guessed.
// --constant-tempo (produced tracks, not DJ mixes): also fits one tempo grid
// to the agreeing attacks and scores every beat against it.
import { open, mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { basename, extname, resolve } from "node:path";
import { parseArgs } from "node:util";
import { BeatTracker } from "../beat-tracker.mjs";

// The attack reference lags a true onset by about this much (measured on the
// synthetic kicks, whose onset times are known).
const REFERENCE_LAG_MS = 8;

function biquad(type, frequency, sampleRate) {
  const w = (2 * Math.PI * frequency) / sampleRate,
    cos = Math.cos(w),
    alpha = Math.sin(w) / (2 * Math.SQRT1_2),
    a0 = 1 + alpha;
  const low = type === "lowpass";
  const b0 = (low ? 1 - cos : 1 + cos) / 2 / a0,
    b1 = (low ? 1 - cos : -(1 + cos)) / a0,
    a1 = (-2 * cos) / a0,
    a2 = (1 - alpha) / a0;
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  return (x) => {
    const y = b0 * x + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    return y;
  };
}

// Signed ms from each beat to the strongest attack near it (null if none).
function attackErrors(beats, logEnergy) {
  return beats.map((time) => {
    const c = Math.round(time * 1000);
    let best = null,
      peak = 0.5; // log-flux floor, as the tracker's MIN_ONSET
    for (
      let i = Math.max(10, c - 120);
      i <= Math.min(logEnergy.length - 1, c + 120);
      i++
    ) {
      const flux = logEnergy[i] - logEnergy[i - 10];
      if (flux > peak) {
        peak = flux;
        best = c - i;
      }
    }
    return best;
  });
}

// Most common value (4 ms Gaussian kernel) and the share of values near it.
function mode(values) {
  let best = -Infinity,
    at = 0;
  for (let c = -120; c <= 120; c++) {
    let density = 0;
    for (const v of values) density += Math.exp(-((v - c) ** 2) / 32);
    if (density > best) {
      best = density;
      at = c;
    }
  }
  return { at, share: best / values.length };
}

// Local phase offset per beat (ms, lag-corrected), null where unscored.
function localOffsets(errors) {
  return errors.map((_, i) => {
    const near = errors
      .slice(Math.max(0, i - 8), i + 9)
      .filter((e) => e !== null);
    if (near.length < 8) return null;
    const m = mode(near);
    return m.share < 0.5 ? null : m.at + REFERENCE_LAG_MS;
  });
}

// One tempo grid through the agreeing attacks (most attacks within ±4 ms),
// then refined by least squares. Returns per-beat |error| in ms.
function constantGrid(beats, errors, offsets, bpm) {
  const anchors = [];
  beats.forEach((t, i) => {
    if (offsets[i] !== null && errors[i] !== null)
      anchors.push(t - (errors[i] + REFERENCE_LAG_MS) / 1000);
  });
  if (anchors.length < 16) return null;
  let best = { inliers: -1 };
  for (let b = bpm - 0.4; b <= bpm + 0.4; b += 0.0005) {
    const P = 60 / b,
      bins = Math.round(P * 1000),
      hist = new Int32Array(bins);
    for (const a of anchors) hist[Math.floor(((a % P) / P) * bins) % bins]++;
    for (let c = 0; c < bins; c++) {
      let n = 0;
      for (let d = -4; d <= 4; d++) n += hist[(c + d + bins) % bins];
      if (n > best.inliers) best = { inliers: n, P, phi: (c / bins) * P };
    }
  }
  let { P, phi } = best;
  const near = (a) => {
    const d = (a - phi) / P;
    return Math.abs(d - Math.round(d)) * P;
  };
  const inliers = anchors.filter((a) => near(a) < 0.006);
  const n = inliers.map((a) => Math.round((a - phi) / P));
  const mx = n.reduce((s, v) => s + v, 0) / n.length,
    my = inliers.reduce((s, v) => s + v, 0) / n.length;
  let sxy = 0,
    sxx = 0;
  for (let i = 0; i < n.length; i++) {
    sxy += (n[i] - mx) * (inliers[i] - my);
    sxx += (n[i] - mx) ** 2;
  }
  P = sxy / sxx;
  phi = my - P * mx;
  return {
    bpm: 60 / P,
    anchors: inliers.length,
    errors: beats.map((t) => near(t) * 1000),
  };
}

const quantile = (sorted, q) => sorted[Math.floor(q * (sorted.length - 1))];

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    minutes: { type: "string", default: "0" },
    clicks: { type: "boolean", default: false },
    "min-bpm": { type: "string", default: "100" },
    "max-bpm": { type: "string", default: "150" },
    "constant-tempo": { type: "boolean", default: false },
  },
});
if (!positionals.length) {
  console.error(
    "Usage: npm run beat:eval -- <audio files…> [--minutes N] [--clicks]",
  );
  process.exit(2);
}

async function* wavBlocks(path) {
  const file = await open(path, "r");
  try {
    const head = Buffer.alloc(12);
    await file.read(head, 0, 12, 0);
    if (
      head.toString("ascii", 0, 4) !== "RIFF" ||
      head.toString("ascii", 8, 12) !== "WAVE"
    )
      throw new Error("not a RIFF/WAVE file");
    let pos = 12,
      format = null;
    const chunk = Buffer.alloc(8);
    for (;;) {
      const { bytesRead } = await file.read(chunk, 0, 8, pos);
      if (bytesRead < 8) throw new Error("no data chunk");
      const id = chunk.toString("ascii", 0, 4),
        size = chunk.readUInt32LE(4);
      if (id === "fmt ") {
        const fmt = Buffer.alloc(size);
        await file.read(fmt, 0, size, pos + 8);
        let tag = fmt.readUInt16LE(0);
        if (tag === 0xfffe) tag = fmt.readUInt16LE(24);
        format = {
          tag,
          channels: fmt.readUInt16LE(2),
          sampleRate: fmt.readUInt32LE(4),
          bits: fmt.readUInt16LE(14),
        };
      } else if (id === "data") {
        if (!format) throw new Error("data before fmt");
        yield { format };
        const width = format.bits / 8,
          frame = width * format.channels;
        const buffer = Buffer.alloc(frame * 48000);
        let offset = pos + 8;
        const end = offset + size;
        while (offset < end) {
          const want = Math.min(buffer.length, end - offset);
          const { bytesRead } = await file.read(buffer, 0, want, offset);
          if (!bytesRead) break;
          offset += bytesRead;
          const frames = Math.floor(bytesRead / frame);
          const out = new Float32Array(frames);
          for (let i = 0; i < frames; i++) {
            let sum = 0;
            for (let c = 0; c < format.channels; c++) {
              const at = i * frame + c * width;
              if (format.tag === 3) sum += buffer.readFloatLE(at);
              else if (width === 2) sum += buffer.readInt16LE(at) / 32768;
              else if (width === 3) sum += buffer.readIntLE(at, 3) / 8388608;
              else sum += buffer.readInt32LE(at) / 2147483648;
            }
            out[i] = sum / format.channels;
          }
          yield { samples: out };
        }
        return;
      }
      pos += 8 + size + (size & 1);
    }
  } finally {
    await file.close();
  }
}

async function* ffmpegBlocks(path, sampleRate = 48000) {
  const child = spawn(
    "ffmpeg",
    [
      "-v",
      "error",
      "-i",
      path,
      "-ac",
      "1",
      "-ar",
      String(sampleRate),
      "-f",
      "f32le",
      "-",
    ],
    {
      stdio: ["ignore", "pipe", "inherit"],
    },
  );
  child.on("error", () => {});
  yield { format: { sampleRate, channels: 1 } };
  let rest = Buffer.alloc(0);
  for await (const data of child.stdout) {
    const all = rest.length ? Buffer.concat([rest, data]) : data;
    const usable = all.length - (all.length % 4);
    const out = new Float32Array(usable / 4);
    for (let i = 0; i < out.length; i++) out[i] = all.readFloatLE(i * 4);
    rest = all.subarray(usable);
    yield { samples: out };
  }
}

async function wavWriter(path, sampleRate) {
  const file = await open(path, "w");
  const header = Buffer.alloc(44);
  await file.write(header, 0, 44, 0);
  let bytes = 0;
  return {
    async write(stereo) {
      const buffer = Buffer.alloc(stereo.length * 2);
      for (let i = 0; i < stereo.length; i++)
        buffer.writeInt16LE(
          Math.max(-32768, Math.min(32767, Math.round(stereo[i] * 32767))),
          i * 2,
        );
      await file.write(buffer, 0, buffer.length, 44 + bytes);
      bytes += buffer.length;
    },
    async close() {
      header.write("RIFF", 0, "ascii");
      header.writeUInt32LE(36 + bytes, 4);
      header.write("WAVEfmt ", 8, "ascii");
      header.writeUInt32LE(16, 16);
      header.writeUInt16LE(1, 20);
      header.writeUInt16LE(2, 22);
      header.writeUInt32LE(sampleRate, 24);
      header.writeUInt32LE(sampleRate * 4, 28);
      header.writeUInt16LE(4, 32);
      header.writeUInt16LE(16, 34);
      header.write("data", 36, "ascii");
      header.writeUInt32LE(bytes, 40);
      await file.write(header, 0, 44, 0);
      await file.close();
    },
  };
}

for (const path of positionals) {
  const source =
    extname(path).toLowerCase() === ".wav"
      ? wavBlocks(path)
      : ffmpegBlocks(path);
  const { value: first } = await source.next();
  const sampleRate = first.format.sampleRate;
  const tracker = new BeatTracker({
    sampleRate,
    minBpm: Number(values["min-bpm"]),
    maxBpm: Number(values["max-bpm"]),
  });
  const limit =
    Number(values.minutes) > 0
      ? Number(values.minutes) * 60 * sampleRate
      : Infinity;
  let writer = null;
  if (values.clicks) {
    await mkdir(resolve("artifacts/beat"), { recursive: true });
    writer = await wavWriter(
      resolve("artifacts/beat", basename(path, extname(path)) + ".clicks.wav"),
      sampleRate,
    );
  }
  let position = 0,
    firstLock = null,
    lockedBlocks = 0,
    coastBlocks = 0,
    blocks = 0,
    lastBpm = null,
    jumps = 0,
    lastClick = -Infinity;
  const tempos = [];
  const clickLength = Math.round(0.02 * sampleRate);
  const body = [
    biquad("highpass", 150, sampleRate),
    biquad("highpass", 150, sampleRate),
    biquad("lowpass", 2000, sampleRate),
    biquad("lowpass", 2000, sampleRate),
  ];
  const perMs = Math.round(sampleRate / 1000);
  const logEnergy = [],
    beats = [];
  let energy = 0,
    inMs = 0,
    lastBeat = -Infinity;
  for await (const { samples } of source) {
    for (let i = 0; i < samples.length && position < limit; i += 128) {
      const block = samples.subarray(i, Math.min(samples.length, i + 128));
      tracker.process(block);
      for (let j = 0; j < block.length; j++) {
        const v = body[3](body[2](body[1](body[0](block[j]))));
        energy += v * v;
        if (++inMs === perMs) {
          logEnergy.push(Math.log(energy / perMs + 1e-7));
          energy = inMs = 0;
        }
      }
      const state = tracker.state();
      const now = (position + block.length) / sampleRate;
      // The prediction shown at the moment the beat lands.
      if (
        state.locked &&
        !state.coasting &&
        now >= state.nextBeatTime &&
        state.nextBeatTime > lastBeat
      )
        beats.push((lastBeat = state.nextBeatTime));
      blocks++;
      if (state.locked) {
        lockedBlocks++;
        if (firstLock === null) firstLock = now;
        if (state.coasting) coastBlocks++;
        if (lastBpm !== null && Math.abs(state.bpm - lastBpm) > 1) jumps++;
        lastBpm = state.bpm;
        if (blocks % 375 === 0) tempos.push(state.bpm);
      }
      if (writer) {
        const stereo = new Float32Array(block.length * 2);
        for (let j = 0; j < block.length; j++) {
          const t = position + j;
          let click = 0;
          if (state.locked) {
            const beat = Math.round(state.nextBeatTime * sampleRate);
            if (t >= beat && beat > lastClick) lastClick = beat;
          }
          const since = t - lastClick;
          if (since >= 0 && since < clickLength)
            click =
              0.5 *
              Math.sin((2 * Math.PI * 2000 * since) / sampleRate) *
              (1 - since / clickLength);
          stereo[2 * j] = stereo[2 * j + 1] = 0.6 * block[j] + click;
        }
        await writer.write(stereo);
      }
      position += block.length;
    }
    if (position >= limit) break;
  }
  if (writer) await writer.close();
  const minutes = position / sampleRate / 60;
  tempos.sort((a, b) => a - b);
  const errors = attackErrors(beats, logEnergy);
  const offsets = localOffsets(errors);
  const scored = offsets
    .filter((o) => o !== null)
    .map(Math.abs)
    .sort((a, b) => a - b);
  const within = (list) =>
    `${((100 * list.filter((e) => e <= 20).length) / list.length).toFixed(0)}%`;
  let phase = scored.length
    ? `phase vs kick (±8-beat mode): median ${quantile(scored, 0.5)} ms, p90 ${quantile(scored, 0.9)} ms, ≤ 20 ms ${within(scored)} of ${scored.length} beats (${offsets.length - scored.length} unscored)`
    : "phase: no scorable beats";
  if (values["constant-tempo"] && tempos.length) {
    const grid = constantGrid(beats, errors, offsets, quantile(tempos, 0.5));
    const e = grid?.errors.sort((a, b) => a - b);
    phase += grid
      ? ` · vs one ${grid.bpm.toFixed(3)} BPM grid (${grid.anchors} anchors): median ${quantile(e, 0.5).toFixed(1)} ms, p90 ${quantile(e, 0.9).toFixed(1)} ms, ≤ 20 ms ${within(e)}`
      : " · constant grid: too few agreeing attacks";
  }
  console.log(
    `${basename(path)}: ${minutes.toFixed(1)} min · first lock ${firstLock === null ? "never" : firstLock.toFixed(1) + " s"} · locked ${((100 * lockedBlocks) / blocks).toFixed(1)}% (coasting ${((100 * coastBlocks) / Math.max(1, lockedBlocks)).toFixed(1)}% of that) · tempo jumps >1 BPM: ${jumps} · tempo p10/p50/p90 ${[0.1, 0.5, 0.9].map((q) => quantile(tempos, q)?.toFixed(1) ?? "—").join("/")} · ${phase}`,
  );
}
