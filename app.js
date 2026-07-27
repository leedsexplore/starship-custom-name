import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { STLExporter } from "three/addons/exporters/STLExporter.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { Brush, Evaluator, SUBTRACTION, HOLLOW_SUBTRACTION } from "three-bvh-csg";
import { build3mf } from "./export3mf.js";
import {
  APP_NAME,
  APP_VERSION,
  AUTHOR,
  creditLine,
  versionLabel,
} from "./version.js";

/**
 * Base ship meshes. Placement values are mesh-space mm; the app convention is
 * hull length along Y, text faces ±Z, flaps along ±X (set by the legacy mesh —
 * other meshes are reoriented on load via orient()).
 */
const SHIPS = {
  parametric: {
    id: "parametric",
    label: "Original CAD 1:200",
    url: "./assets/starship_ship_print_1_200.stl?v=2.0.8",
    /** Key into print_envelope.json meshes[] for measured dimensions. */
    envelopeFile: "assets/starship_ship_print_1_200.stl",
    /** Preview layers (steel + tiled heat shield) — same look as assets/starship_cad_preview.html. */
    layers: [
      {
        id: "steel",
        role: "steel",
        url: "./assets/starship_print_1_200_steel.stl?v=2.0.8",
      },
      {
        id: "tiles",
        role: "tiles",
        url: "./assets/starship_print_1_200_tiles.stl?v=2.0.8",
      },
    ],
    bodyCenterX: 0,
    hullRadiusZ: 22.575, // measured mid-barrel Ø 45.15 mm
    embedMm: 0.35,
    safeSpanMm: 100,
    hardSpanMm: 120,
    flapZoneYMm: 60,
    defaultSizeMm: 8,
    /**
     * SpaceX-style S## marking: leeward mid-barrel, slightly aft of the
     * clear-section midpoint (≈23 m up a 52.1 m ship → ≈−10 mm here).
     */
    defaultPosMm: -10,
    /** Exported nose-up along +Z with flaps on ±Y — swing into app convention. */
    orient(geometry) {
      geometry.rotateX(-Math.PI / 2); // nose +Z → +Y
      geometry.rotateY(Math.PI / 2); // flaps ±Z → ±X
      geometry.computeBoundingBox();
      const bb = geometry.boundingBox;
      geometry.translate(0, -(bb.min.y + bb.max.y) / 2, 0);
    },
    meshDefaults: {
      meshHeightMm: 260.5,
      meshDiameterMm: 45.15,
      meshFootprintMaxMm: 79.7,
    },
  },
  legacy: {
    id: "legacy",
    label: "Classic remix (v1.x)",
    /** Pre-v2 customizer mesh — Josh1297 Starship (same as v1.1.5). */
    url: "./assets/StarShipV2_original.stl?v=2.0.8",
    envelopeFile: "assets/StarShipV2_original.stl",
    bodyCenterX: -22.3,
    /** Mid-body cylinder radius tuned for this mesh (v1.1.x placement). */
    hullRadiusZ: 10.7,
    embedMm: 0.35,
    safeSpanMm: 48,
    hardSpanMm: 60,
    flapZoneYMm: 28,
    defaultSizeMm: 5,
    /** Same S##-style band, scaled to the shorter remix mesh. */
    defaultPosMm: -2,
    orient() {},
    meshDefaults: {
      meshHeightMm: 121,
      meshDiameterMm: 27.7807,
      meshFootprintMaxMm: 42.6,
    },
  },
};

const DEFAULT_SHIP_ID = "parametric";
let ship = SHIPS[DEFAULT_SHIP_ID];

const ENVELOPE_URL = "./assets/print_envelope.json";

/** Published ship + CORE One 1:200 targets (overridden by print_envelope.json). */
const PRINT_DEFAULTS = {
  realHeightM: 52.1,
  realDiameterM: 9.0,
  targetScale: 200,
  targetHeightMm: 260.5,
  coreOne: { x_mm: 250, y_mm: 220, z_mm: 270 },
};

let envelopeData = null;
let printEnvelope = { ...PRINT_DEFAULTS, ...ship.meshDefaults };

/**
 * Extruded fonts (Three.js typeface JSON).
 * Popular Google fonts via @compai typefaces (OFL); classic MgOpen/Droid from three.js.
 */
