export function parseResponse(body, contentType) {
  if (!body || typeof body !== "string") return {};

  try {
    if (contentType.includes("application/json")) {
      return parseJSONResponse(body);
    } else if (contentType.includes("text/html")) {
      return parseHTMLResponse(body);
    } else if (contentType.includes("text/plain")) {
      return { text: body };
    } else if (contentType.includes("application/xml") || contentType.includes("text/xml")) {
      return parseXMLResponse(body);
    }
  } catch (error) {
    console.error("Error parsing response:", error);
  }

  return {};
}

// 🔥 Improved JSON Parsing: Extracts tokens from deeply nested objects
function parseJSONResponse(body) {
  try {
    const jsonData = JSON.parse(body);
    const tokens = extractTokensFromJSON(jsonData);
    return Object.keys(tokens).length > 0 ? tokens : jsonData;
  } catch (error) {
    console.error("JSON parsing error:", error);
    return {};
  }
}

// Recursive function to extract tokens from nested JSON
function extractTokensFromJSON(obj, keys = ["csrf_token", "auth_token", "session", "access_token"]) {
  let extractedTokens = {};

  function recurse(obj) {
    if (typeof obj !== "object" || obj === null) return;
    for (let key in obj) {
      if (keys.includes(key) && obj[key]) {
        extractedTokens[key] = obj[key];
      }
      if (typeof obj[key] === "object") {
        recurse(obj[key]);
      }
    }
  }

  recurse(obj);
  return extractedTokens;
}

// 🔥 Enhanced HTML Parsing: Extracts multiple form inputs, meta tags, and inline data
function parseHTMLResponse(body) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(body, "text/html");
    const tokens = {};

    // Extract tokens from input fields
    doc.querySelectorAll('input[type="hidden"]').forEach((input) => {
      if (input.name && input.value) tokens[input.name] = input.value;
    });

    // Extract tokens from meta tags
    doc.querySelectorAll('meta[name]').forEach((meta) => {
      const name = meta.getAttribute("name");
      const content = meta.getAttribute("content");
      if (name && content) tokens[name] = content;
    });

    // Extract inline script tokens (window.token = "xyz")
    const scriptMatches = body.match(/window\.(csrf_token|auth_token|session|access_token)\s*=\s*["'](.*?)["']/g);
    if (scriptMatches) {
      scriptMatches.forEach((match) => {
        const [, key, value] = match.match(/window\.(\w+)\s*=\s*["'](.*?)["']/);
        if (key && value) tokens[key] = value;
      });
    }

    return Object.keys(tokens).length > 0 ? tokens : {};
  } catch (error) {
    console.error("HTML parsing error:", error);
    return {};
  }
}

// 🔥 Improved XML Parsing: Uses XPath for better extraction
function parseXMLResponse(body) {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(body, "text/xml");
    const tokens = {};

    // Extract tokens using XPath for better accuracy
    const tokenNames = ["csrf_token", "auth_token", "session", "access_token"];
    const xpath = tokenNames.map((name) => `//${name}`).join(" | ");
    const result = xmlDoc.evaluate(xpath, xmlDoc, null, XPathResult.ANY_TYPE, null);

    let node;
    while ((node = result.iterateNext())) {
      tokens[node.nodeName] = node.textContent.trim();
    }

    return Object.keys(tokens).length > 0 ? tokens : {};
  } catch (error) {
    console.error("XML parsing error:", error);
    return {};
  }
}