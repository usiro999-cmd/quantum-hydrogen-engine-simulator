import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { explain } from "./api.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const legacyFiles = new Map([
  ["/engine/", ["../index.html", "text/html; charset=utf-8"]],
  ["/engine/styles.css", ["../styles.css", "text/css; charset=utf-8"]],
  ["/engine/src/app.js", ["../src/app.js", "text/javascript; charset=utf-8"]],
  ["/engine/src/simulator.js", ["../src/simulator.js", "text/javascript; charset=utf-8"]]
]);

export async function legacy(req, res) {
  const entry = legacyFiles.get(new URL(req.url, "http://localhost").pathname);
  if (!entry) return false;
  try {
    const data = await readFile(join(root, entry[0]));
    res.writeHead(200, { "Content-Type": entry[1] });
    res.end(data);
  } catch (error) {
    console.error("Legacy page read failed:", error.message);
    res.writeHead(500).end("既存アプリを読み込めませんでした。");
  }
  return true;
}

export async function handleApiAndLegacy(req, res) {
  if (new URL(req.url, "http://localhost").pathname === "/api/explain") {
    await explain(req, res);
    return true;
  }
  return legacy(req, res);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dist = join(root, "dist");
  const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml" };
  createServer(async (req, res) => {
    if (await handleApiAndLegacy(req, res)) return;
    const pathname = new URL(req.url, "http://localhost").pathname;
    const file = resolve(dist, `.${pathname === "/" ? "/index.html" : pathname}`);
    if (!file.startsWith(dist + sep)) return res.writeHead(403).end("Forbidden");
    try {
      const data = await readFile(file);
      res.writeHead(200, { "Content-Type": mime[extname(file)] || "application/octet-stream" }).end(data);
    } catch (error) {
      if (error.code !== "ENOENT") console.error("Static file read failed:", error.message);
      res.writeHead(error.code === "ENOENT" ? 404 : 500).end(error.code === "ENOENT" ? "Not found" : "Server error");
    }
  }).listen(Number(process.env.PORT || 4173), "127.0.0.1", () => console.log(`http://127.0.0.1:${process.env.PORT || 4173}`));
}
