#!/usr/bin/env python3
"""Render preview images and export meshes from the parametric Starship model.

  python3 scripts/build_starship_cad.py            # previews only (fast)
  python3 scripts/build_starship_cad.py --export   # previews + STL/3MF

The model's windward (tiled) side faces +X and the flaps lie on the +-Y axis, so
the leeward elevation is shot from -X and both flaps show edge-on, matching the
2D reference drawing.
"""

import argparse
import shutil
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MODEL = ROOT / "openscad" / "starship_parametric.scad"
PRINT_WRAPPER = ROOT / "openscad" / "export_print.scad"
RENDERS = ROOT / "renders"
ASSETS = ROOT / "assets"

SHIP_H = 52.1
# True 1:200 of published ship height (52.1 m → 260.5 mm). Fits Prusa CORE One Z=270.
PRINT_SCALE = 200
PRINT_HEIGHT_MM = SHIP_H * 1000.0 / PRINT_SCALE  # 260.5

# rot_z spins the model, so rot_z=90 swings the +X (windward) face toward the
# camera and rot_z=270 presents the bare steel leeward face. The aft view looks
# straight up the engine bay, where fitting the whole 52 m height would shrink
# the bay to nothing, so it sets its own zoom and drops the tile shell.
VIEWS = {
    "cad_leeward": dict(proj="o", rx=90, rz=270, dist=150, size=(900, 1600)),
    "cad_windward": dict(proj="o", rx=90, rz=90, dist=150, size=(900, 1600)),
    "cad_flapedge": dict(proj="o", rx=90, rz=0, dist=150, size=(900, 1600)),
    "cad_threequarter": dict(proj="p", rx=72, rz=125, dist=170, size=(1000, 1400)),
    "cad_aft": dict(proj="o", rx=180, rz=0, dist=26, size=(1100, 1100),
                    viewall=False, tiles=False),
}


def openscad_bin() -> str:
    exe = shutil.which("openscad")
    if exe:
        return exe
    mac = Path("/Applications/OpenSCAD.app/Contents/MacOS/OpenSCAD")
    if mac.exists():
        return str(mac)
    sys.exit("openscad not found on PATH or in /Applications")


def run(cmd, label):
    t0 = time.time()
    proc = subprocess.run(cmd, capture_output=True, text=True)
    dt = time.time() - t0
    if proc.returncode != 0:
        print(f"  FAIL  {label} ({dt:.1f}s)")
        err = (proc.stderr or proc.stdout).strip().splitlines()
        for line in err[-12:]:
            print(f"        {line}")
        return False
    warn = [l for l in (proc.stderr or "").splitlines() if "WARNING" in l or "ERROR" in l]
    note = f"  ({len(warn)} warnings)" if warn else ""
    print(f"  ok    {label} ({dt:.1f}s){note}")
    for line in warn[:4]:
        print(f"        {line.strip()}")
    return True


def render(exe: str) -> None:
    RENDERS.mkdir(exist_ok=True)
    print("rendering previews")
    for name, v in VIEWS.items():
        out = RENDERS / f"{name}.png"
        w, h = v["size"]
        cmd = [exe, "-o", str(out), f"--projection={v['proj']}", "--autocenter"]
        if v.get("viewall", True):
            cmd.append("--viewall")
        cmd += [
            f"--camera=0,0,0,{v['rx']},0,{v['rz']},{v['dist']}",
            f"--imgsize={w},{h}",
            "--colorscheme=Tomorrow",
        ]
        if not v.get("tiles", True):
            cmd += ["-D", "show_tiles=false"]
        cmd.append(str(MODEL))
        run(cmd, out.name)


def export(exe: str, *, full_meters: bool = False) -> None:
    ASSETS.mkdir(exist_ok=True)
    print("exporting meshes")

    # Full-meter STL with tile shell is huge/slow — only when explicitly requested.
    if full_meters:
        real = ASSETS / "starship_ship_parametric_m.stl"
        run([exe, "-o", str(real), "--export-format=binstl", str(MODEL)], real.name)

    # STL first (required). 3MF is optional — some OpenSCAD builds lack lib3mf.
    stl = ASSETS / "starship_ship_print_1_200.stl"
    run(
        [
            exe, "-o", str(stl),
            "--export-format=binstl",
            "-D", f"print_height_mm={PRINT_HEIGHT_MM}",
            str(PRINT_WRAPPER),
        ],
        stl.name,
    )
    threemf = ASSETS / "starship_ship_print_1_200.3mf"
    ok = run(
        [
            exe, "-o", str(threemf),
            "--export-format=3mf",
            "-D", f"print_height_mm={PRINT_HEIGHT_MM}",
            str(PRINT_WRAPPER),
        ],
        threemf.name,
    )
    if not ok:
        print("        (skipping 3mf — this OpenSCAD build may lack lib3mf)")

    # CAD preview used by the web/docs path (measured 1:200 solid, no tile shell)
    preview_src = RENDERS / "cad_threequarter.png"
    preview_dst = ASSETS / "starship-cad-preview-1-200.png"
    if preview_src.exists():
        shutil.copy2(preview_src, preview_dst)
        print(f"  ok    copied {preview_dst.relative_to(ROOT)}")

    for f in sorted(ASSETS.glob("starship_ship_p*")):
        print(f"        {f.name}  {f.stat().st_size / 1e6:.2f} MB")

    # Refresh measured envelope (customizer mesh + parametric print STL)
    measure = ROOT / "scripts" / "measure_ship_mesh.py"
    if measure.exists():
        print("measuring meshes → assets/print_envelope.json")
        run([sys.executable, str(measure)], "print_envelope.json")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--export", action="store_true", help="also write STL/3MF")
    ap.add_argument("--skip-render", action="store_true")
    ap.add_argument(
        "--full-meters",
        action="store_true",
        help="also export the slow full-meter STL (includes tile shell)",
    )
    args = ap.parse_args()

    exe = openscad_bin()
    print(f"openscad: {exe}\nmodel   : {MODEL.relative_to(ROOT)}")
    print(f"print    : 1:{PRINT_SCALE} → {PRINT_HEIGHT_MM} mm\n")
    if not args.skip_render:
        render(exe)
    if args.export:
        export(exe, full_meters=args.full_meters)


if __name__ == "__main__":
    main()
