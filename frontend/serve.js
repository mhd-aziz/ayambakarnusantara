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

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Cross-Origin-Opener-Policy": "same-origin",
};

function cacheControlFor(urlPath, ext) {
  if (urlPath.startsWith("/assets/")) {
    return "public, max-age=31536000, immutable";
  }
  if (ext === ".html") return "no-cache";
  return "public, max-age=3600";
}

http
  .createServer((req, res) => {
    let urlPath;
    try {
      urlPath = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname
      );
    } catch {
      res.writeHead(400, SECURITY_HEADERS);
      res.end("Bad Request");
      return;
    }
    if (urlPath === "/") urlPath = "/index.html";

    // Jangan telan /api/* dengan SPA fallback — kembalikan 404 agar tidak sembunyikan error API
    if (urlPath.startsWith("/api/")) {
      res.writeHead(404, {
        "Content-Type": "application/json; charset=utf-8",
        ...SECURITY_HEADERS,
      });
      res.end(JSON.stringify({ message: "Not Found" }));
      return;
    }

    const isHead = req.method === "HEAD";
    // Hanya layani GET/HEAD untuk aset statis; method lain 405
    if (req.method !== "GET" && !isHead) {
      res.writeHead(405, {
        ...SECURITY_HEADERS,
        Allow: "GET, HEAD",
      });
      res.end("Method Not Allowed");
      return;
    }

    let filePath = safeResolve(urlPath);
    let ext = path.extname(filePath || "").toLowerCase();

    const serveFile = (fp, fileExt, cacheUrlPath) => {
      const type = MIME[fileExt] || "application/octet-stream";
      const headers = {
        "Content-Type": type,
        "Cache-Control": cacheControlFor(cacheUrlPath, fileExt),
        ...SECURITY_HEADERS,
      };
      try {
        const stat = fs.statSync(fp);
        headers["Content-Length"] = stat.size;
      } catch {}
      res.writeHead(200, headers);
      if (isHead) {
        res.end();
        return;
      }
      const stream = fs.createReadStream(fp);
      stream.on("error", () => {
        if (!res.headersSent) {
          res.writeHead(500, SECURITY_HEADERS);
        }
        res.end("Internal Server Error");
      });
      stream.pipe(res);
    };

    // Cek file ada & bukan direktori — pakai sync yang sudah ada tapi tanpa blokir ganda;
    // tetap aman karena safeResolve sudah cegah traversal. Async penuh bisa di-upgrade nanti.
    let exists = false;
    let isDir = false;
    if (filePath) {
      try {
        exists = fs.existsSync(filePath);
        if (exists) isDir = fs.statSync(filePath).isDirectory();
      } catch {
        exists = false;
      }
    }

    if (!filePath || !exists || isDir) {
      // SPA fallback: routing client-side React
      filePath = path.join(DIST, "index.html");
      ext = ".html";
      serveFile(filePath, ext, urlPath);
      return;
    }

    serveFile(filePath, ext, urlPath);
  })
  .listen(PORT, "0.0.0.0", () => {
    console.log(`Ayam Bakar Nusantara frontend serving ${DIST} on :${PORT}`);
  });