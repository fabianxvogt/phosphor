import { createMandelboxFlythroughRenderer } from '../mandelbox-flythrough.mjs';
import { advanceFlight, defaultFlightPose, worldDistance } from '../fractal-navigation.mjs';

const canvas = document.getElementById('stage'), report = document.getElementById('report'), button = document.getElementById('run');
const renderer = createMandelboxFlythroughRenderer({ canvas, width: 480, height: 300 });
let recordingUrl;
renderer.render(0, { pose: defaultFlightPose() });
const hashFrame = () => {
  const bytes = new Uint8Array(canvas.width * canvas.height * 4);
  renderer.gl.readPixels(0, 0, canvas.width, canvas.height, renderer.gl.RGBA, renderer.gl.UNSIGNED_BYTE, bytes);
  let hash = 2166136261;
  for (const value of bytes) hash = Math.imul(hash ^ value, 16777619);
  return (hash >>> 0).toString(16);
};
button.addEventListener('click', async () => {
  button.disabled = true;
  let stream, recorder;
  try {
    const startPose = { position: [0, 0, -1.2], yaw: 0, pitch: 0 };
    let pose = structuredClone(startPose), frame = 0, previous, beginning;
    const frameTimes = [], poses = [], chunks = [], hashes = [];
    let videoFinished = Promise.resolve(null);
    if (typeof MediaRecorder === 'function' && canvas.captureStream) {
      stream = canvas.captureStream(30);
      const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(type => MediaRecorder.isTypeSupported(type));
      if (mimeType) {
        recorder = new MediaRecorder(stream, { mimeType });
        recorder.addEventListener('dataavailable', event => { if (event.data.size) chunks.push(event.data); });
        videoFinished = new Promise((resolve, reject) => {
          recorder.addEventListener('stop', () => resolve(new Blob(chunks, { type: mimeType })), { once: true });
          recorder.addEventListener('error', reject, { once: true });
        });
        recorder.start();
      }
    }
    // 300 fixed simulation steps. Wall-clock samples include actual drawing.
    await new Promise(resolve => {
      const render = now => {
        if (previous !== undefined) frameTimes.push(now - previous);
        beginning ??= now; previous = now;
        const seconds = frame / 30;
        let input;
        if (seconds < 2) input = { forward: 1 };
        else if (seconds < 4) input = { turn: Math.PI / (4 * 1.4) };
        else if (seconds < 6) input = { forward: 1 };
        else if (seconds < 8) input = { forward: -1 };
        else input = { rise: 1 };
        pose = advanceFlight(pose, input, 1 / 30, { speed: .2 }).pose;
        renderer.render(seconds, { pose });
        if ([0, 59, 119, 179, 239, 299].includes(frame)) { poses.push(structuredClone(pose)); hashes.push(hashFrame()); }
        report.textContent = `Flight ${frame + 1}/300 · simulated ${seconds.toFixed(1)}s · wall ${((now - beginning) / 1000).toFixed(1)}s`;
        frame++;
        if (frame < 300) requestAnimationFrame(render); else resolve();
      };
      requestAnimationFrame(render);
    });
    if (recorder?.state === 'recording') recorder.stop();
    const video = await videoFinished;
    stream?.getTracks().forEach(track => track.stop());
    const videoHeader = video ? Array.from(new Uint8Array(await video.slice(0, 4).arrayBuffer())) : null;
    if (video) {
      if (recordingUrl) URL.revokeObjectURL(recordingUrl);
      recordingUrl = URL.createObjectURL(video);
      document.getElementById('movie').src = recordingUrl;
    }
    renderer.render(0, { pose: startPose }); const beforeRecovery = hashFrame();
    const png = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const pngHeader = png ? Array.from(new Uint8Array(await png.slice(0, 8).arrayBuffer())) : null;
    const extension = renderer.gl.getExtension('WEBGL_lose_context');
    let recovery = 'unavailable';
    if (extension) {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Context restoration timed out')), 5000);
        canvas.addEventListener('webglcontextlost', () => setTimeout(() => extension.restoreContext(), 100), { once: true });
        canvas.addEventListener('webglcontextrestored', () => { clearTimeout(timeout); resolve(); }, { once: true });
        extension.loseContext();
      });
      renderer.render(0, { pose: startPose }); recovery = hashFrame() === beforeRecovery ? 'same-frame-pass' : 'frame-mismatch';
    }
    const sorted = [...frameTimes].sort((a, b) => a - b);
    const result = { browser: navigator.userAgent, renderer: renderer.gl.getParameter(renderer.gl.RENDERER), dimensions: [480, 300], frames: 300,
      frameIntervalMedianMs: sorted[Math.floor(sorted.length * .5)], frameIntervalP95Ms: sorted[Math.floor(sorted.length * .95)],
      routePositions: poses.map(p => p.position), routeHashes: hashes, minimumSampledClearance: Math.min(...poses.map(p => worldDistance(p.position))),
      distinctViews: new Set(hashes).size, pngBytes: png?.size ?? 0, pngHeader, webmBytes: video?.size ?? 0, videoHeader, recovery,
      limits: 'Bounded renderer check, not sustained device performance, app-level capture acceptance, independent review, or human artistic acceptance.' };
    report.textContent = JSON.stringify(result, null, 2);
  } catch (error) { report.textContent = `FAILED: ${error.message}`; }
  finally { if (recorder?.state === 'recording') recorder.stop(); stream?.getTracks().forEach(track => track.stop()); button.disabled = false; }
});
