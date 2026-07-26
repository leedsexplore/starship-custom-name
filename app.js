import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { STLExporter } from "three/addons/exporters/STLExporter.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";

/** Placement tuned to Josh1297 Starship mesh (same as openscad/). */
const BODY_CENTER_X = -22.3;
const HULL_RADIUS_Z = 10.55;
const EMBED_MM = 0.35;
/** Approx safe text span along hull before flaps (mm). */
const SAFE_TEXT_SPAN_MM = 48;
const SHIP_URL = "./assets/StarShipV2_original.stl";

/** Available extruded fonts (Three.js typeface JSON). */
const FONT_OPTIONS = {
  "optimer-bold": {
    label: "Optimer Bold",
    url: "./fonts/optimer_bold.typeface.json",
  },
  "optimer-regular": {
    label: "Optimer Regular",
    url: "./fonts/optimer_regular.typeface.json",
  },
  "helvetiker-bold": {
    label: "Helvetiker Bold",
    url: "./fonts/helvetiker_bold.typeface.json",
  },
  "helvetiker-regular": {
    label: "Helvetiker Regular",
    url: "./fonts/helvetiker_regular.typeface.json",
  },
  "gentilis-bold": {
    label: "Gentilis Bold",
    url: "./fonts/gentilis_bold.typeface.json",
  },
};

/** Prusa filament + Starship / space-theme preview defaults. */
const COLOR_PRESETS = [
  { id: "signal-red", name: "Signal Red", hex: "#e10600" },
  { id: "prusa-orange", name: "Prusa Orange", hex: "#fa6831" },
  { id: "starship-steel", name: "Starship Steel", hex: "#c8ced6" },
  { id: "pearl-white", name: "Pearl White", hex: "#f2f0e6" },
  { id: "jet-black", name: "Jet Black", hex: "#1c1c1c" },
  { id: "heatshield", name: "Heatshield", hex: "#3a3734" },
  { id: "prusa-azure", name: "Prusa Azure", hex: "#0077c8" },
];

/** Fold unsupported accented letters to ASCII lookalikes when needed. */
const ACCENT_FOLD = {
  Á: "A", À: "A", Â: "A", Ä: "A", Ã: "A", Å: "A", Æ: "AE",
  É: "E", È: "E", Ê: "E", Ë: "E",
  Í: "I", Ì: "I", Î: "I", Ï: "I",
  Ó: "O", Ò: "O", Ô: "O", Ö: "O", Õ: "O", Ø: "O",
  Ú: "U", Ù: "U", Û: "U", Ü: "U",
  Ý: "Y", Ñ: "N", Ç: "C",
  á: "a", à: "a", â: "a", ä: "a", ã: "a", å: "a", æ: "ae",
  é: "e", è: "e", ê: "e", ë: "e",
  í: "i", ì: "i", î: "i", ï: "i",
  ó: "o", ò: "o", ô: "o", ö: "o", õ: "o", ø: "o",
  ú: "u", ù: "u", û: "u", ü: "u",
  ý: "y", ÿ: "y", ñ: "n", ç: "c", ß: "ss",
};

const el = {
  form: document.getElementById("controls"),
  name: document.getElementById("name"),
  color: document.getElementById("color"),
  textColor: document.getElementById("text-color"),
  size: document.getElementById("size"),
  pos: document.getElementById("pos"),
  depth: document.getElementById("depth"),
  wrap: document.getElementById("wrap"),
  sizeLabel: document.getElementById("size-label"),
  posLabel: document.getElementById("pos-label"),
  depthLabel: document.getElementById("depth-label"),
  download: document.getElementById("download"),
  copyLink: document.getElementById("copy-link"),
  resetView: document.getElementById("reset-view"),
  fitSize: document.getElementById("fit-size"),
  status: document.getElementById("status"),
  glyphWarn: document.getElementById("glyph-warn"),
  lengthWarn: document.getElementById("length-warn"),
  hullPresets: document.getElementById("hull-presets"),
  textPresets: document.getElementById("text-presets"),
  fontStyle: document.getElementById("font-style"),
  viewport: document.getElementById("viewport"),
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a101c);

const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 2000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
el.viewport.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

scene.add(new THREE.AmbientLight(0xffffff, 0.45));
const key = new THREE.DirectionalLight(0xffffff, 1.25);
key.position.set(40, 70, 90);
scene.add(key);
const fill = new THREE.DirectionalLight(0x9eb6ff, 0.35);
fill.position.set(-60, -30, -40);
scene.add(fill);
const rim = new THREE.DirectionalLight(0xffe0c0, 0.35);
rim.position.set(-20, 40, 100);
scene.add(rim);

