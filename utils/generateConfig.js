export function generateConfig(requests) {
  try {
    let config = "";

    requests.forEach((request, index) => {
      try {
        if (!request.url || !request.method) return;

        // 📝 Start building the request block
        config += `REQUEST ${request.method} "${request.url}" AutoRedirect=FALSE\n`;

        // 🔄 Handle GET parameters properly
        if (request.method === "GET" && request.url.includes("?")) {
          config += `  QUERY_PARAMS "${request.url.split("?")[1]}"\n`;
        }

        // 🔥 Handle POST body
        if (request.method === "POST" && request.body) {
          config += `  CONTENT "${request.body.replace(/\n/g, "")}"\n`; // Ensures no newlines in content
        }

        // 🏷️ Detect and set Content-Type dynamically
        const contentTypeHeader = request.headers?.find((header) =>
          header.name.toLowerCase() === "content-type"
        );
        const contentType = contentTypeHeader ? contentTypeHeader.value : "application/x-www-form-urlencoded";
        config += `  CONTENTTYPE "${contentType}"\n`;

        // 🍪 Add Cookies if available
        if (request.cookies?.length) {
          request.cookies.forEach((cookie) => {
            config += `  COOKIE "${cookie.name}: ${cookie.value}"\n`;
          });
        }

        // 📨 Add Headers (excluding unnecessary ones)
        if (request.headers?.length) {
          request.headers
            .filter(header => !["content-length", "host"].includes(header.name.toLowerCase())) // Exclude some headers
            .forEach((header) => {
              config += `  HEADER "${header.name}: ${header.value}"\n`;
            });
        }

        config += "\n"; // Separate requests with a newline
      } catch (err) {
        console.error(`Error processing request #${index}:`, err);
      }
    });

    return config.trim(); // Removes trailing newline
  } catch (error) {
    console.error("Fatal error generating OpenBullet config:", error);
    return "";
  }
}