// Static SPA server untuk hasil build Vite (frontend).
// Pengganti nginx: tanpa dependency, SPA fallback ke index.html, aman dari path traversal.
const http = require("http");
const fs = require("fs");
const path = require("path");

const DIST = path.join(__dirname, "build");
const PORT = process.env.PORT || 3000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json",
};

function safeResolve(urlPath) {
  // urlPath sudah dimulai "/". Gabung dengan DIST lalu normalisasi,
  // dan tolak jika keluar dari DIST (cegah traversal seperti /../).
  const file = path.normalize(path.join(DIST, urlPath));
  if (!file.startsWith(DIST)) return null;
  return file;
}

http
  .createServer((req, res) => {
    let urlPath;
    try {
      urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    } catch {
      res.writeHead(400);
      res.end("Bad Request");
      return;
    }
    if (urlPath === "/") urlPath = "/index.html";

    let filePath = safeResolve(urlPath);
    let ext = path.extname(filePath).toLowerCase();

    // SPA fallback: path tidak ada → index.html (routing client-side React).
    if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(DIST, "index.html");
      ext = ".html";
    }

    const type = MIME[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-cache" });
    fs.createReadStream(filePath).pipe(res);
  })
  .listen(PORT, "0.0.0.0", () => {
    console.log(`Ayam Bakar Nusantara frontend serving ${DIST} on :${PORT}`);
  });