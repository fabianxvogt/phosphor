// Pattern only from B core.mjs:16–33; scheduling stays on A's audio clock.
export const DARK_TECHNO_PATTERN = Object.freeze([
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
  { kick: 0, clap: 0, hat: 0.62, openHat: 0, bass: 0, perc: 0 },
  { kick: 0, clap: 0, hat: 0.38, openHat: 0, bass: 0, perc: 0.26 },
  { kick: 0.9, clap: 1, hat: 0, openHat: 0, bass: 0.82, perc: 0 },
  { kick: 0, clap: 0, hat: 0.64, openHat: 0, bass: 0, perc: 0 },
  { kick: 0, clap: 0, hat: 0.54, openHat: 0.74, bass: 0.7, perc: 0 },
  { kick: 0, clap: 0, hat: 0.4, openHat: 0, bass: 0, perc: 0.26 },
]);

export class AudioEngine {
  constructor(onStatus = () => {}) {
    this.onStatus = onStatus;
    this.context = null;
    this.source = null;
    this.sourceGain = null;
    this.stream = null;
    this.media = null;
    this.url = null;
    this.timer = null;
    this.pumpDemo = null;
    this.kind = "silent";
    this.muted = false;
    this.generation = 0;
    this.features = { energy: 0, bass: 0, mid: 0, high: 0, onset: 0 };
    this.ceiling = 0.1;
    this.lastOnset = 0;
    this.previousEnergy = 0;
    this.tempo = 92;
    this.voices = new Set();
    this.noise = null;
  }
  async start() {
    if (!this.context) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) throw new Error("Web Audio is unavailable");
      this.context = new C();
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.65;
      this.samples = new Float32Array(2048);
      this.spectrum = new Uint8Array(1024);
      this.monitor = this.context.createGain();
      this.monitor.gain.value = this.muted ? 0 : 0.65;
      this.monitor.connect(this.context.destination);
      this.recordDestination = this.context.createMediaStreamDestination();
      this.analyser.connect(this.recordDestination);
    }
    await this.context.resume();
  }
  stop() {
    this.generation++;
    clearInterval(this.timer);
    this.timer = null;
    this.pumpDemo = null;
    for (const voice of this.voices) {
      try {
        voice.stop();
        voice.disconnect();
      } catch {}
    }
    this.voices.clear();
    if (this.source) {
      try {
        this.source.stop?.();
        this.source.disconnect();
      } catch {}
    }
    this.source = null;
    this.sourceGain?.disconnect();
    this.sourceGain = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (this.media) {
      this.media.pause();
      this.media.src = "";
      this.media = null;
    }
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = null;
    this.kind = "silent";
    this.features = { energy: 0, bass: 0, mid: 0, high: 0, onset: 0 };
    this.ceiling = 0.1;
    this.previousEnergy = 0;
    this.onStatus("Silent / manual tempo");
  }
  mute(value) {
    this.muted = value;
    if (this.monitor)
      this.monitor.gain.setTargetAtTime(
        value ? 0 : 0.65,
        this.context.currentTime,
        0.02,
      );
  }
  async demo(mode = "techno") {
    this.stop();
    const token = this.generation;
    await this.start();
    if (token !== this.generation) return;
    if (mode !== "sine") return this.technoDemo();
    const osc = this.context.createOscillator(),
      gain = this.context.createGain();
    osc.type = "sine";
    osc.frequency.value = 65;
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(this.analyser);
    gain.connect(this.monitor);
    osc.start();
    this.source = osc;
    this.sourceGain = gain;
    this.kind = "demo";
    let next = this.context.currentTime;
    this.pumpDemo = () => {
      const now = this.context.currentTime;
      // Drop missed beats after a stalled timer instead of scheduling a burst.
      if (next < now - 0.12) next = now;
      while (next < now + 0.12) {
        gain.gain.setValueAtTime(0.001, next);
        gain.gain.linearRampToValueAtTime(0.7, next + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.001, next + 0.23);
        next += 60 / this.tempo;
      }
    };
    this.pumpDemo();
    this.timer = setInterval(this.pumpDemo, 25);
    this.onStatus("Original demo pulse");
  }
  technoDemo() {
    const context = this.context;
    const bus = context.createGain();
    bus.gain.value = 0.55;
    bus.connect(this.analyser);
    bus.connect(this.monitor);
    this.source = bus;
    this.kind = "demo";
    if (!this.noise) {
      this.noise = context.createBuffer(
        1,
        context.sampleRate,
        context.sampleRate,
      );
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    let next = context.currentTime,
      step = 0;
    const voice = (time, amplitude, frequency, decay, noise = false) => {
      if (!amplitude) return;
      const source = noise
        ? context.createBufferSource()
        : context.createOscillator();
      const envelope = context.createGain();
      let filter;
      if (noise) {
        source.buffer = this.noise;
        filter = context.createBiquadFilter();
        filter.type = "highpass";
        filter.frequency.value = frequency;
        source.connect(filter);
        filter.connect(envelope);
      } else {
        source.type = frequency < 55 ? "sawtooth" : "sine";
        source.frequency.setValueAtTime(frequency, time);
        source.frequency.exponentialRampToValueAtTime(
          Math.max(28, frequency * 0.5),
          time + decay,
        );
        source.connect(envelope);
      }
      envelope.connect(bus);
      envelope.gain.setValueAtTime(0.001, time);
      envelope.gain.linearRampToValueAtTime(amplitude, time + 0.003);
      envelope.gain.exponentialRampToValueAtTime(0.001, time + decay);
      this.voices.add(source);
      source.onended = () => {
        this.voices.delete(source);
        source.disconnect();
        filter?.disconnect();
        envelope.disconnect();
      };
      source.start(time);
      source.stop(time + decay + 0.01);
    };
    this.pumpDemo = () => {
      const now = context.currentTime;
      const duration = 60 / this.tempo / 4;
      if (next < now - 0.12) {
        const missed = Math.ceil((now - next) / duration);
        step += missed;
        next += missed * duration;
      }
      while (next < now + 0.12) {
        const pattern = DARK_TECHNO_PATTERN[step++ % 16];
        voice(next, pattern.kick * 0.8, 125, 0.22);
        voice(next, pattern.bass * 0.14, 49, 0.16);
        voice(next, pattern.clap * 0.2, 1200, 0.12, true);
        voice(next, pattern.hat * 0.12, 6500, 0.035, true);
        voice(next, pattern.openHat * 0.09, 5000, 0.16, true);
        voice(next, pattern.perc * 0.13, 300, 0.06);
        next += 60 / this.tempo / 4;
      }
    };
    this.pumpDemo();
    this.timer = setInterval(this.pumpDemo, 25);
    this.onStatus("Dark techno · 16-step lookahead");
  }
  async file(file) {
    this.stop();
    const token = this.generation;
    await this.start();
    if (token !== this.generation) return;
    this.url = URL.createObjectURL(file);
    this.media = new Audio(this.url);
    this.media.loop = true;
    this.source = this.context.createMediaElementSource(this.media);
    this.source.connect(this.analyser);
    this.source.connect(this.monitor);
    try {
      await this.media.play();
      if (token !== this.generation) return;
      this.kind = "file";
      this.onStatus(file.name + " · looping");
    } catch (e) {
      if (token !== this.generation) return;
      this.stop();
      throw new Error(
        "Playback blocked or unsupported audio. Choose another file.",
      );
    }
  }
  async input(deviceId = "") {
    this.stop();
    const token = this.generation;
    await this.start();
    if (token !== this.generation) return;
    if (!navigator.mediaDevices?.getUserMedia)
      throw new Error(
        "Audio input requires HTTPS or localhost and microphone support",
      );
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
    if (token !== this.generation) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    this.stream = stream;
    this.source = this.context.createMediaStreamSource(stream);
    this.source.connect(this.analyser); // Never connect live input to monitor/speakers.
    this.kind = "input";
    this.onStatus("Live input · monitoring disabled");
    stream.getAudioTracks()[0].onended = () => this.stop();
  }
  async tab() {
    this.stop();
    const token = this.generation;
    if (!navigator.mediaDevices?.getDisplayMedia)
      throw new Error(
        "Tab audio unavailable · desktop Chromium required; try a local audio file.",
      );
    let stream;
    try {
      this.onStatus("Choose a browser tab and enable Share tab audio");
      // Invoke the chooser synchronously in the click's user gesture.
      const pending = navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser" },
        audio: true,
        selfBrowserSurface: "exclude",
        monitorTypeSurfaces: "exclude",
        systemAudio: "exclude",
      });
      stream = await pending;
      stream.getVideoTracks().forEach((track) => track.stop());
      if (!stream.getAudioTracks().length)
        throw new Error(
          "No audio was shared · select a browser tab and enable Share tab audio.",
        );
      await this.start();
      if (token !== this.generation) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      this.stream = stream;
      this.source = this.context.createMediaStreamSource(stream);
      this.source.connect(this.analyser); // Analysis and recording only.
      this.kind = "tab";
      this.onStatus(
        "Tab audio active · analysis/recording only · speakers disabled",
      );
      stream.getAudioTracks()[0].onended = () => this.stop();
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop());
      if (token !== this.generation) return;
      const message =
        error.name === "NotAllowedError" || error.name === "AbortError"
          ? "Tab audio sharing denied or cancelled · try a local audio file."
          : error.message;
      this.onStatus(message);
      throw new Error(message);
    }
  }
  async devices() {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    return (await navigator.mediaDevices.enumerateDevices())
      .filter((d) => d.kind === "audioinput")
      .map((d, i) => ({
        id: d.deviceId,
        name: d.label || `Audio input ${i + 1}`,
      }));
  }
  sample(dt = 1 / 60) {
    if (!this.analyser || this.kind === "silent") return this.features;
    this.pumpDemo?.();
    this.analyser.getFloatTimeDomainData(this.samples);
    this.analyser.getByteFrequencyData(this.spectrum);
    let sum = 0;
    for (const s of this.samples) sum += s * s;
    const rms = Math.sqrt(sum / this.samples.length);
    this.ceiling = Math.max(0.04, rms, this.ceiling * Math.exp(-dt / 8));
    const energy = Math.min(1, rms / this.ceiling);
    const band = (low, high) => {
      const start = Math.max(
          1,
          Math.floor((low / this.context.sampleRate) * 2048),
        ),
        end = Math.min(
          1023,
          Math.ceil((high / this.context.sampleRate) * 2048),
        );
      let v = 0;
      for (let i = start; i <= end; i++) v += this.spectrum[i] / 255;
      return v / Math.max(1, end - start + 1);
    };
    const now = this.context.currentTime;
    const onset =
      energy - this.previousEnergy > 0.12 && now - this.lastOnset > 0.18;
    if (onset) this.lastOnset = now;
    this.previousEnergy = energy;
    const blend = 1 - Math.exp(-dt / 0.12);
    for (const [k, v] of Object.entries({
      energy,
      bass: band(35, 250),
      mid: band(250, 2500),
      high: band(2500, 12000),
    }))
      this.features[k] += (v - this.features[k]) * blend;
    this.features.onset = onset
      ? 1
      : this.features.onset * Math.exp(-dt / 0.15);
    return this.features;
  }
  dispose() {
    this.stop();
    this.context?.close();
    this.context = null;
    this.analyser = null;
    this.monitor = null;
    this.recordDestination = null;
  }
}
export class MidiInput {
  constructor(onControl, onClock, onStatus) {
    this.onControl = onControl;
    this.onClock = onClock;
    this.onStatus = onStatus;
    this.access = null;
    this.connecting = null;
    this.disposed = false;
    this.lastClock = 0;
    this.intervals = [];
    this.pulses = 0;
  }
  async connect() {
    if (this.access) return this.access;
    if (this.connecting) return this.connecting;
    if (!navigator.requestMIDIAccess)
      throw new Error("Web MIDI unavailable · Chromium required");
    this.disposed = false;
    this.connecting = (async () => {
      const access = await navigator.requestMIDIAccess({ sysex: false });
      if (this.disposed) return null;
      this.access = access;
      const attach = () => {
        for (const input of access.inputs.values())
          input.onmidimessage = (e) => this.message(e);
        this.onStatus(`${access.inputs.size} MIDI input(s)`);
      };
      access.onstatechange = attach;
      attach();
      return access;
    })();
    try {
      return await this.connecting;
    } finally {
      this.connecting = null;
    }
  }
  message(event) {
    const [status, a, b] = event.data;
    if (status === 248) {
      const now = event.timeStamp;
      if (this.lastClock) {
        const d = now - this.lastClock;
        if (d > 2 && d < 100) {
          this.intervals.push(d);
          if (this.intervals.length > 48) this.intervals.shift();
        }
      }
      this.lastClock = now;
      this.pulses++;
      if (this.intervals.length >= 12) {
        const sorted = [...this.intervals].sort((a, b) => a - b);
        this.onClock({
          tempo: 60000 / (sorted[Math.floor(sorted.length / 2)] * 24),
          beat: this.pulses / 24,
        });
      }
    } else if (status === 250) {
      this.pulses = 0;
      this.onClock({ start: true, beat: 0 });
    } else if (status === 251) {
      this.onClock({ resume: true, beat: this.pulses / 24 });
    } else if (status === 252) this.onClock({ stop: true });
    else if ((status & 240) === 176)
      this.onControl({
        type: "cc",
        channel: status & 15,
        number: a,
        value: b / 127,
      });
    else if ((status & 240) === 144 && b > 0)
      this.onControl({
        type: "note",
        channel: status & 15,
        number: a,
        value: b / 127,
      });
  }
  dispose() {
    this.disposed = true;
    if (this.access) {
      this.access.onstatechange = null;
      for (const i of this.access.inputs.values()) i.onmidimessage = null;
    }
    this.access = null;
  }
}
