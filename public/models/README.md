# Voxel character models (`.vox`)

Drop AI-generated **MagicaVoxel** files here. The game loads them automatically.

| File | Used for |
|------|----------|
| `player.vox` | Third-person explorer |
| `enemy.vox` | Hostile creatures (future spawn system) |

If a file is missing, a matching **code blueprint** is used instead (same voxel style as planets).

## AI tools that export `.vox`

1. **[Sorceress Voxel Studio](https://sorceress.games/pages/voxel-studio)** — text/image → voxel → export `.vox`
2. **[VoxelSprites](https://voxelsprites.com/en/tools/ai-voxel-generator)** — prompt → mesh; export `.vox` from editor
3. **MagicaVoxel** — hand-edit any export

## Tips for good in-game characters

- **Y-up, character standing** — feet at the bottom of the grid, facing forward (+Z in MagicaVoxel)
- **Humanoid size** — roughly 12–24 voxels tall works well (auto-scaled to ~1.8 units)
- **Palette** — use solid colors; no need for textures
- **Single model** — one `.vox` per character (avoid multi-object scenes if possible)

## After adding files

```bash
npm run dev
# or push to GitHub Pages — hard refresh and check v0.6.0+
```

Open the browser console: you should see `Loaded voxel character from …/models/player.vox`.
If load fails, the procedural humanoid blueprint is used and a warning is logged.

## Enemy blueprint

`enemy.vox` is optional. `createEnemyBlueprint()` in code is the fallback until you add one.
