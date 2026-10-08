import { Engine } from "./engine.mjs";
import scenes from "./scenes.mjs";

export function createCapture({
  $,
  audio,
  getSession,
  toast,
  download,
  flush,
}) {
  let recording = null,
    exporting = false,
    cancelled = false;
  const png = (canvas) =>
    new Promise((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("PNG capture failed")),
        "image/png",
      ),
    );
  async function toggleRecord() {
    if (recording) {
      if (recording.recorder?.state === "recording") {
        $("recordButton").disabled = true;
        $("recordButton").textContent = "Finalizing recording…";
        recording.recorder.stop();
      }
      return;
    }
    if (!window.MediaRecorder || !$("stage").captureStream)
      throw new Error("Recording unsupported. Capture PNG or render frames.");
    const mime = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ].find((type) => MediaRecorder.isTypeSupported(type));
    if (!mime) throw new Error("No supported WebM encoder");
    const owner = {
      recorder: null,
      stream: null,
      writable: null,
      chunks: [],
      bytes: 0,
      pendingBytes: 0,
      chain: Promise.resolve(),
      failed: false,
    };
    recording = owner;
    $("recordButton").disabled = true;
    try {
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: "phosphor-performance.webm",
          types: [
            { description: "WebM video", accept: { "video/webm": [".webm"] } },
          ],
        });
        owner.writable = await handle.createWritable();
      }
      await audio.start();
      owner.stream = $("stage").captureStream(
        getSession().options.quality === "low" ? 30 : 60,
      );
      for (const track of audio.recordDestination.stream.getAudioTracks())
        owner.stream.addTrack(track.clone());
      const recorder = new MediaRecorder(owner.stream, {
        mimeType: mime,
        videoBitsPerSecond: 6000000,
      });
      owner.recorder = recorder;
      recorder.ondataavailable = ({ data: blob }) => {
        if (!blob.size || owner.failed) return;
        owner.bytes += blob.size;
        if (owner.writable) {
          owner.pendingBytes += blob.size;
          owner.chain = owner.chain
            .then(() => owner.writable.write(blob))
            .catch((error) => {
              owner.failed = true;
              toast("Recording disk error: " + error.message, "error");
              if (recorder.state === "recording") recorder.stop();
            })
            .finally(() => {
              owner.pendingBytes -= blob.size;
            });
          if (
            owner.pendingBytes > 16 * 1024 * 1024 &&
            recorder.state === "recording"
          ) {
            recorder.stop();
            toast(
              "Disk cannot keep up. Recording stopped; buffered data is being finalized.",
              "error",
            );
          }
        } else if (owner.bytes <= 64 * 1024 * 1024) owner.chunks.push(blob);
        else if (recorder.state === "recording") {
          recorder.stop();
          toast(
            "64 MB clip limit reached. Use disk recording or OBS for long shows.",
          );
        }
      };
      recorder.onerror = () => {
        owner.failed = true;
        toast("Encoder error. Recording stopped.", "error");
        if (recorder.state === "recording") recorder.stop();
      };
      recorder.onstop = async () => {
        $("recordButton").disabled = true;
        $("recordButton").textContent = "Finalizing recording…";
        try {
          await owner.chain;
          if (owner.writable) {
            if (owner.failed) await owner.writable.abort();
            else await owner.writable.close();
          } else if (!owner.failed && owner.chunks.length)
            download(
              new Blob(owner.chunks, { type: mime }),
              "phosphor-performance.webm",
            );
          if (!owner.failed)
            toast("Recording finalized. Safe to close the app.");
        } catch (error) {
          toast(error.message, "error");
        } finally {
          owner.stream.getTracks().forEach((track) => track.stop());
          owner.chunks = [];
          if (recording === owner) recording = null;
          $("recordButton").disabled = false;
          $("recordButton").textContent = "Record WebM";
        }
      };
      recorder.start(1000);
      $("recordButton").disabled = false;
      $("recordButton").textContent = "Stop recording";
      toast(
        owner.writable
          ? "Recording streamed to disk"
          : "Recording short clip · 64 MB memory cap",
      );
    } catch (error) {
      owner.stream?.getTracks().forEach((track) => track.stop());
      if (owner.writable) await owner.writable.abort();
      if (recording === owner) recording = null;
      $("recordButton").disabled = false;
      $("recordButton").textContent = "Record WebM";
      throw error;
    }
  }
  async function renderFrames() {
    if (exporting) throw new Error("Frame export already running");
    if (!window.showDirectoryPicker)
      throw new Error(
        "Frame export: desktop Chromium required (HTTPS or localhost)",
      );
    exporting = true;
    cancelled = false;
    const session = getSession();
    const state = structuredClone({
      snapshot: session.active,
      options: session.options,
      tempo: session.tempo,
    });
    const canvas = document.createElement("canvas");
    let renderer,
      completedFrames = 0;
    try {
      const parent = await window.showDirectoryPicker({ mode: "readwrite" });
      const dir = await parent.getDirectoryHandle(
        `phosphor-frames-${Date.now()}-${crypto.randomUUID()}`,
        { create: true },
      );
      $("cancelExportButton").hidden = false;
      renderer = new Engine(canvas, scenes);
      renderer.resize(1280, 720);
      renderer.options = state.options;
      renderer.mappings = [];
      renderer.load(state.snapshot, 0);
      renderer.beat = 0;
      while (renderer.slots.at(-1).warmTicks > 0 && !cancelled) {
        $("saveReadout").textContent = "Preparing scene for frame export";
        renderer.advance(0, true);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      for (let i = 0; i < 120 && !cancelled; i++) {
        renderer.beat = ((i / 30) * state.tempo) / 60;
        renderer.advance(1 / 30);
        const handle = await dir.getFileHandle(
          `frame-${String(i).padStart(4, "0")}.png`,
          { create: true },
        );
        const stream = await handle.createWritable();
        await stream.write(await png(canvas));
        await stream.close();
        completedFrames++;
        $("saveReadout").textContent = `Rendering frame ${i + 1} / 120`;
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      const handle = await dir.getFileHandle("phosphor-sequence.json", {
        create: true,
      });
      const stream = await handle.createWritable();
      await stream.write(
        JSON.stringify(
          {
            format: "phosphor-rendered-sequence-v1",
            width: 1280,
            height: 720,
            fps: 30,
            snapshot: state.snapshot,
            options: state.options,
            tempo: state.tempo,
            frames: completedFrames,
            cancelled,
            note: "No audio or live modulation; deterministic reset trajectory on this GPU.",
          },
          null,
          2,
        ),
      );
      await stream.close();
      toast(
        cancelled
          ? "Export cancelled; completed frames retained"
          : "120 PNG frames rendered to selected directory",
      );
    } finally {
      renderer?.dispose();
      exporting = false;
      $("cancelExportButton").hidden = true;
      flush();
    }
  }
  return {
    get recording() {
      return Boolean(recording);
    },
    get exporting() {
      return exporting;
    },
    toggleRecord,
    renderFrames,
    cancel: () => {
      cancelled = true;
    },
    capture: async () =>
      download(
        await png($("stage")),
        `phosphor-${getSession().active.scene}.png`,
      ),
    pagehide() {
      if (recording?.recorder?.state === "recording") recording.recorder.stop();
    },
  };
}
