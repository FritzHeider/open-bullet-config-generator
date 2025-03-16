document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("start");
  const stopBtn = document.getElementById("stop");
  const statusMessage = document.getElementById("statusMessage");

  if (!startBtn || !stopBtn || !statusMessage) {
    console.error("UI elements not found in popup.html");
    return;
  }

  startBtn.addEventListener("click", async () => {
    try {
      if (startBtn.disabled) return;
      toggleButton(startBtn, true, "Recording...");

      updateStatus("🔴 Recording network activity...", "info");
      await sendMessage({ action: "saveRequests" });

      toggleButton(startBtn, false, "Start Recording");
      updateStatus("✅ Recording started. Perform the login process.", "success");
    } catch (error) {
      toggleButton(startBtn, false, "Start Recording");
      updateStatus("❌ Failed to start recording. See console for details.", "error");
      console.error("Error starting request recording:", error);
    }
  });

  stopBtn.addEventListener("click", async () => {
    try {
      if (stopBtn.disabled) return;
      toggleButton(stopBtn, true, "Generating Config...");

      updateStatus("⚙️ Processing recorded requests...", "info");
      const response = await sendMessage({ action: "generateConfig" });

      if (response?.config) {
        downloadConfig(response.config);
        updateStatus("✅ Config file generated successfully.", "success");
      } else {
        updateStatus("⚠️ No data recorded. Try again.", "warning");
        console.warn("No data recorded.");
      }

      toggleButton(stopBtn, false, "Stop & Generate Config");
    } catch (error) {
      toggleButton(stopBtn, false, "Stop & Generate Config");
      updateStatus("❌ Failed to generate config. See console for details.", "error");
      console.error("Error generating OpenBullet config:", error);
    }
  });
});

// 🔄 Helper function to send messages with Promises
function sendMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      resolve(response);
    });
  });
}

// 📥 Helper function to download the config file
function downloadConfig(config) {
  const timestamp = new Date().toISOString().replace(/[:.-]/g, "_");
  const filename = `openbullet_config_${timestamp}.loli`;

  const blob = new Blob([config], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 🎨 Helper function to update UI (Button states)
function toggleButton(button, disable, text) {
  button.textContent = text;
  button.disabled = disable;
  button.dataset.loading = disable; // Adds a loading state
}

// 🛠️ Helper function to update the status message in the popup
function updateStatus(message, type) {
  const statusMessage = document.getElementById("statusMessage");
  if (!statusMessage) return;

  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  statusMessage.style.opacity = 1;

  // Auto-clear message after 4 seconds
  setTimeout(() => {
    statusMessage.style.opacity = 0;
  }, 4000);
}