const FONT_OPTIONS = {
  "optimer-bold": {
    label: "Optimer Bold",
    group: "Classic",
    url: "./fonts/optimer_bold.typeface.json",
    openscad: "Liberation Sans:style=Bold",
  },
  "optimer-regular": {
    label: "Optimer Regular",
    group: "Classic",
    url: "./fonts/optimer_regular.typeface.json",
    openscad: "Liberation Sans:style=Regular",
  },
  "helvetiker-bold": {
    label: "Helvetiker Bold",
    group: "Classic",
    url: "./fonts/helvetiker_bold.typeface.json",
    openscad: "Liberation Sans:style=Bold",
  },
  "helvetiker-regular": {
    label: "Helvetiker Regular",
    group: "Classic",
    url: "./fonts/helvetiker_regular.typeface.json",
    openscad: "Liberation Sans:style=Regular",
  },
  "gentilis-bold": {
    label: "Gentilis Bold (accents)",
    group: "Classic",
    url: "./fonts/gentilis_bold.typeface.json",
    openscad: "Gentium Book Basic:style=Bold",
  },
  "gentilis-regular": {
    label: "Gentilis Regular",
    group: "Classic",
    url: "./fonts/gentilis_regular.typeface.json",
    openscad: "Gentium Book Basic:style=Regular",
  },
  "droid-sans-bold": {
    label: "Droid Sans Bold",
    group: "Classic",
    url: "./fonts/droid_sans_bold.typeface.json",
    openscad: "Droid Sans:style=Bold",
  },
  "droid-sans-regular": {
    label: "Droid Sans",
    group: "Classic",
    url: "./fonts/droid_sans_regular.typeface.json",
    openscad: "Droid Sans",
  },
  "droid-sans-mono": {
    label: "Droid Sans Mono",
    group: "Classic",
    url: "./fonts/droid_sans_mono_regular.typeface.json",
    openscad: "Droid Sans Mono",
  },
  "droid-serif-bold": {
    label: "Droid Serif Bold",
    group: "Classic",
    url: "./fonts/droid_serif_bold.typeface.json",
    openscad: "Droid Serif:style=Bold",
  },
  "droid-serif-regular": {
    label: "Droid Serif",
    group: "Classic",
    url: "./fonts/droid_serif_regular.typeface.json",
    openscad: "Droid Serif",
  },
  "roboto-bold": {
    label: "Roboto Bold",
    group: "Popular",
    url: "./fonts/roboto_bold.typeface.json",
    openscad: "Roboto:style=Bold",
  },
  "roboto-regular": {
    label: "Roboto",
    group: "Popular",
    url: "./fonts/roboto_regular.typeface.json",
    openscad: "Roboto",
  },
  "open-sans-bold": {
    label: "Open Sans Bold",
    group: "Popular",
    url: "./fonts/open_sans_bold.typeface.json",
    openscad: "Open Sans:style=Bold",
  },
  "open-sans-regular": {
    label: "Open Sans",
    group: "Popular",
    url: "./fonts/open_sans_regular.typeface.json",
    openscad: "Open Sans",
  },
  "montserrat-bold": {
    label: "Montserrat Bold",
    group: "Popular",
    url: "./fonts/montserrat_bold.typeface.json",
    openscad: "Montserrat:style=Bold",
  },
  "montserrat-regular": {
    label: "Montserrat",
    group: "Popular",
    url: "./fonts/montserrat_regular.typeface.json",
    openscad: "Montserrat",
  },
  "lato-bold": {
    label: "Lato Bold",
    group: "Popular",
    url: "./fonts/lato_bold.typeface.json",
    openscad: "Lato:style=Bold",
  },
  "lato-regular": {
    label: "Lato",
    group: "Popular",
    url: "./fonts/lato_regular.typeface.json",
    openscad: "Lato",
  },
  "poppins-bold": {
    label: "Poppins Bold",
    group: "Popular",
    url: "./fonts/poppins_bold.typeface.json",
    openscad: "Poppins:style=Bold",
  },
  "poppins-regular": {
    label: "Poppins",
    group: "Popular",
    url: "./fonts/poppins_regular.typeface.json",
    openscad: "Poppins",
  },
  "inter-bold": {
    label: "Inter Bold",
    group: "Popular",
    url: "./fonts/inter_bold.typeface.json",
    openscad: "Inter:style=Bold",
  },
  "inter-regular": {
    label: "Inter",
    group: "Popular",
    url: "./fonts/inter_regular.typeface.json",
    openscad: "Inter",
  },
  "nunito-bold": {
    label: "Nunito Bold",
    group: "Popular",
    url: "./fonts/nunito_bold.typeface.json",
    openscad: "Nunito:style=Bold",
  },
  "ubuntu-bold": {
    label: "Ubuntu Bold",
    group: "Popular",
    url: "./fonts/ubuntu_bold.typeface.json",
    openscad: "Ubuntu:style=Bold",
  },
  "source-sans-bold": {
    label: "Source Sans Bold",
    group: "Popular",
    url: "./fonts/source_sans_bold.typeface.json",
    openscad: "Source Sans Pro:style=Bold",
  },
  "raleway-bold": {
    label: "Raleway Bold",
    group: "Popular",
    url: "./fonts/raleway_bold.typeface.json",
    openscad: "Raleway:style=Bold",
  },
  "rubik-bold": {
    label: "Rubik Bold",
    group: "Popular",
    url: "./fonts/rubik_bold.typeface.json",
    openscad: "Rubik:style=Bold",
  },
  "oswald-bold": {
    label: "Oswald Bold",
    group: "Display",
    url: "./fonts/oswald_bold.typeface.json",
    openscad: "Oswald:style=Bold",
  },
  "oswald-regular": {
    label: "Oswald",
    group: "Display",
    url: "./fonts/oswald_regular.typeface.json",
    openscad: "Oswald",
  },
  "bebas-neue": {
    label: "Bebas Neue",
    group: "Display",
    url: "./fonts/bebas_neue.typeface.json",
    openscad: "Bebas Neue",
  },
};

/** Prusa filament + Starship / space-theme preview defaults. */
const COLOR_PRESETS = [
  {
    id: "signal-red",
    name: "Signal Red",
    hex: "#e10600",
    filament: "Prusament PLA",
    sku: "Lipstick Red (approx)",
  },
  {
    id: "prusa-orange",
    name: "Prusa Orange",
    hex: "#fa6831",
    filament: "Prusament PLA",
    sku: "Prusa Orange",
  },
  {
    id: "starship-steel",
    name: "Starship Steel",
    hex: "#c8ced6",
    filament: "Prusament PLA",
    sku: "Galaxy Silver (approx)",
  },
  {
    id: "pearl-white",
    name: "Pearl White",
    hex: "#f2f0e6",
    filament: "Prusament PLA",
    sku: "Pearl White",
  },
  {
    id: "jet-black",
    name: "Jet Black",
    hex: "#1c1c1c",
    filament: "Prusament PLA",
    sku: "Jet Black",
  },
  {
    id: "heatshield",
    name: "Heatshield",
    hex: "#3a3734",
    filament: "Custom",
    sku: "non-Prusament preview",
  },
  {
    id: "prusa-azure",
    name: "Prusa Azure",
    hex: "#0077c8",
    filament: "Prusament PLA",
    sku: "Azure Blue",
  },
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
  scale: document.getElementById("scale"),
  wrap: document.getElementById("wrap"),
  sizeLabel: document.getElementById("size-label"),
  posLabel: document.getElementById("pos-label"),
  depthLabel: document.getElementById("depth-label"),
  scaleLabel: document.getElementById("scale-label"),
  coreOnePreset: document.getElementById("core-one-preset"),
  download: document.getElementById("download"),
  download3mf: document.getElementById("download-3mf"),
  downloadPng: document.getElementById("download-png"),
  downloadScad: document.getElementById("download-scad"),
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
  hud: document.getElementById("hud"),
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a101c);

const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 2000);
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
el.viewport.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

scene.add(new THREE.AmbientLight(0xffffff, 0.28));
const key = new THREE.DirectionalLight(0xffffff, 0.95);
key.position.set(-40, 80, 90);
scene.add(key);
const fill = new THREE.DirectionalLight(0x9eb6ff, 0.32);
fill.position.set(-60, -20, -50);
scene.add(fill);
const rim = new THREE.DirectionalLight(0xffe0c0, 0.4);
rim.position.set(-20, 40, 100);
scene.add(rim);
/** Windward fill + high rake so hex tile relief reads on the black side. */
const tileLight = new THREE.DirectionalLight(0xfff4e0, 0.75);
tileLight.position.set(90, 30, -35);
scene.add(tileLight);
const rake = new THREE.DirectionalLight(0xffffff, 0.4);
rake.position.set(40, 160, 10);
scene.add(rake);

