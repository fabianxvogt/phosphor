const status = document.getElementById("updateStatus");
const button = document.getElementById("applyUpdate");

button.onclick = async () => {
  button.disabled = true;
  status.textContent = "Downloading the latest complete release…";
  try {
    if (!("serviceWorker" in navigator))
      throw new Error("Offline updates require HTTPS or localhost.");
    const registration = await navigator.serviceWorker.register("./sw.js", {
      updateViaCache: "none",
    });
    await registration.update();
    const installing = registration.installing;
    if (installing && installing.state !== "installed") {
      await new Promise((resolve, reject) => {
        const changed = () => {
          if (installing.state === "installed") {
            installing.removeEventListener("statechange", changed);
            resolve();
          } else if (installing.state === "redundant") {
            installing.removeEventListener("statechange", changed);
            reject(
              new Error("The release could not be downloaded completely."),
            );
          }
        };
        installing.addEventListener("statechange", changed);
        changed();
      });
    }
    const worker = registration.waiting ?? registration.active;
    if (!worker) throw new Error("No complete release is available yet.");
    const channel = new MessageChannel();
    const result = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        channel.port1.close();
        reject(
          new Error(
            "The update did not respond. Your current app is unchanged.",
          ),
        );
      }, 10000);
      channel.port1.onmessage = ({ data }) => {
        clearTimeout(timer);
        channel.port1.close();
        resolve(data);
      };
      worker.postMessage({ type: "activate-release" }, [channel.port2]);
    });
    if (result.blocked) {
      status.textContent =
        "Close other Phosphor tabs and windows, including the stage, then try again. Keep this updater open. Their output has not been interrupted.";
      return;
    }
    if (!result.ready) throw new Error("The release was not activated.");
    // Activation finishes only after clients.claim(), so navigation and the
    // entire module graph use the new offline generation, not the old cache.
    if (worker.state !== "activated") {
      await new Promise((resolve, reject) => {
        const changed = () => {
          if (worker.state === "activated") {
            worker.removeEventListener("statechange", changed);
            resolve();
          } else if (worker.state === "redundant") {
            worker.removeEventListener("statechange", changed);
            reject(new Error("The release could not be activated."));
          }
        };
        worker.addEventListener("statechange", changed);
        changed();
      });
    }
    location.replace("./");
  } catch (error) {
    status.textContent = `Update failed: ${error.message}`;
  } finally {
    button.disabled = false;
  }
};