const shipMaterial = new THREE.MeshStandardMaterial({
  color: new THREE.Color(el.color.value),
  metalness: 0.42,
  roughness: 0.4,
});
const textMaterial = new THREE.MeshStandardMaterial({
  color: new THREE.Color(el.textColor.value),
  metalness: 0.2,
  roughness: 0.55,
  side: THREE.DoubleSide,
});

let font = null;
let fontGlyphs = new Set();
let currentFontId = "optimer-bold";
const fontCache = new Map();
let shipGeometry = null;
let shipMesh = null;
let textMesh = null;
let ready = false;
let rebuildTimer = 0;
let lastSpanMm = 0;

async function loadFontById(fontId) {
  const id = FONT_OPTIONS[fontId] ? fontId : "optimer-bold";
  if (fontCache.has(id)) {
    return { id, font: fontCache.get(id) };
  }
  const loader = new FontLoader();
  const loaded = await loader.loadAsync(FONT_OPTIONS[id].url);
  fontCache.set(id, loaded);
  return { id, font: loaded };
}

async function applyFontSelection(fontId, { rebuild = true } = {}) {
  setStatus("Loading font…");
  const { id, font: loaded } = await loadFontById(fontId);
  font = loaded;
  currentFontId = id;
  fontGlyphs = new Set(Object.keys(font.data?.glyphs || {}));
  if (el.fontStyle.value !== id) el.fontStyle.value = id;
  if (rebuild && ready) {
    await flushRebuild();
    writeUrl();
    setStatus(`Font: ${FONT_OPTIONS[id].label}`);
  }
}

function setStatus(msg, isError = false) {
  el.status.textContent = msg;
  el.status.classList.toggle("error", isError);
}

function selectedSide() {
  return document.querySelector('input[name="side"]:checked')?.value === "left"
    ? "left"
    : "right";
}

function selectedStyle() {
  return document.querySelector('input[name="style"]:checked')?.value ===
    "engraved"
    ? "engraved"
    : "raised";
}

function resize() {
  const { clientWidth: w, clientHeight: h } = el.viewport;
  camera.aspect = w / Math.max(h, 1);
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}

function updateLabels() {
  el.sizeLabel.textContent = `${Number(el.size.value).toFixed(1)} mm`;
  el.posLabel.textContent = el.pos.value;
  el.depthLabel.textContent = `${Number(el.depth.value).toFixed(2)} mm`;
}

function mountPresets(container, input) {
  container.replaceChildren();
  for (const preset of COLOR_PRESETS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "swatch";
    btn.style.background = preset.hex;
    btn.dataset.color = preset.hex;
    btn.title = preset.name;
    btn.setAttribute("aria-label", preset.name);
    btn.innerHTML = `<span class="swatch-name">${preset.name}</span>`;
    btn.addEventListener("click", () => {
      input.value = preset.hex;
      applyColor();
      writeUrl();
    });
    container.appendChild(btn);
  }
}

function syncPresetActive(container, hex) {
  const wanted = hex.toLowerCase();
  for (const btn of container.querySelectorAll(".swatch")) {
    btn.classList.toggle("active", btn.dataset.color.toLowerCase() === wanted);
  }
}

function applyColor() {
  shipMaterial.color.set(el.color.value);
  textMaterial.color.set(el.textColor.value);
  // Dark hulls: a touch of emissive keeps letter edges readable in the preview.
  const hsl = { h: 0, s: 0, l: 0 };
  shipMaterial.color.getHSL(hsl);
  textMaterial.emissive.setHex(hsl.l < 0.22 ? 0x1a1a1a : 0x000000);
  syncPresetActive(el.hullPresets, el.color.value);
  syncPresetActive(el.textPresets, el.textColor.value);
}

function sanitizeName(raw) {
  const text = (raw || "").slice(0, 24);
  if (!fontGlyphs.size) {
    return { display: text || " ", missing: [], folded: [], used: text || " " };
  }

  const missing = [];
  const folded = [];
  let used = "";

  for (const ch of text) {
    if (ch === " " || fontGlyphs.has(ch)) {
      used += ch;
      continue;
    }
    const replacement = ACCENT_FOLD[ch];
    if (replacement && [...replacement].every((c) => fontGlyphs.has(c))) {
      used += replacement;
      folded.push(`${ch}→${replacement}`);
      continue;
    }
    if (!missing.includes(ch)) missing.push(ch);
  }

  used = used.replace(/\s+/g, " ").trim();
  return { display: text, missing, folded, used: used || " " };
}