/** Soft studio environment so stainless steel has something to reflect. */
{
  const ec = document.createElement("canvas");
  ec.width = 1024;
  ec.height = 512;
  const eg = ec.getContext("2d");
  const sky = eg.createLinearGradient(0, 0, 0, 512);
  sky.addColorStop(0.0, "#9fb0c4");
  sky.addColorStop(0.42, "#6d7f99");
  sky.addColorStop(0.5, "#b8a98e");
  sky.addColorStop(0.55, "#2e333c");
  sky.addColorStop(1.0, "#101218");
  eg.fillStyle = sky;
  eg.fillRect(0, 0, 1024, 512);
  eg.fillStyle = "rgba(255,250,240,0.9)";
  eg.fillRect(120, 60, 180, 120);
  eg.fillRect(620, 40, 220, 140);
  const envTex = new THREE.CanvasTexture(ec);
  envTex.mapping = THREE.EquirectangularReflectionMapping;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromEquirectangular(envTex).texture;
  envTex.dispose();
  pmrem.dispose();
}

/** Root for ship + text so scale % applies to both. */
const modelGroup = new THREE.Group();
scene.add(modelGroup);

const shipMaterial = new THREE.MeshStandardMaterial({
  color: new THREE.Color(el.color.value),
  metalness: 0.42,
  roughness: 0.4,
});
/** Parametric preview: polished stainless (hull color picker drives this). */
const steelMaterial = new THREE.MeshStandardMaterial({
  color: new THREE.Color("#c8ced6"),
  metalness: 0.95,
  roughness: 0.2,
  envMapIntensity: 0.7,
});
/** Seamless hexagonal heat-tile bump map (same recipe as starship_cad_preview.html). */
function makeHexTileTexture() {
  const S = 512;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d");
  g.fillStyle = "#3a3a3a";
  g.fillRect(0, 0, S, S);
  const px = S / 6;
  const py = S / 7;
  const R = (py / 1.5) * 0.94;
  for (let j = -1; j <= 8; j++) {
    for (let i = -1; i <= 7; i++) {
      const cx = i * px + (j % 2 ? px / 2 : 0);
      const cy = j * py;
      const grad = g.createRadialGradient(cx, cy, R * 0.15, cx, cy, R);
      grad.addColorStop(0, "#c8c8c8");
      grad.addColorStop(0.8, "#a8a8a8");
      grad.addColorStop(1, "#6a6a6a");
      g.fillStyle = grad;
      g.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = Math.PI / 6 + k * (Math.PI / 3);
        const x = cx + R * Math.cos(a);
        const y = cy + R * Math.sin(a);
        if (k) g.lineTo(x, y);
        else g.moveTo(x, y);
      }
      g.closePath();
      g.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Preview sugar for the smooth tile shell. */
const tilesBumpMap = makeHexTileTexture();
/** Parametric preview: black heat-shield tiles with hex bump. */
const tilesMaterial = new THREE.MeshStandardMaterial({
  color: new THREE.Color(0x1e2126),
  metalness: 0.2,
  roughness: 0.62,
  envMapIntensity: 0.35,
  bumpMap: tilesBumpMap,
  bumpScale: 1.1,
});
const textMaterial = new THREE.MeshStandardMaterial({
  color: new THREE.Color(el.textColor.value),
  metalness: 0.15,
  roughness: 0.45,
  side: THREE.DoubleSide,
  // Win depth fights against dense hull facets in the live preview.
  polygonOffset: true,
  polygonOffsetFactor: -1,
  polygonOffsetUnits: -2,
});

let font = null;
let fontGlyphs = new Set();
let currentFontId = "optimer-bold";
const fontCache = new Map();
let shipGeometry = null;
/** Display object: Mesh (legacy) or Group of layered meshes (parametric). */
let shipMesh = null;
let textMesh = null;
let ready = false;
let rebuildTimer = 0;
let lastSpanMm = 0;
const csgEvaluator = new Evaluator();
// STL ship has position/normal/color — no uvs. Default evaluator attrs include uv and crash.
csgEvaluator.attributes = ["position", "normal"];
csgEvaluator.useGroups = false;

/**
 * Cylindrical UV unwrap for the tile shell (print-scale, Z-up, before orient()).
 * Flap faces keep a planar map so the hex pattern doesn't smear.
 */
function applyTileUVs(geom, scaleMm = 13) {
  const HULL_R = 22.575;
  const p = geom.attributes.position;
  const n = p.count;
  const uv = new Float32Array(n * 2);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  for (let i = 0; i < n; i += 3) {
    a.fromBufferAttribute(p, i);
    b.fromBufferAttribute(p, i + 1);
    c.fromBufferAttribute(p, i + 2);
    nrm.crossVectors(ab.subVectors(b, a), ac.subVectors(c, a)).normalize();
    const mx = (a.x + b.x + c.x) / 3;
    const my = (a.y + b.y + c.y) / 3;
    const mr = Math.hypot(mx, my) || 1;
    const radial = Math.abs((nrm.x * mx + nrm.y * my) / mr) > 0.5;
    for (let k = 0; k < 3; k++) {
      const v = [a, b, c][k];
      const o = (i + k) * 2;
      if (radial) {
        uv[o] = (Math.atan2(v.y, v.x) * HULL_R) / scaleMm;
        uv[o + 1] = v.z / scaleMm;
      } else {
        uv[o] = v.y / scaleMm;
        uv[o + 1] = v.z / scaleMm;
      }
    }
  }
  geom.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

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

function selectedShipId() {
  const value = document.querySelector('input[name="ship"]:checked')?.value;
  return SHIPS[value] ? value : DEFAULT_SHIP_ID;
}

function setShipRadio(shipId) {
  const id = SHIPS[shipId] ? shipId : DEFAULT_SHIP_ID;
  const radio = document.querySelector(`input[name="ship"][value="${id}"]`);
  if (radio) radio.checked = true;
}

function selectedStyle() {
  return document.querySelector('input[name="style"]:checked')?.value ===
    "engraved"
    ? "engraved"
    : "raised";
}

function shipCacheKey(shipDef) {
  return shipDef.id;
}

function modelScale() {
  return Number(el.scale.value) / 100;
}

function applyModelScale() {
  const s = modelScale();
  modelGroup.scale.setScalar(s);
}

/** Scale % that makes the customizer mesh H match true 1:200 (260.5 mm). */
function coreOneScalePercent() {
  const h = printEnvelope.meshHeightMm || PRINT_DEFAULTS.meshHeightMm;
  const target = printEnvelope.targetHeightMm || PRINT_DEFAULTS.targetHeightMm;
  return (target / h) * 100;
}

function scaledPrintSize(scalePct = Number(el.scale.value)) {
  const s = scalePct / 100;
  return {
    heightMm: (printEnvelope.meshHeightMm || PRINT_DEFAULTS.meshHeightMm) * s,
    diameterMm:
      (printEnvelope.meshDiameterMm || PRINT_DEFAULTS.meshDiameterMm) * s,
    footprintMaxMm:
      (printEnvelope.meshFootprintMaxMm || PRINT_DEFAULTS.meshFootprintMaxMm) *
      s,
  };
}

function applyCoreOnePreset() {
  const pct = coreOneScalePercent();
  const max = Number(el.scale.max);
  const min = Number(el.scale.min);
  el.scale.value = String(Math.min(max, Math.max(min, pct)));
  // Keep exact value even if it falls between range steps.
  if (Math.abs(Number(el.scale.value) - pct) > 0.001) {
    el.scale.value = String(pct);
  }
  updateLabels();
  applyModelScale();
  writeUrl();
  const sz = scaledPrintSize(pct);
  const z = printEnvelope.coreOne?.z_mm ?? PRINT_DEFAULTS.coreOne.z_mm;
  setStatus(
    `CORE One 1:200 — H ${sz.heightMm.toFixed(1)} mm × Ø ${sz.diameterMm.toFixed(1)} mm (Z room ${ (z - sz.heightMm).toFixed(1) } mm).`
  );
}

async function loadPrintEnvelope() {
  try {
    const res = await fetch(ENVELOPE_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    envelopeData = await res.json();
  } catch (err) {
    console.warn("print_envelope.json unavailable; using built-in defaults", err);
    envelopeData = null;
  }
  applyEnvelopeForShip();
}

/** Refresh envelope numbers for the active ship (measured entry when present). */
function applyEnvelopeForShip() {
  const data = envelopeData || {};
  const target = data.target_print || {};
  const real = data.real_ship || {};
  const mesh =
    (data.meshes || []).find((m) => m.file === ship.envelopeFile) || {};
  printEnvelope = {
    realHeightM: real.height_m ?? PRINT_DEFAULTS.realHeightM,
    realDiameterM: real.diameter_m ?? PRINT_DEFAULTS.realDiameterM,
    targetScale: Number(String(target.scale || "1:200").split(":").pop()) || 200,
    targetHeightMm: target.height_mm ?? PRINT_DEFAULTS.targetHeightMm,
    coreOne: target.build_volume_mm || PRINT_DEFAULTS.coreOne,
    meshHeightMm: mesh.height_mm ?? ship.meshDefaults.meshHeightMm,
    meshDiameterMm:
      mesh.mid_barrel_diameter_mm ?? ship.meshDefaults.meshDiameterMm,
    meshFootprintMaxMm:
      mesh.footprint_max_mm ?? ship.meshDefaults.meshFootprintMaxMm,
  };
  // Slider must reach the measured CORE One % (100% parametric, ≈215% legacy).
  const need = Math.ceil(coreOneScalePercent() + 0.5);
  if (Number(el.scale.max) < need) el.scale.max = String(need);
}

const shipGeometryCache = new Map();
const shipLayerCache = new Map();

async function loadShipGeometry(shipDef) {
  const key = shipCacheKey(shipDef);
  if (shipGeometryCache.has(key)) {
    return shipGeometryCache.get(key);
  }
  const geometry = await new STLLoader().loadAsync(shipDef.url);
  shipDef.orient(geometry);
  geometry.computeVertexNormals();
  shipGeometryCache.set(key, geometry);
  return geometry;
}

async function loadShipLayers(shipDef) {
  const layerDefs = shipDef.layers;
  if (!layerDefs?.length) return null;
  const key = shipCacheKey(shipDef);
  if (shipLayerCache.has(key)) {
    return shipLayerCache.get(key);
  }
  const loader = new STLLoader();
  const parts = await Promise.all(
    layerDefs.map(async (layer) => {
      const geometry = await loader.loadAsync(layer.url);
      if (layer.role === "tiles") applyTileUVs(geometry);
      geometry.computeVertexNormals();
      shipDef.orient(geometry);
      const material =
        layer.role === "tiles" ? tilesMaterial : steelMaterial;
      return new THREE.Mesh(geometry, material);
    })
  );
  const group = new THREE.Group();
  for (const mesh of parts) group.add(mesh);
  shipLayerCache.set(key, group);
  return group;
}

function buildShipDisplay(geometry, shipDef, layers) {
  if (layers) return layers;
  return new THREE.Mesh(geometry, shipMaterial);
}

/** Swap the base mesh, retune scale/placement to its 1:200 preset, and rebuild text. */
let shipLoadToken = 0;
async function applyShipSelection(shipId, { retune = true } = {}) {
  const id = SHIPS[shipId] ? shipId : DEFAULT_SHIP_ID;
  ship = SHIPS[id];
  setShipRadio(id);
  applyEnvelopeForShip();

  const token = ++shipLoadToken;
  setStatus(`Loading ${ship.label}…`);
  const [geometry, layers] = await Promise.all([
    loadShipGeometry(ship),
    loadShipLayers(ship),
  ]);
  if (token !== shipLoadToken) return;
  if (shipMesh) modelGroup.remove(shipMesh);
  shipGeometry = geometry;
  shipMesh = buildShipDisplay(geometry, ship, layers);
  modelGroup.add(shipMesh);

  if (retune) {
    el.scale.value = String(coreOneScalePercent());
    el.size.value = String(ship.defaultSizeMm);
    el.pos.value = String(ship.defaultPosMm);
    if (ship.layers?.length) {
      el.color.value = "#c8ced6";
    }
  }
  updateLabels();
  applyModelScale();
  applyColor();
  if (ready) {
    await flushRebuild();
    if (token !== shipLoadToken) return;
    frameCamera();
    writeUrl();
    setStatus(`Base model: ${ship.label}.`);
  }
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
  const pct = Number(el.scale.value);
  const sz = scaledPrintSize(pct);
  const corePct = coreOneScalePercent();
  const isCore = Math.abs(pct - corePct) < 0.05;
  el.scaleLabel.textContent = isCore
    ? `${pct.toFixed(1)}% · H ${sz.heightMm.toFixed(1)} × Ø ${sz.diameterMm.toFixed(1)} mm (CORE One 1:200)`
    : `${pct.toFixed(1)}% · H ${sz.heightMm.toFixed(1)} × Ø ${sz.diameterMm.toFixed(1)} mm`;
}

function mountFontOptions(selectedId = "optimer-bold") {
  const select = el.fontStyle;
  select.replaceChildren();
  const groups = new Map();
  for (const [id, opt] of Object.entries(FONT_OPTIONS)) {
    const g = opt.group || "Other";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push([id, opt]);
  }
  for (const [groupName, items] of groups) {
    const og = document.createElement("optgroup");
    og.label = groupName;
    for (const [id, opt] of items) {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = opt.label;
      if (id === selectedId) option.selected = true;
      og.appendChild(option);
    }
    select.appendChild(og);
  }
  if (!FONT_OPTIONS[select.value]) select.value = "optimer-bold";
}

function mountPresets(container, input) {
  container.replaceChildren();
  for (const preset of COLOR_PRESETS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "swatch";
    btn.style.background = preset.hex;
    btn.dataset.color = preset.hex;
    const tip = `${preset.name} · ${preset.filament} · ${preset.sku}`;
    btn.title = tip;
    btn.setAttribute("aria-label", tip);
    btn.innerHTML = `<span class="swatch-name">${tip}</span>`;
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
  const hull = el.color.value;
  shipMaterial.color.set(hull);
  steelMaterial.color.set(hull);
  // Layered parametric preview keeps tiles black; hull picker only tints steel.
  textMaterial.color.set(el.textColor.value);
  // Slight lift on dark letter colors so they stay readable on Signal Red.
  const hsl = { h: 0, s: 0, l: 0 };
  textMaterial.color.getHSL(hsl);
  textMaterial.emissive.setHex(hsl.l < 0.28 ? 0x222222 : 0x000000);
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
  const textY = Number(el.pos.value);
  const extent = Math.abs(textY) + spanMm / 2;
  const parts = [];

  if (spanMm > ship.hardSpanMm) {
    parts.push(
      `Very long — span ~${spanMm.toFixed(0)} mm (safe ≤${ship.safeSpanMm} mm). Likely hits flaps.`
    );
    el.lengthWarn.classList.add("warn-hard");
  } else if (spanMm > ship.safeSpanMm) {
    parts.push(
      `Span ~${spanMm.toFixed(0)} mm (safe ≤${ship.safeSpanMm} mm). Use “Fit text to hull” or shorten.`
    );
    el.lengthWarn.classList.remove("warn-hard");
  } else {
    el.lengthWarn.classList.remove("warn-hard");
  }

  if (extent > ship.flapZoneYMm) {
    parts.push(
      `Position + length nears flap zone (~±${ship.flapZoneYMm} mm). Nudge position toward mid-body.`
    );
    if (spanMm <= ship.safeSpanMm) el.lengthWarn.classList.remove("warn-hard");
  }

  if (!parts.length) {
    el.lengthWarn.hidden = true;
    el.lengthWarn.textContent = "";
    return;
  }
  el.lengthWarn.hidden = false;
  el.lengthWarn.textContent = parts.join(" ");
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
  const R = ship.hullRadiusZ;
  const pos = geometry.attributes.position;
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const across = side === "left" ? -v.x : v.x;
    const along = v.y;
    const radial = style === "raised" ? R - ship.embedMm + v.z : R - v.z;
    const theta = across / R;
    const x = ship.bodyCenterX + radial * Math.sin(theta);
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
    mesh.position.set(
      ship.bodyCenterX,
      textY,
      sign * (ship.hullRadiusZ - ship.embedMm)
    );
    if (side === "left") mesh.rotation.y = Math.PI;
  } else {
    mesh.position.set(ship.bodyCenterX, textY, sign * ship.hullRadiusZ);
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
  const totalDepth = ship.embedMm + proud;
  const side = selectedSide();
  const style = selectedStyle();
  const textY = Number(el.pos.value);
  const wrap = el.wrap.checked;
  const { missing, folded, used } = sanitizeName(el.name.value);
  updateGlyphWarn(missing, folded);

  if (textMesh) {
    modelGroup.remove(textMesh);
    textMesh.geometry.dispose();
    textMesh = null;
  }

  // Empty name → ship-only preview (no placeholder lettering).
  if (!used.trim()) {
    lastSpanMm = 0;
    updateLengthWarn(0);
    applyModelScale();
    return Promise.resolve();
  }

  const flat = buildFlatTextGeometry(
    used,
    Number(el.size.value),
    totalDepth
  );
  const spanMm = measureSpan(flat);
  updateLengthWarn(spanMm);

  if (wrap) {
    wrapGeometryToHull(flat, side, textY, style);
    textMesh = new THREE.Mesh(flat, textMaterial);
  } else {
    textMesh = placeFlatOnHull(flat, side, textY, style);
  }

  modelGroup.add(textMesh);
  applyModelScale();
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
  const box = new THREE.Box3().setFromObject(modelGroup);
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

/**
 * Full-ship framing for a square Printables cover.
 * Fits the entire model (nose → fins) in frame, viewed from the lettered side.
 * Skips OrbitControls.update() so spherical recomputation cannot skew framing.
 * Assumes camera.aspect is already 1 (set by captureCoverDataUrl).
 */
function frameCoverCamera() {
  if (!shipMesh) {
    frameCamera();
    return;
  }
  modelGroup.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(modelGroup);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  // Prefer hull axis X so the cylinder sits dead-center horizontally.
  center.x = ship.bodyCenterX * modelGroup.scale.x;

  // Extra margin so nose + flaps read clearly in the square (not edge-clipped).
  const fit = Math.max(size.x, size.y, size.z) * 1.35;
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const dist = fit / 2 / Math.tan(fov / 2);
  const zDir = selectedSide() === "right" ? 1 : -1;

  // Slight X bias for a 3/4 read without losing horizontal centering much.
  camera.position.set(center.x + fit * 0.12, center.y, center.z + zDir * dist);
  camera.up.set(0, 1, 0);
  camera.lookAt(center);
  camera.updateMatrixWorld();
  controls.target.copy(center);
}

function normalizeHex(value) {
  if (!value) return null;
  const hex = value.startsWith("#") ? value : `#${value}`;
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.toLowerCase() : null;
}

function nameSlug() {
  return (
    (el.name.value.trim() || "starship")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 40) || "starship"
  );
}

function readState() {
  return {
    ship: ship.id,
    name: el.name.value.trim(),
    color: el.color.value.replace("#", ""),
    text: el.textColor.value.replace("#", ""),
    font: currentFontId || el.fontStyle.value || "optimer-bold",
    size: el.size.value,
    pos: el.pos.value,
    depth: el.depth.value,
    scale: el.scale.value,
    side: selectedSide(),
    style: selectedStyle(),
    wrap: el.wrap.checked ? "1" : "0",
  };
}

function applyState(state) {
  if (state.name != null) el.name.value = String(state.name).slice(0, 24);
  const hull = normalizeHex(state.color);
  if (hull) el.color.value = hull;
  const letter = normalizeHex(state.text) || hull;
  if (letter) el.textColor.value = letter;
  if (state.font && FONT_OPTIONS[state.font]) {
    el.fontStyle.value = state.font;
    currentFontId = state.font;
  }
  if (state.size != null) el.size.value = state.size;
  if (state.pos != null) el.pos.value = state.pos;
  if (state.depth != null) el.depth.value = state.depth;
  if (state.scale != null) {
    const n = Number(state.scale);
    if (Number.isFinite(n)) {
      const max = Number(el.scale.max) || 220;
      const min = Number(el.scale.min) || 50;
      el.scale.value = String(Math.min(max, Math.max(min, n)));
    }
  }
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
  applyModelScale();
  applyColor();
}

function stateFromUrl() {
  const q = new URLSearchParams(window.location.search);
  const state = {};
  for (const key of [
    "ship",
    "name",
    "color",
    "text",
    "font",
    "size",
    "pos",
    "depth",
    "scale",
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
  q.set("ship", s.ship);
  if (s.name) q.set("name", s.name);
  q.set("color", s.color);
  q.set("text", s.text);
  q.set("font", s.font);
  q.set("size", s.size);
  q.set("pos", s.pos);
  q.set("depth", s.depth);
  q.set("scale", s.scale);
  q.set("side", s.side);
  q.set("style", s.style);
  q.set("wrap", s.wrap);
  const url = `${window.location.pathname}?${q.toString()}`;
  if (replace) history.replaceState(null, "", url);
  return `${window.location.origin}${url}`;
}

function confirmLongTextIfNeeded() {
  if (lastSpanMm <= ship.hardSpanMm) return true;
  return window.confirm(
    `Text span is ~${lastSpanMm.toFixed(0)} mm and may hit the flaps. Download anyway?`
  );
}

function yieldToUi() {
  return new Promise((resolve) => setTimeout(resolve, 30));
}

/**
 * Ship + text geometries in model space (pre-scale), with text world-baked.
 * Text may be null when the hull name field is empty.
 */
function cloneModelSpaceParts() {
  if (!shipGeometry || !shipMesh) throw new Error("Model not ready");
  shipMesh.updateMatrixWorld(true);

  const ship = shipGeometry.clone();
  // Bake ship mesh local transform (identity today) into geometry.
  ship.applyMatrix4(shipMesh.matrix);

  if (!textMesh) {
    return { ship, text: null };
  }

  textMesh.updateMatrixWorld(true);
  const text = textMesh.geometry.clone();
  text.applyMatrix4(textMesh.matrix);

  return { ship, text };
}

function applyScaleToGeometry(geometry, scale) {
  if (scale === 1) return geometry;
  geometry.scale(scale, scale, scale);
  return geometry;
}

/**
 * True CSG subtract for engraved export. Falls back by throwing.
 */
function prepareForCsg(geometry) {
  const geo = geometry.index ? geometry.clone() : geometry.clone();
  // Drop color/uv so attribute prep matches evaluator.attributes.
  if (geo.attributes.color) geo.deleteAttribute("color");
  if (geo.attributes.uv) geo.deleteAttribute("uv");
  geo.clearGroups();
  if (!geo.attributes.normal) geo.computeVertexNormals();
  return geo;
}

function booleanEngrave(shipGeo, textGeo) {
  const shipBrush = new Brush(prepareForCsg(shipGeo));
  const textBrush = new Brush(prepareForCsg(textGeo));
  shipBrush.updateMatrixWorld(true);
  textBrush.updateMatrixWorld(true);

  try {
    const result = csgEvaluator.evaluate(shipBrush, textBrush, SUBTRACTION);
    return result.geometry;
  } catch (err) {
    console.warn("SUBTRACTION failed, trying HOLLOW_SUBTRACTION", err);
    const result = csgEvaluator.evaluate(
      shipBrush,
      textBrush,
      HOLLOW_SUBTRACTION
    );
    return result.geometry;
  }
}

/**
 * @returns {{ mode: 'boolean'|'merged', geometry?: THREE.BufferGeometry, group?: THREE.Group, note: string }}
 */
function buildExportMeshes({ preferBoolean }) {
  const scale = modelScale();
  const style = selectedStyle();
  const { ship, text } = cloneModelSpaceParts();

  if (!text) {
    applyScaleToGeometry(ship, scale);
    ship.computeVertexNormals();
    return {
      mode: "merged",
      geometry: ship,
      note: "Ship only — enter a hull name to add lettering.",
    };
  }

  if (style === "engraved" && preferBoolean) {
    try {
      const cut = booleanEngrave(ship, text);
      applyScaleToGeometry(cut, scale);
      cut.computeVertexNormals();
      ship.dispose();
      text.dispose();
      return {
        mode: "boolean",
        geometry: cut,
        note: "Engraved with true boolean subtract.",
      };
    } catch (err) {
      console.warn("CSG engraving failed; falling back to inset merge", err);
    }
  }

  applyScaleToGeometry(ship, scale);
  applyScaleToGeometry(text, scale);
  ship.computeVertexNormals();
  text.computeVertexNormals();

  const group = new THREE.Group();
  group.add(new THREE.Mesh(ship));
  group.add(new THREE.Mesh(text));

  const note =
    style === "engraved"
      ? "Boolean failed — exported inset letter meshes (use slicer mesh-boolean if needed)."
      : "Raised letters overlaid on hull (not boolean-unioned). Prefer 3MF for MMU.";

  return { mode: "merged", group, ship, text, note };
}

function triggerDownload(blob, filename) {
  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = filename;
  a.click();
  // Delay revoke — Safari/Firefox can drop the download if revoked immediately.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function setExportBusy(busy) {
  el.download.disabled = busy;
  el.download3mf.disabled = busy;
  el.downloadPng.disabled = busy;
  el.downloadScad.disabled = busy;
}

async function downloadStl() {
  try {
    setExportBusy(true);
    setStatus("Building STL…");
    await flushRebuild();
    if (!confirmLongTextIfNeeded()) {
      setStatus("Download cancelled.");
      return;
    }

    const preferBoolean = selectedStyle() === "engraved";
    if (preferBoolean) {
      setStatus("Boolean engraving… this can take a few seconds.");
      await yieldToUi();
    }

    const payload = buildExportMeshes({ preferBoolean });
    const exporter = new STLExporter();
    let buffer;
    if (payload.mode === "boolean" || payload.geometry) {
      buffer = exporter.parse(new THREE.Mesh(payload.geometry), { binary: true });
      payload.geometry.dispose();
    } else {
      buffer = exporter.parse(payload.group, { binary: true });
      payload.ship?.dispose();
      payload.text?.dispose();
    }

    triggerDownload(
      new Blob([buffer], { type: "model/stl" }),
      `starship_${nameSlug()}.stl`
    );
    writeUrl();
    setStatus(
      `STL downloaded — ${payload.note} Color is preview-only; set filament in your slicer.`
    );
  } catch (err) {
    console.error(err);
    setStatus(err.message || "Export failed", true);
  } finally {
    setExportBusy(false);
  }
}

async function download3mf() {
  try {
    setExportBusy(true);
    setStatus("Building 3MF…");
    await flushRebuild();
    if (!confirmLongTextIfNeeded()) {
      setStatus("Download cancelled.");
      return;
    }

    const style = selectedStyle();
    const hullColor = el.color.value;
    const letterColor = el.textColor.value;
    const scale = modelScale();

    let parts;
    let engravedSolid = false;

    if (style === "engraved") {
      setStatus("Boolean engraving for 3MF…");
      await yieldToUi();
      const payload = buildExportMeshes({ preferBoolean: true });
      if (payload.mode === "boolean") {
        engravedSolid = true;
        parts = [
          {
            name: "Hull (engraved)",
            geometry: payload.geometry,
            color: hullColor,
          },
        ];
      } else {
        // Fallback: two objects so slicer can still assign materials / boolean.
        parts = [
          { name: "Hull", geometry: payload.ship, color: hullColor },
          { name: "Letters (cutter)", geometry: payload.text, color: letterColor },
        ];
      }
      setStatus(
        engravedSolid
          ? "Packing engraved 3MF…"
          : "Packing 3MF (inset fallback)…"
      );
    } else {
      const { ship, text } = cloneModelSpaceParts();
      applyScaleToGeometry(ship, scale);
      if (text) applyScaleToGeometry(text, scale);
      parts = text
        ? [
            { name: "Hull", geometry: ship, color: hullColor },
            { name: "Letters", geometry: text, color: letterColor },
          ]
        : [{ name: "Hull", geometry: ship, color: hullColor }];
      setStatus(
        text ? "Packing multi-material 3MF…" : "Packing ship-only 3MF…"
      );
    }

    await yieldToUi();
    const zipped = build3mf(parts, {
      application: APP_NAME,
      author: `${AUTHOR.name} (${AUTHOR.url})`,
      version: versionLabel(),
    });
    for (const p of parts) p.geometry.dispose();

    triggerDownload(
      new Blob([zipped], { type: "model/3mf" }),
      `starship_${nameSlug()}.3mf`
    );
    writeUrl();
    setStatus(
      !parts.some((p) => /Letters/i.test(p.name))
        ? "3MF downloaded — ship only (enter a name for lettering)."
        : style === "raised"
          ? "3MF downloaded — assign Hull / Letters to extruders in your slicer (MMU)."
          : engravedSolid
            ? "3MF downloaded — engraved hull is a single solid (recess cut)."
            : "3MF downloaded — boolean failed; Hull + Letters (cutter) for slicer boolean."
    );
  } catch (err) {
    console.error(err);
    setStatus(err.message || "3MF export failed", true);
  } finally {
    setExportBusy(false);
  }
}

const COVER_PX = 1024;

async function captureCoverDataUrl() {
  await flushRebuild();
  const prevHud = el.hud.hidden;
  const prevSize = new THREE.Vector2();
  renderer.getSize(prevSize);
  const prevAspect = camera.aspect;
  const prevCamPos = camera.position.clone();
  const prevTarget = controls.target.clone();
  const prevBg = scene.background.clone();
  const prevKey = key.intensity;
  const prevAmb = scene.children.find((c) => c.isAmbientLight)?.intensity;

  el.hud.hidden = true;
  // Solid black for Printables / PNG cover exports.
  scene.background = new THREE.Color(0x000000);
  key.intensity = 1.45;
  const amb = scene.children.find((c) => c.isAmbientLight);
  if (amb) amb.intensity = 0.62;
  // Square buffer — Printables gallery thumbs are square; wide viewport left the ship off-center.
  renderer.setSize(COVER_PX, COVER_PX, false);
  camera.aspect = 1;
  camera.updateProjectionMatrix();
  frameCoverCamera();
  renderer.render(scene, camera);
  const dataUrl = renderer.domElement.toDataURL("image/png");

  scene.background.copy(prevBg);
  key.intensity = prevKey;
  if (amb && prevAmb != null) amb.intensity = prevAmb;
  el.hud.hidden = prevHud;
  camera.position.copy(prevCamPos);
  controls.target.copy(prevTarget);
  controls.update();
  renderer.setSize(prevSize.x, prevSize.y, false);
  camera.aspect = prevAspect;
  camera.updateProjectionMatrix();
  resize();
  return dataUrl;
}

async function downloadPng() {
  try {
    setExportBusy(true);
    setStatus("Capturing cover…");
    const dataUrl = await captureCoverDataUrl();
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `starship_${nameSlug()}_cover.png`;
    a.click();
    setStatus("PNG cover downloaded — good for Printables gallery images.");
  } catch (err) {
    console.error(err);
    setStatus(err.message || "PNG capture failed", true);
  } finally {
    setExportBusy(false);
  }
}

// Dev/automation hook for headless cover capture.
window.__starshipCaptureCover = captureCoverDataUrl;

function downloadOpenscadSnippet() {
  const s = readState();
  const fontKey = FONT_OPTIONS[s.font] ? s.font : "optimer-bold";
  const openscadFont = FONT_OPTIONS[fontKey].openscad;
  // Web proud depth + embed ≈ OpenSCAD Text_Depth with Surface_Offset = -EMBED
  const textDepth = (ship.embedMm + Number(s.depth)).toFixed(2);
  const nameEscaped = (s.name || "Custom Name").replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  const scad = `// Generated by ${creditLine()}
// ${AUTHOR.repo}
// Wrap-to-hull is web-only — OpenSCAD uses flat emboss/engrave.
// Open with openscad/starship_custom_name.scad or paste into Customizer.
// NOTE: that flat path is tuned to the classic remix mesh${
    ship.id === "parametric"
      ? " — your current base is the parametric CAD, so placement will differ"
      : ""
  }.

/* [Text] */
Name = "${nameEscaped}";
Text_Size = ${Number(s.size).toFixed(1)}; // [3:0.5:8]
Text_Depth = ${textDepth}; // [0.5:0.05:1.5]
Font = "${openscadFont}"; // web font: ${fontKey}
Style = "${s.style}"; // [raised, engraved]

/* [Placement] */
Text_Y = ${Number(s.pos)}; // [-30:1:30]
Side = "${s.side}"; // [right, left]
Text_X_Offset = 0;
Surface_Offset = -${ship.embedMm};

/* [Export] */
Part = "preview_with_ship"; // [text_only, preview_with_ship]

// Model scale ${s.scale}% is web/export-only — scale in the slicer if needed.
`;

  triggerDownload(
    new Blob([scad], { type: "text/plain" }),
    `starship_${nameSlug()}_params.scad`
  );
  setStatus("OpenSCAD params downloaded — open with the included .scad (no hull wrap).");
  writeUrl();
}

async function copyShareLink() {
  const url = writeUrl();
  try {
    await navigator.clipboard.writeText(url);
    setStatus("Link copied — shares name, colors, font, scale, and placement.");
  } catch {
    setStatus(`Copy failed — URL is ${url}`, true);
  }
}

async function fitTextToHull() {
  if (!font || !ready) return;
  if (!el.name.value.trim()) {
    setStatus("Enter a name on the hull first.");
    return;
  }
  let size = Number(el.size.value);
  while (size > 3) {
    const { used } = sanitizeName(el.name.value);
    const geo = buildFlatTextGeometry(
      used,
      size,
      ship.embedMm + Number(el.depth.value)
    );
    const span = measureSpan(geo);
    geo.dispose();
    if (span <= ship.safeSpanMm) break;
    size -= 0.5;
  }
  el.size.value = String(size);
  updateLabels();
  await flushRebuild();
  writeUrl();
  setStatus(
    lastSpanMm <= ship.safeSpanMm
      ? `Fitted to ${size.toFixed(1)} mm letter height (span ~${lastSpanMm.toFixed(0)} mm).`
      : `Still long at minimum size (~${lastSpanMm.toFixed(0)} mm). Shorten the name.`
  );
}

function onControlChange() {
  scheduleRebuild().then(() => writeUrl());
}

async function boot() {
  document.title = `${APP_NAME} ${versionLabel()}`;
  const verNodes = [
    document.getElementById("app-version"),
    document.getElementById("footer-version"),
  ];
  for (const node of verNodes) {
    if (node) node.textContent = versionLabel();
  }

  el.form.addEventListener("submit", (e) => e.preventDefault());
  await loadPrintEnvelope();
  const urlState = stateFromUrl();
  // Drop the old baked-in default so bookmarked/share URLs from v2.0.3 and
  // earlier don't keep putting "Custom Name" on an empty-default launch.
  if (urlState.name === "Custom Name") {
    delete urlState.name;
  }
  // Resolve the base ship first — envelope numbers, slider limits, and the
  // default letter size all depend on it.
  ship = SHIPS[urlState.ship] || SHIPS[DEFAULT_SHIP_ID];
  setShipRadio(ship.id);
  applyEnvelopeForShip();
  if (urlState.size == null) el.size.value = String(ship.defaultSizeMm);
  if (urlState.pos == null) el.pos.value = String(ship.defaultPosMm);
  mountFontOptions(
    urlState.font && FONT_OPTIONS[urlState.font] ? urlState.font : "optimer-bold"
  );
  mountPresets(el.hullPresets, el.color);
  mountPresets(el.textPresets, el.textColor);
  applyState(urlState);
  if (urlState.name == null) el.name.value = "";
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
  el.scale.addEventListener("input", () => {
    updateLabels();
    applyModelScale();
    writeUrl();
  });
  el.coreOnePreset?.addEventListener("click", () => applyCoreOnePreset());
  for (const radio of document.querySelectorAll('input[name="ship"]')) {
    radio.addEventListener("change", () => {
      applyShipSelection(selectedShipId()).catch((err) => {
        console.error(err);
        setStatus("Failed to load that base model.", true);
      });
    });
  }
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
  el.download3mf.addEventListener("click", download3mf);
  el.downloadPng.addEventListener("click", downloadPng);
  el.downloadScad.addEventListener("click", downloadOpenscadSnippet);
  el.copyLink.addEventListener("click", copyShareLink);
  el.resetView.addEventListener("click", () => {
    frameCamera();
    setStatus("View reset.");
  });
  el.fitSize.addEventListener("click", fitTextToHull);

  try {
    const initialFontId = FONT_OPTIONS[el.fontStyle.value]
      ? el.fontStyle.value
      : "optimer-bold";

    const [, geometry, layers] = await Promise.all([
      applyFontSelection(initialFontId, { rebuild: false }),
      loadShipGeometry(ship),
      loadShipLayers(ship),
    ]);

    shipGeometry = geometry;
    shipMesh = buildShipDisplay(geometry, ship, layers);
    modelGroup.add(shipMesh);
    applyModelScale();

    ready = true;
    setExportBusy(false);
    applyColor();
    await rebuildText();
    frameCamera();
    writeUrl();
    setStatus("Ready — edit the name, then download STL / 3MF / PNG.");
  } catch (err) {
    console.error(err);
    setStatus("Failed to load ship or font.", true);
    setExportBusy(true);
  }
}

function tick() {
  requestAnimationFrame(tick);
  controls.update();
  renderer.render(scene, camera);
}

boot();
tick();
