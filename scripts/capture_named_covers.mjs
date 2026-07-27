#!/usr/bin/env node
/**
 * Capture square PNG covers for the named-ship gallery via the live customizer.
 *
 * Requires: playwright chromium, python3 http.server on PORT.
 *
 *   python3 -m http.server 8765
 *   node scripts/capture_named_covers.mjs
 *
 * Also writes 320px thumbs under assets/named-covers/thumbs/ (needs Pillow).
 */
import { chromium } from "playwright";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "assets", "named-covers");
const THUMBS = path.join(OUT, "thumbs");
const PORT = process.env.COVER_PORT || "8765";
const BASE = `http://127.0.0.1:${PORT}`;

/** Match gallery hrefs / SHIPS.parametric defaults in app.js. */
const PRESET_QUERY = {
  ship: "parametric",
  side: "right",
  style: "raised",
  scale: "100",
  size: "3.5",
  pos: "30",
  text: "1c1c1c",
  font: "oswald-bold",
};

const PRESETS = [
  { name: "S40", file: "s40.png" },
  { name: "S33", file: "s33.png" },
  { name: "IFT-12", file: "ift-12.png" },
  { name: "Starship", file: "starship.png" },
];

function dataUrlToBuffer(dataUrl) {
  const m = /^data:image\/png;base64,(.+)$/.exec(dataUrl);
  if (!m) throw new Error("expected png data URL");
  return Buffer.from(m[1], "base64");
}

function writeThumbs() {
  fs.mkdirSync(THUMBS, { recursive: true });
  const py = `
from pathlib import Path
from PIL import Image
root = Path(${JSON.stringify(OUT)})
thumbs = Path(${JSON.stringify(THUMBS)})
for src in sorted(root.glob("*.png")):
    if src.parent.name == "thumbs":
        continue
    img = Image.open(src).convert("RGB")
    img.resize((320, 320), Image.Resampling.LANCZOS).save(
        thumbs / src.name, optimize=True
    )
    print("thumb", src.name)
`;
  const r = spawnSync("python3", ["-c", py], { encoding: "utf8" });
  if (r.status !== 0) {
    console.warn("thumb resize skipped:", r.stderr || r.stdout);
  } else {
    process.stdout.write(r.stdout);
  }
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });

  for (const preset of PRESETS) {
    const q = new URLSearchParams({ ...PRESET_QUERY, name: preset.name });
    const url = `${BASE}/index.html?${q.toString()}`;
    console.log("open", url);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.waitForFunction(
      () => {
        const s = document.getElementById("status")?.textContent || "";
        return (
          typeof window.__starshipCaptureCover === "function" &&
          (s.startsWith("Ready") || s.includes("Preset") || s.includes("downloaded"))
        );
      },
      { timeout: 180_000 }
    );
    // Let the first rebuild settle after URL name apply.
    await page.waitForTimeout(1500);
    const dataUrl = await page.evaluate(async () => {
      return await window.__starshipCaptureCover();
    });
    const buf = dataUrlToBuffer(dataUrl);
    const dest = path.join(OUT, preset.file);
    fs.writeFileSync(dest, buf);
    console.log(`wrote ${path.relative(ROOT, dest)} (${buf.length} bytes)`);
  }

  await browser.close();
  writeThumbs();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