function updateGlyphWarn(missing, folded) {
  const parts = [];
  if (folded.length) {
    parts.push(`Simplified: ${folded.join(", ")}`);
  }
  if (missing.length) {
    parts.push(
      `Skipped (not in font): ${missing.map((c) => JSON.stringify(c)).join(", ")}`
    );
  }
  if (!parts.length) {
    el.glyphWarn.hidden = true;
    el.glyphWarn.textContent = "";
    return;
  }
  el.glyphWarn.hidden = false;
  el.glyphWarn.textContent = parts.join(" · ");
}

function updateLengthWarn(spanMm) {
  lastSpanMm = spanMm;
  if (spanMm <= SAFE_TEXT_SPAN_MM) {
    el.lengthWarn.hidden = true;
    el.lengthWarn.textContent = "";
    return;
  }
  el.lengthWarn.hidden = false;
  el.lengthWarn.textContent = `Text is ~${spanMm.toFixed(0)} mm long (safe band ~${SAFE_TEXT_SPAN_MM} mm). Use “Fit text to hull” or shorten the name.`;
}

function buildFlatTextGeometry(text, size, extrudeMm) {
  // TextGeometry (three r160) maps parameters.height → extrude depth.
  // Passing only `depth` is ignored and defaults to 50mm — do not do that.
  const geometry = new TextGeometry(text, {
    font,
    size,
    height: extrudeMm,
    curveSegments: 8,
    bevelEnabled: false,
  });
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox;
  geometry.translate(
    -(bb.min.x + bb.max.x) / 2,
    -(bb.min.y + bb.max.y) / 2,
    0
  );
  // Letters run along +Y (ship length); letter height along ±X; extrude +Z.
  geometry.rotateZ(Math.PI / 2);
  return geometry;
}

/**
 * Bend flat text onto the cylindrical hull (axis // Y through body center).
 * Writes world-space coordinates into the geometry.
 */
