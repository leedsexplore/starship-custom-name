# Mirror uploads (MakerWorld / Thingiverse)

**Canonical listing:** https://www.printables.com/model/1792868  
**Customizer:** https://leedsexplore.github.io/starship-custom-name/  
**Source:** https://github.com/leedsexplore/starship-custom-name  

License everywhere: **CC BY-NC 4.0** — credit David Leeds (leedsexplore).  
Deep-link Printables + the customizer on every mirror; do not invent a second “canonical.”

## Stage files

```bash
python3 scripts/stage_mirror_uploads.py
# → printables/mirrors/upload/  (gitignored)
```

## MakerWorld

1. Create model → upload staged STLs/3MFs + `.ini` helpers + gallery images.
2. Paste `DESCRIPTION.txt` (from the stage folder).
3. Category: closest to Vehicles / Space / Toys.
4. Tags: SpaceX, Starship, one-piece, hex, customizable, MMU, 1:200.

## Thingiverse

1. Create → upload core files (one-piece STL + MMU 3MF + inis; skip huge extras if needed).
2. Summary = first paragraph of DESCRIPTION.
3. License: Creative Commons — Attribution — Non-Commercial.
4. Footer links to Printables + customizer.

## Cults / others

Only if you are comfortable with the same CC BY-NC terms and trademark disclaimer.
