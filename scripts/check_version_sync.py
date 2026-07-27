#!/usr/bin/env python3
"""Fail if cache-bust / version strings drift across version.js, package.json, index.html, app.js."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main() -> None:
    version_js = (ROOT / "version.js").read_text()
    m = re.search(r'APP_VERSION\s*=\s*"([^"]+)"', version_js)
    if not m:
        print("FAIL  could not parse APP_VERSION from version.js")
        raise SystemExit(1)
    ver = m.group(1)

    pkg = json.loads((ROOT / "package.json").read_text())
    if pkg.get("version") != ver:
        print(f"FAIL  package.json version {pkg.get('version')!r} != {ver!r}")
        raise SystemExit(1)

    index = (ROOT / "index.html").read_text()
    for needle in (
        f"styles.css?v={ver}",
        f"app.js?v={ver}",
        f">v{ver}<",
    ):
        if needle not in index:
            print(f"FAIL  index.html missing {needle!r}")
            raise SystemExit(1)
    if index.count(f"v{ver}") < 2:
        print(f"FAIL  index.html should mention v{ver} in brand + footer")
        raise SystemExit(1)

    app = (ROOT / "app.js").read_text()
    for needle in (f"export3mf.js?v={ver}", f"version.js?v={ver}"):
        if needle not in app:
            print(f"FAIL  app.js missing {needle!r}")
            raise SystemExit(1)

    readme = (ROOT / "README.md").read_text()
    if f"**v{ver}**" not in readme and f"v{ver}" not in readme.split("\n", 3)[0]:
        # Require the badge line at the top
        if not readme.startswith(f"# Starship Custom Name\n\n**v{ver}**"):
            print(f"FAIL  README.md should start with **v{ver}** badge")
            raise SystemExit(1)

    print(f"ok    version sync {ver}")


if __name__ == "__main__":
    main()
