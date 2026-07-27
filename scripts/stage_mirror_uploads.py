#!/usr/bin/env python3
"""Stage Printables files for MakerWorld / Thingiverse web upload.

  python3 scripts/stage_mirror_uploads.py

Writes printables/mirrors/upload/ (gitignored). Does not upload.
"""

from __future__ import annotations

import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "printables" / "starship-parametric"
OUT = ROOT / "printables" / "mirrors" / "upload"

CORE = [
    "starship_1_200_hex_tiles_one_piece.stl",
    "starship_1_200_hex_tiles_mmu.3mf",
    "starship_1_250_hex_tiles_one_piece.stl",
    "starship_1_300_hex_tiles_one_piece.stl",
    "starship_parametric.scad",
    "prusa_core_one_starship.ini",
    "bambu_p1s_starship.ini",
]


def main() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    files = SRC / "files"
    for name in CORE:
        src = files / name
        if not src.exists():
            raise SystemExit(f"missing {src}")
        shutil.copy2(src, OUT / name)
        print("staged", name)
    profiles = SRC / "PRINT_PROFILES.md"
    if profiles.exists():
        shutil.copy2(profiles, OUT / "PRINT_PROFILES.md")
        print("staged PRINT_PROFILES.md")
    img_out = OUT / "images"
    img_out.mkdir()
    for img in sorted((SRC / "images").glob("*.png")):
        shutil.copy2(img, img_out / img.name)
        print("staged images/", img.name)
    desc = (SRC / "DESCRIPTION.md").read_text()
    footer = (
        "\n\n---\nCanonical Printables: https://www.printables.com/model/1792868\n"
        "Customizer: https://leedsexplore.github.io/starship-custom-name/\n"
        "Source: https://github.com/leedsexplore/starship-custom-name\n"
        "License: CC BY-NC 4.0 — credit David Leeds (leedsexplore)\n"
    )
    (OUT / "DESCRIPTION.txt").write_text(desc + footer)
    print(f"\nReady: {OUT}")
    print("Upload via each site’s web UI — see printables/mirrors/README.md")


if __name__ == "__main__":
    main()
