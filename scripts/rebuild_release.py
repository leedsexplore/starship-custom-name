#!/usr/bin/env python3
"""One-command rebuild of print meshes, hex package, envelope, and Printables files.

Runs OpenSCAD exports, MMU 3MF, hex emboss, measurement, package sync, and
validate — so you don't have to remember the individual steps.

  python3 scripts/rebuild_release.py
  python3 scripts/rebuild_release.py --skip-hex          # faster iterate on CAD
  python3 scripts/rebuild_release.py --skip-openscad     # only hex/package/measure

Requires: openscad on PATH, and a Python with numpy+trimesh for hex (the same
interpreter you use for emboss_hex_tiles.py).
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
OPENSCAD = ROOT / "openscad"
PRINTABLES = ROOT / "printables" / "starship-parametric"
PKG_FILES = PRINTABLES / "files"


def run(cmd: list[str], label: str) -> None:
    print(f"\n==> {label}")
    print("   ", " ".join(cmd))
    subprocess.check_call(cmd, cwd=ROOT)


def openscad_export(wrapper: Path, out: Path) -> None:
    exe = shutil.which("openscad")
    if not exe:
        sys.exit("openscad not on PATH")
    out.parent.mkdir(parents=True, exist_ok=True)
    run(
        [
            exe,
            "-o",
            str(out),
            "--export-format=binstl",
            str(wrapper),
        ],
        f"OpenSCAD → {out.relative_to(ROOT)}",
    )


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--skip-openscad", action="store_true")
    ap.add_argument("--skip-hex", action="store_true")
    ap.add_argument("--skip-package", action="store_true")
    args = ap.parse_args()
    t0 = time.time()
    py = sys.executable

    if not args.skip_openscad:
        openscad_export(
            OPENSCAD / "export_print.scad", ASSETS / "starship_ship_print_1_200.stl"
        )
        openscad_export(
            OPENSCAD / "export_print_steel.scad",
            ASSETS / "starship_print_1_200_steel.stl",
        )
        openscad_export(
            OPENSCAD / "export_print_tiles.scad",
            ASSETS / "starship_print_1_200_tiles.stl",
        )
        openscad_export(
            OPENSCAD / "export_print_tiles_shell.scad",
            ASSETS / "starship_print_1_200_tiles_shell.stl",
        )
        openscad_export(
            OPENSCAD / "export_print_engines.scad",
            ASSETS / "starship_print_1_200_engines.stl",
        )
        openscad_export(
            OPENSCAD / "export_print_flaps_tiles.scad",
            ASSETS / "starship_print_1_200_flaps_tiles.stl",
        )

        run(
            [py, str(ROOT / "scripts" / "build_mmu_3mf.py")],
            "smooth MMU 3MF",
        )
        run(
            [py, str(ROOT / "scripts" / "measure_ship_mesh.py")],
            "print_envelope.json",
        )

    if not args.skip_hex:
        run(
            [py, str(ROOT / "scripts" / "emboss_hex_tiles.py")],
            "hex tiles + hex one-piece + hex MMU",
        )

    if not args.skip_package:
        PKG_FILES.mkdir(parents=True, exist_ok=True)
        copies = [
            (
                ASSETS / "starship_ship_print_1_200_hex.stl",
                PKG_FILES / "starship_1_200_hex_tiles_one_piece.stl",
            ),
            (
                ASSETS / "starship_print_1_200_mmu_hex.3mf",
                PKG_FILES / "starship_1_200_hex_tiles_mmu.3mf",
            ),
        ]
        for src, dst in copies:
            if not src.exists():
                sys.exit(f"missing {src} — hex build failed?")
            shutil.copy2(src, dst)
            print(f"synced {dst.relative_to(ROOT)}")

        run([py, str(ROOT / "scripts" / "build_mini_scale.py")], "1:300 mini hex")
        run(
            [py, str(ROOT / "scripts" / "build_sliced_hints_3mf.py")],
            "hex MMU print-hint metadata",
        )

        run(
            [py, str(ROOT / "scripts" / "validate_printables_package.py")],
            "validate Printables package",
        )

    print(f"\nALL DONE in {time.time() - t0:.1f}s")
    print("Next (optional): publish with printables-integration CLI — see printables/README.md")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
