# Voxel Planetarium

A stylized voxel solar system with planetarium orbit view and third-person exploration on planet surfaces.

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:5173/Project_Zorg/](http://localhost:5173/Project_Zorg/)

**Important:** After code updates, hard refresh (`Ctrl+Shift+R` / `Cmd+Shift+R`).

## Production Preview (matches GitHub Pages paths)

```bash
npm run build
npm run preview
```

Open [http://localhost:4173/Project_Zorg/](http://localhost:4173/Project_Zorg/)

## GitHub Pages

The repo is set up to deploy automatically on every push to `main`.

### One-time setup

1. Create a GitHub repository named **`Project_Zorg`** (the name must match the Vite `base` path).
2. Push this project to `main`:

```bash
git remote add origin https://github.com/Zadagast/Project_Zorg.git
git push -u origin main
```

3. On GitHub: **Settings → Pages → Build and deployment → Source → GitHub Actions**.
4. Wait for the **Deploy to GitHub Pages** workflow to finish (Actions tab).

### Live URL

```
https://zadagast.github.io/Project_Zorg/
```

Replace `YOUR_USERNAME` with your GitHub username.

## Controls

**Planetarium mode**
- Drag to orbit
- Double-click a planet to focus
- Scroll to zoom in/out
- Zoom in close to land on the focused body

**Walk mode**
- WASD to move
- Drag or click the canvas to look
- Scroll out or press Esc to return to planetarium view

## Character models (AI `.vox`)

See [public/models/README.md](public/models/README.md). Drop `player.vox` / `enemy.vox` from Sorceress or VoxelSprites into `public/models/`.

## License

Game code: proprietary. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for open-source dependencies.
