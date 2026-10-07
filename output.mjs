const video = document.getElementById("output"),
  message = document.getElementById("message");
let stream, wake;
async function awake() {
  try {
    wake = await navigator.wakeLock?.request("screen");
  } catch {}
}
try {
  if (!window.opener || window.opener.closed)
    throw new Error("Open this window with “Open clean output” from Phosphor.");
  stream = window.opener.__phosphor.outputStream();
  video.srcObject = stream;
  await video.play();
  message.textContent =
    "Move this window to your projector, then enter fullscreen. Audio stays in the control window.";
} catch (e) {
  message.textContent = e.message;
}
function driveOutput(now) {
  if (window.opener && !window.opener.closed) {
    if (window.opener.document.visibilityState !== "visible") {
      const parentTime = performance.timeOrigin + now - window.opener.performance.timeOrigin;
      window.opener.__phosphor?.outputFrame(parentTime);
    }
    requestAnimationFrame(driveOutput);
  } else {
    message.textContent = "Performance window closed. Reopen the instrument to reconnect.";
    document.getElementById("controls").style.display = "block";
  }
}
requestAnimationFrame(driveOutput);
document.getElementById("fullscreen").onclick = async () => {
  try {
    await document.body.requestFullscreen();
    await awake();
  } catch (e) {
    message.textContent = e.message;
  }
};
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") awake();
});
window.addEventListener("pagehide", () => {
  stream?.getTracks().forEach((t) => t.stop());
  wake?.release();
});
