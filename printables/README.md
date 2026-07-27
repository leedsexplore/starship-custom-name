# Printables packages

Listing packages ready to publish with the `printables-integration` CLI (lives in
`~/Projects/printables-integration` on your Mac — it is not on GitHub and is not
available in this cloud agent environment).

## Preflight (works anywhere)

```bash
python3 scripts/validate_printables_package.py
```

Checks structure, CC BY-NC 4.0 / no-remix flags, required tags, and that the
package includes the **hex** one-piece STL + hex MMU 3MF (+ `.scad`). Run this
before every publish.

## Publish `starship-parametric` (Mac only)

Needs a fresh Printables browser session cookie in
`~/.config/printables/credentials.json` (see the printables-integration README:
`auth.access_token` + `client-uid`).

```bash
# 1. Sync the package into the CLI workspace
cp -R printables/starship-parametric ~/Projects/printables-integration/packages/

cd ~/Projects/printables-integration

# 2. Validate (CLI schema check)
printables validate packages/starship-parametric

# 3. Dry-run (prints the GraphQL plan; touches nothing)
printables publish packages/starship-parametric

# 4. Draft publish (creates an unpublished draft you can review in the UI)
printables publish packages/starship-parametric --draft --no-dry-run --confirm

# 5. Review the draft on printables.com, then go live
printables publish packages/starship-parametric --no-dry-run --confirm
```

Notes:

- This listing is an ORIGINAL model (no `remix_of`), licensed CC BY-NC 4.0. Keep it
  separate from the legacy `starship-custom-name` remix package, which stays
  CC BY-NC with Josh1297/anventia attribution.
- Package `files/` is hex one-piece STL + hex MMU 3MF + parametric `.scad` (not the
  web customizer sample, and not the smooth MMU).
- If the CLI's `printables.toml` schema differs from this file's keys, keep the
  values and rename keys to match `examples/sample-model/printables.toml`.
- Regenerate files after CAD changes:
  `python3 scripts/build_starship_cad.py --export --skip-render`,
  `openscad -o assets/starship_print_1_200_steel.stl openscad/export_print_steel.scad`,
  `openscad -o assets/starship_print_1_200_tiles.stl openscad/export_print_tiles.scad`,
  `python3 scripts/build_mmu_3mf.py`,
  `python3 scripts/emboss_hex_tiles.py`,
  then copy the hex outputs into `printables/starship-parametric/files/`.
