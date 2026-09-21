const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const prefix = "/planetarium_op/";
const allowed = new Set(["index.html", "install.js", "sw.js", "manifest.webmanifest",
  "icons/dome.svg", "icons/icon-192.png", "icons/icon-512.png"]);
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp" };

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/" || url.pathname === "/planetarium_op") {
    res.writeHead(302, { Location: prefix });
    res.end();
    return;
  }
  const file = url.pathname.startsWith(prefix) ? url.pathname.slice(prefix.length) || "index.html" : "";
  if (!allowed.has(file) && !/^images\/[a-zA-Z0-9_-]+\.(?:webp|png)$/.test(file)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  try {
    const content = await fs.readFile(path.join(root, file));
    res.writeHead(200, { "Content-Type": types[path.extname(file)], "Cache-Control": "no-cache" });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}).listen(4173, "127.0.0.1", () => console.log("Checklist: http://localhost:4173/planetarium_op/"));
