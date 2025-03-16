export function handleErrors(error) {
  console.error("Error:", error.message);
  chrome.runtime.sendMessage({ action: "configGenerated", config: "# Error: Failed to generate config." });
}