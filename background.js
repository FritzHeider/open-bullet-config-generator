import { parseResponse } from "./utils/parse.js";
import { generateConfig } from "./utils/generateConfig.js";
import { handleErrors } from "./utils/errorHandler.js";

let recordedRequests = [];
let extractedTokens = {}; // 🔥 Stores extracted tokens from content.js

// 🔄 Injects `content.js` into the active tab when recording starts
async function injectContentScript() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
      });
      console.log("Injected content.js into active tab.");
    }
  } catch (error) {
    console.error("Error injecting content.js:", error);
  }
}

// 🎯 Listen for network requests (GET & POST)
chrome.webRequest.onBeforeRequest.addListener(
  async (details) => {
    try {
      let requestData = {
        url: details.url,
        method: details.method,
        headers: details.requestHeaders || [],
        body: details.method === "POST" && details.requestBody
          ? new TextDecoder().decode(details.requestBody.raw?.[0]?.bytes || new Uint8Array())
          : null,
      };

      recordedRequests.push(requestData);
      console.log("Recorded Request:", requestData);
    } catch (error) {
      handleErrors(error);
    }
  },
  { urls: ["<all_urls>"] },
  ["requestBody", "extraHeaders"]
);

// 🎯 Listen for network responses
chrome.webRequest.onCompleted.addListener(
  async (details) => {
    try {
      const cookies = await new Promise((resolve) => {
        chrome.cookies.getAll({ url: details.url }, resolve);
      });

      let responseData = {
        url: details.url,
        statusCode: details.statusCode,
        cookies: cookies.map((cookie) => ({ name: cookie.name, value: cookie.value })),
        responseHeaders: details.responseHeaders || [],
      };

      recordedRequests.push(responseData);
      console.log("Recorded Response:", responseData);
    } catch (error) {
      handleErrors(error);
    }
  },
  { urls: ["<all_urls>"] }
);

// 🎯 Save recorded requests to Chrome storage
async function saveRequests() {
  try {
    await chrome.storage.local.set({ recordedRequests });
    console.log("Requests saved successfully.");
  } catch (error) {
    handleErrors(error);
  }
}

// 🎯 Generate OpenBullet config from recorded data + extracted tokens
async function generateOBConfig() {
  try {
    const data = await chrome.storage.local.get(["recordedRequests", "extractedTokens"]);
    if (!data.recordedRequests || data.recordedRequests.length === 0) {
      throw new Error("No recorded requests found.");
    }

    const requests = data.recordedRequests;
    extractedTokens = data.extractedTokens || {}; // 🔥 Load extracted tokens

    let config = "";

    requests.forEach((request) => {
      if (request.method === "POST") {
        // Extract tokens & headers
        const contentType = request.responseHeaders?.find((header) => header.name.toLowerCase() === "content-type")?.value;
        const parsedResponse = parseResponse(request.body, contentType);

        if (parsedResponse?.csrf_token || extractedTokens?.csrf_token) {
          config += `# Extracted CSRF Token: ${parsedResponse?.csrf_token || extractedTokens.csrf_token}\n`;
        }
        if (parsedResponse?.auth_token || extractedTokens?.auth_token) {
          config += `# Extracted Auth Token: ${parsedResponse?.auth_token || extractedTokens.auth_token}\n`;
        }

        // Generate OpenBullet request
        config += `REQUEST POST "${request.url}" AutoRedirect=FALSE\n`;
        config += `  CONTENT "${request.body}"\n`;
        config += `  CONTENTTYPE "${contentType || "application/x-www-form-urlencoded"}"\n`;

        // Include cookies in the config
        request.cookies.forEach((cookie) => {
          config += `  COOKIE "${cookie.name}: ${cookie.value}"\n`;
        });

        // Include headers
        request.headers.forEach((header) => {
          config += `  HEADER "${header.name}: ${header.value}"\n`;
        });

        config += "\n";
      }
    });

    // Send config to popup
    chrome.runtime.sendMessage({ action: "configGenerated", config });
  } catch (error) {
    handleErrors(error);
  }
}

// 🔥 Listen for extracted tokens from content.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "extractedTokens") {
    console.log("Received Extracted Tokens:", message.tokens);
    extractedTokens = message.tokens;

    // Save extracted tokens
    chrome.storage.local.set({ extractedTokens }, () => {
      console.log("Extracted tokens saved.");
    });
  } else if (message.action === "saveRequests") {
    injectContentScript(); // 🔥 Ensure content script runs before saving
    saveRequests();
  } else if (message.action === "generateConfig") {
    generateOBConfig();
  }
});