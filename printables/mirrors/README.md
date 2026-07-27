# Mirror packages (MakerWorld / Thingiverse)

Canonical listing stays on Printables:
https://www.printables.com/model/1792868

Upload the **same files** from `../starship-parametric/files/` plus gallery images.
Keep license **CC BY-NC 4.0**, credit David Leeds (leedsexplore), and link:

- Printables (canonical): https://www.printables.com/model/1792868
- Customizer: https://leedsexplore.github.io/starship-custom-name/
- Source: https://github.com/leedsexplore/starship-custom-name

## MakerWorld

1. Create model → upload STLs/3MFs (start with one-piece hex + MMU + stand 3MF + mini).
2. Paste DESCRIPTION.md (convert markdown lightly).
3. Category: Toys & Games / Vehicles or closest “Rocket / Space”.
4. Tags: SpaceX, Starship, MMU, one-piece, 1:200, heat shield.
5. Cover: use `images/01-cover.png` until you have a photo of a real make.

## Thingiverse

1. Create → upload same core files (Thingiverse prefers fewer large files — prioritize one-piece STL + MMU 3MF + stand).
2. Summary: first paragraph of DESCRIPTION.md.
3. License: Creative Commons — Attribution — Non-Commercial.
4. Link Printables + customizer in the description footer.

## Sync tip

```bash
python3 scripts/stage_mirror_uploads.py
# → printables/mirrors/upload/  (gitignored staging folder)
```

After `python3 scripts/rebuild_release.py`, re-run the stage script, then re-upload
changed assets on MakerWorld / Thingiverse.
