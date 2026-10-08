import { OutputConnection } from "./ui-state.mjs";
const video = document.getElementById("output"),
  message = document.getElementById("message");
let wake;
const connection = new OutputConnection(video, (text) => {
  message.textContent = text;
});
async function awake() {
  try {
    wake = await navigator.wakeLock?.request("screen");
  } catch {}
}
if (!window.opener || window.opener.closed)
  message.textContent =
    "Open this window with “Open clean output” from Phosphor.";
function driveOutput(now) {
  if (window.opener && !window.opener.closed) {
    connection.refresh(window.opener.__phosphor);
    if (window.opener.document.visibilityState !== "visible") {
      const parentTime =
        performance.timeOrigin + now - window.opener.performance.timeOrigin;
      window.opener.__phosphor?.outputFrame(parentTime);
    }
    requestAnimationFrame(driveOutput);
  } else {
    message.textContent =
      "Performance window closed. Reopen the instrument to reconnect.";
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
  connection.dispose();
  wake?.release();
});
