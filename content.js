(() => {
  function extractTokens() {
    const tokens = {};

    try {
      // ✅ Extract from hidden input fields
      document.querySelectorAll('input[type="hidden"]').forEach((input) => {
        if (input.name && input.value) {
          tokens[input.name] = input.value;
        }
      });

      // ✅ Extract from meta tags
      document.querySelectorAll('meta[name]').forEach((meta) => {
        const name = meta.getAttribute("name");
        const content = meta.getAttribute("content");
        if (name && content) tokens[name] = content;
      });

      // ✅ Extract from inline JavaScript variables (window.token = "xyz")
      const scriptMatches = document.body.innerHTML.match(/window\.(\w+)\s*=\s*["'](.*?)["']/g);
      if (scriptMatches) {
        scriptMatches.forEach((match) => {
          const matchData = match.match(/window\.(\w+)\s*=\s*["'](.*?)["']/);
          if (matchData && matchData[1] && matchData[2]) {
            tokens[matchData[1]] = matchData[2];
          }
        });
      }

      // ✅ Extract from JSON-like JavaScript objects
      document.querySelectorAll("script").forEach((script) => {
        if (script.textContent.includes("csrf") || script.textContent.includes("auth")) {
          try {
            const tokenMatches = script.textContent.match(/(['"])(csrf_token|auth_token|session|access_token|jwt|token|bearer)\1\s*:\s*['"]([^'"]+)['"]/g);
            if (tokenMatches) {
              tokenMatches.forEach((match) => {
                const tokenData = match.match(/(['"])(\w+)\1\s*:\s*['"]([^'"]+)['"]/);
                if (tokenData && tokenData[2] && tokenData[3]) {
                  tokens[tokenData[2]] = tokenData[3];
                }
              });
            }
          } catch (e) {
            console.warn("Error parsing inline script for tokens:", e);
          }
        }
      });

      // ✅ Extract from the global `window` object dynamically
      const potentialKeys = ["csrf", "auth", "token", "session", "jwt", "access"];
      Object.keys(window).forEach((key) => {
        if (potentialKeys.some((keyword) => key.toLowerCase().includes(keyword))) {
          try {
            const value = window[key];
            if (typeof value === "string" && value.length > 10) {
              tokens[key] = value;
            }
          } catch (e) {
            console.warn(`Cannot access window.${key}:`, e);
          }
        }
      });

      // ✅ Log extracted tokens (for debugging)
      console.log("Extracted Tokens:", tokens);

      // ✅ Send extracted data to background.js
      chrome.runtime.sendMessage({ action: "extractedTokens", tokens });
    } catch (error) {
      console.error("Token extraction failed:", error);
    }
  }

  // 🔄 Handle dynamically loaded content (SPAs, AJAX)
  const observer = new MutationObserver(() => {
    extractTokens();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Run extraction when the page loads
  extractTokens();
})();