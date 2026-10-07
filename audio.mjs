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
  async demo() {
    this.stop();
    const token = this.generation;
    await this.start();
    if (token !== this.generation) return;
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
    this.lastClock = 0;
    this.intervals = [];
    this.pulses = 0;
  }
  async connect() {
    if (!navigator.requestMIDIAccess)
      throw new Error("Web MIDI unavailable in this browser");
    this.access = await navigator.requestMIDIAccess({ sysex: false });
    const attach = () => {
      for (const input of this.access.inputs.values())
        input.onmidimessage = (e) => this.message(e);
      this.onStatus(`${this.access.inputs.size} MIDI input(s)`);
    };
    this.access.onstatechange = attach;
    attach();
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
    if (this.access) {
      this.access.onstatechange = null;
      for (const i of this.access.inputs.values()) i.onmidimessage = null;
    }
  }
}