function wrapGeometryToHull(geometry, side, textY, style) {
  const sign = side === "right" ? 1 : -1;
  const R = HULL_RADIUS_Z;
  const pos = geometry.attributes.position;
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    // Flip across-axis on left so text reads correctly from outside.
    const across = side === "left" ? -v.x : v.x;
    const along = v.y;
    // Raised: z=0 sits slightly inside hull, z=depth ends proud of surface.
    // Engraved: z=0 at surface, z=depth cuts inward toward the axis.
    const radial = style === "raised" ? R - EMBED_MM + v.z : R - v.z;
    const theta = across / R;
    const x = BODY_CENTER_X + radial * Math.sin(theta);
    const z = sign * radial * Math.cos(theta);
    const y = textY + along;
    pos.setXYZ(i, x, y, z);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function placeFlatOnHull(geometry, side, textY, style) {
  const sign = side === "right" ? 1 : -1;
  const mesh = new THREE.Mesh(geometry, textMaterial);
  if (style === "raised") {
    mesh.position.set(BODY_CENTER_X, textY, sign * (HULL_RADIUS_Z - EMBED_MM));
    if (side === "left") mesh.rotation.y = Math.PI;
  } else {
    // Engraved flat: start at outer surface, extrude toward hull axis (-Z local after flip).
    mesh.position.set(BODY_CENTER_X, textY, sign * HULL_RADIUS_Z);
    mesh.rotation.y = side === "left" ? 0 : Math.PI;
  }
  return mesh;
}

function measureSpan(geometry) {
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox;
  return Math.max(bb.max.y - bb.min.y, bb.max.x - bb.min.x, 0);
}

function rebuildText() {
  if (!font || !ready) return Promise.resolve();

  const proud = Number(el.depth.value);
  const totalDepth = EMBED_MM + proud;
  const side = selectedSide();
  const style = selectedStyle();
  const textY = Number(el.pos.value);
  const wrap = el.wrap.checked;
  const { missing, folded, used } = sanitizeName(el.name.value);
  updateGlyphWarn(missing, folded);

  const flat = buildFlatTextGeometry(
    used,
    Number(el.size.value),
    totalDepth
  );
  const spanMm = measureSpan(flat);
  updateLengthWarn(spanMm);

  if (textMesh) {
    scene.remove(textMesh);
    textMesh.geometry.dispose();
    textMesh = null;
  }

  if (wrap) {
    wrapGeometryToHull(flat, side, textY, style);
    textMesh = new THREE.Mesh(flat, textMaterial);
  } else {
    textMesh = placeFlatOnHull(flat, side, textY, style);
  }

  scene.add(textMesh);
  return Promise.resolve();
}

function scheduleRebuild() {
  updateLabels();
  window.clearTimeout(rebuildTimer);
  return new Promise((resolve) => {
    rebuildTimer = window.setTimeout(() => {
      rebuildText().then(resolve);
    }, 120);
  });
}

function flushRebuild() {
  window.clearTimeout(rebuildTimer);
  return rebuildText();
}

function frameCamera() {
  if (!shipMesh) return;
  const box = new THREE.Box3().setFromObject(shipMesh);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  controls.target.copy(center);
  const maxDim = Math.max(size.x, size.y, size.z);
  const zDir = selectedSide() === "right" ? 1 : -1;
  camera.position.set(
    center.x + maxDim * 0.35,
    center.y + maxDim * 0.05,
    center.z + zDir * maxDim * 1.55
  );
  controls.update();
}

function normalizeHex(value) {
  if (!value) return null;
  const hex = value.startsWith("#") ? value : `#${value}`;
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.toLowerCase() : null;
}

function readState() {
  return {
    name: el.name.value.trim(),
    color: el.color.value.replace("#", ""),
    text: el.textColor.value.replace("#", ""),
    font: currentFontId || el.fontStyle.value || "optimer-bold",
    size: el.size.value,
    pos: el.pos.value,
    depth: el.depth.value,
    side: selectedSide(),
    style: selectedStyle(),
    wrap: el.wrap.checked ? "1" : "0",
  };
}

function applyState(state) {
  if (state.name != null) el.name.value = String(state.name).slice(0, 24);
  const hull = normalizeHex(state.color);
  if (hull) el.color.value = hull;
  // Back-compat: older links only had `color` — mirror to letters unless text= set.
  const letter = normalizeHex(state.text) || hull;
  if (letter) el.textColor.value = letter;
  if (state.font && FONT_OPTIONS[state.font]) {
    el.fontStyle.value = state.font;
    currentFontId = state.font;
  }
  if (state.size != null) el.size.value = state.size;
  if (state.pos != null) el.pos.value = state.pos;
  if (state.depth != null) el.depth.value = state.depth;
  if (state.side === "left" || state.side === "right") {
    const radio = document.querySelector(
      `input[name="side"][value="${state.side}"]`
    );
    if (radio) radio.checked = true;
  }
  if (state.style === "raised" || state.style === "engraved") {
    const radio = document.querySelector(
      `input[name="style"][value="${state.style}"]`
    );
    if (radio) radio.checked = true;
  }
  if (state.wrap === "0" || state.wrap === "false") el.wrap.checked = false;
  if (state.wrap === "1" || state.wrap === "true") el.wrap.checked = true;
  updateLabels();
  applyColor();
}

function stateFromUrl() {
  const q = new URLSearchParams(window.location.search);
  const state = {};
  for (const key of [
    "name",
    "color",
    "text",
    "font",
    "size",
    "pos",
    "depth",
    "side",
    "style",
    "wrap",
  ]) {
    if (q.has(key)) state[key] = q.get(key);
  }
  return state;
}

function writeUrl(replace = true) {
  const s = readState();
  const q = new URLSearchParams();
  if (s.name) q.set("name", s.name);
  q.set("color", s.color);
  q.set("text", s.text);
  q.set("font", s.font);
  q.set("size", s.size);
  q.set("pos", s.pos);
  q.set("depth", s.depth);
  q.set("side", s.side);
  q.set("style", s.style);
  q.set("wrap", s.wrap);
  const url = `${window.location.pathname}?${q.toString()}`;
  if (replace) history.replaceState(null, "", url);
  return `${window.location.origin}${url}`;
}

function mergeForExport() {
  if (!shipGeometry || !textMesh) {
    throw new Error("Model not ready");
  }

  textMesh.updateMatrixWorld(true);

  const ship = shipGeometry.clone();
  const text = textMesh.geometry.clone();
  text.applyMatrix4(textMesh.matrixWorld);

  ship.computeVertexNormals();
  text.computeVertexNormals();

  const exporter = new STLExporter();
  const group = new THREE.Group();
  group.add(new THREE.Mesh(ship));
  group.add(new THREE.Mesh(text));
  return exporter.parse(group, { binary: true });
}

async function downloadStl() {
  try {
    el.download.disabled = true;
    setStatus("Building STL…");
    await flushRebuild();
    if (!textMesh) throw new Error("Model not ready");

    const buffer = mergeForExport();
    const blob = new Blob([buffer], { type: "model/stl" });
    const slug =
      (el.name.value.trim() || "starship")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "")
        .slice(0, 40) || "starship";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `starship_${slug}.stl`;
    a.click();
    URL.revokeObjectURL(a.href);
    writeUrl();
    const extra =
      selectedStyle() === "engraved"
        ? " Engraved letters are inset meshes (use slicer mesh-boolean subtract if your tool supports it)."
        : "";
    setStatus(
      `STL downloaded — color is preview only; set filament in your slicer.${extra}`
    );
  } catch (err) {
    console.error(err);
    setStatus(err.message || "Export failed", true);
  } finally {
    el.download.disabled = false;
  }
}

