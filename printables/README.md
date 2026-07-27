# Printables packages

Listing packages ready to publish with the `printables-integration` CLI (lives in
`~/Projects/printables-integration` — it is not on GitHub).

## Publish `starship-parametric`

```bash
cp -R printables/starship-parametric ~/Projects/printables-integration/packages/

cd ~/Projects/printables-integration
printables validate packages/starship-parametric
printables publish packages/starship-parametric                          # dry-run
printables publish packages/starship-parametric --draft --no-dry-run --confirm
# review the draft on printables.com, then:
printables publish packages/starship-parametric --no-dry-run --confirm
```

Auth: the CLI needs a fresh Printables session cookie in
`~/.config/printables/credentials.json` (see the printables-integration README).

Notes:

- This listing is an ORIGINAL model (no `remix_of`), licensed CC BY 4.0. Keep it
  separate from the legacy `starship-custom-name` remix package, which stays
  CC BY-NC with Josh1297/anventia attribution.
- If the CLI's `printables.toml` schema differs from this file's keys, keep the
  values and rename keys to match `examples/sample-model/printables.toml`.
- Regenerate files after CAD changes:
  `python3 scripts/build_starship_cad.py --export --skip-render`,
  `openscad -o assets/starship_print_1_200_steel.stl openscad/export_print_steel.scad`,
  `openscad -o assets/starship_print_1_200_tiles.stl openscad/export_print_tiles.scad`,
  `python3 scripts/build_mmu_3mf.py`, `node scripts/build_sample_stl.mjs`.