async function copyShareLink() {
  const url = writeUrl();
  try {
    await navigator.clipboard.writeText(url);
    setStatus("Link copied — shares name, color, and placement.");
  } catch {
    setStatus(`Copy failed — URL is ${url}`, true);
  }
}

async function fitTextToHull() {
  if (!font || !ready) return;
  let size = Number(el.size.value);
  // Shrink until span fits or we hit the minimum.
  while (size > 3) {
    const { used } = sanitizeName(el.name.value);
    const geo = buildFlatTextGeometry(used, size, EMBED_MM + Number(el.depth.value));
    const span = measureSpan(geo);
    geo.dispose();
    if (span <= SAFE_TEXT_SPAN_MM) break;
    size -= 0.5;
  }
  el.size.value = String(size);
  updateLabels();
  await flushRebuild();
  writeUrl();
  setStatus(
    lastSpanMm <= SAFE_TEXT_SPAN_MM
      ? `Fitted to ${size.toFixed(1)} mm letter height.`
      : `Still long at minimum size (${lastSpanMm.toFixed(0)} mm). Shorten the name.`
  );
}

function onControlChange() {
  scheduleRebuild().then(() => writeUrl());
}

async function boot() {
  el.form.addEventListener("submit", (e) => e.preventDefault());
  mountPresets(el.hullPresets, el.color);
  mountPresets(el.textPresets, el.textColor);
  applyState(stateFromUrl());
  updateLabels();
  resize();
  window.addEventListener("resize", resize);

  el.color.addEventListener("input", () => {
    applyColor();
    writeUrl();
  });
  el.textColor.addEventListener("input", () => {
    applyColor();
    writeUrl();
  });
  el.name.addEventListener("input", onControlChange);
  el.size.addEventListener("input", onControlChange);
  el.pos.addEventListener("input", onControlChange);
  el.depth.addEventListener("input", onControlChange);
  el.wrap.addEventListener("change", onControlChange);
  el.fontStyle.addEventListener("change", () => {
    applyFontSelection(el.fontStyle.value).catch((err) => {
      console.error(err);
      setStatus("Failed to load that font.", true);
    });
  });
  for (const radio of document.querySelectorAll(
    'input[name="side"], input[name="style"]'
  )) {
    radio.addEventListener("change", () => {
      onControlChange();
      if (radio.name === "side") frameCamera();
    });
  }
  el.download.addEventListener("click", downloadStl);
  el.copyLink.addEventListener("click", copyShareLink);
  el.resetView.addEventListener("click", () => {
    frameCamera();
    setStatus("View reset.");
  });
  el.fitSize.addEventListener("click", fitTextToHull);

  try {
    const stlLoader = new STLLoader();
    const initialFontId = FONT_OPTIONS[el.fontStyle.value]
      ? el.fontStyle.value
      : "optimer-bold";

    const [, geometry] = await Promise.all([
      applyFontSelection(initialFontId, { rebuild: false }),
      stlLoader.loadAsync(SHIP_URL),
    ]);

    shipGeometry = geometry;
    shipGeometry.computeVertexNormals();

    shipMesh = new THREE.Mesh(shipGeometry, shipMaterial);
    scene.add(shipMesh);

    ready = true;
    el.download.disabled = false;
    applyColor();
    await rebuildText();
    frameCamera();
    writeUrl();
    setStatus("Ready — edit the name, then download your STL.");
  } catch (err) {
    console.error(err);
    setStatus("Failed to load ship or font.", true);
    el.download.disabled = true;
  }
}

function tick() {
  requestAnimationFrame(tick);
  controls.update();
  renderer.render(scene, camera);
}

boot();
tick();
