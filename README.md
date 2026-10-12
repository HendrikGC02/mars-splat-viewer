# Mars splat viewer

A browser viewer for Gaussian-splat reconstructions of NASA Perseverance rover scenes, built from public
PDS imagery. It's served by GitHub Pages and used in a 3D theatre room.

- **Live:** https://hendrikgc02.github.io/mars-splat-viewer/
- **Theatre link:** https://hendrikgc02.github.io/mars-splat-viewer/?stereo=tb (top-bottom stereo, left eye on top)

## This repo is a build output. Don't edit it here.

The source of truth is the viewer folder in the author's working tree (`C:\GaussianSplattingMars\Desktop\viewer`).
That folder holds the full scene set and the tests, and `build_site.py` there produces the contents of
this repo. If you edit `index.html` or `stereo.js` here directly, the next rebuild will overwrite your change.
Make the change in the source folder, then rebuild. `README.md` is the only file that exists only here.

Note: the source folder is **not** tracked by git (it sits untracked inside the `marsplat` repo). Don't
assume `git log` there will tell you its history.

| File | What it is |
|---|---|
| `index.html` | The whole viewer: UI, controls, render loop, optional "Enhanced detail" post-process |
| `stereo.js` | `StereoRig`: the off-axis eye cameras used for every stereo mode (see Gotchas) |
| `scenes.json` | The scene dropdown: `[{ "name": ..., "url": "scenes/<file>" }]`, first entry loads on open |
| `scenes/*.sog` | Compressed splat scenes (only the colour-calibrated ones are published) |
| `.nojekyll` | Makes Pages serve files as-is |

## Stack

- No build step and no package manager. ES modules come in through an import map in `index.html`.
- three.js `0.180.0` from jsDelivr.
- [Spark](https://sparkjs.dev) `2.3.1` (`SparkRenderer`, `SplatMesh`, `SparkControls`), loaded from
  `sparkjs.dev`. Spark loads `.sog`, `.spz` and `.ply`.
- To run it locally, serve the folder over HTTP. ES modules don't load from `file://`. From the source folder use
  `serve.bat` / `python serve.py` (http://localhost:8765). From here use `python -m http.server`.

## URL parameters

| Param | Values | Effect |
|---|---|---|
| `stereo` | `off`, `sbs`, `tb` | Initial 3D mode: side-by-side (L \| R) or top-bottom (L over R) |
| `squeeze` | `0`, `1` | Frame-packed stereo: each eye renders the full-frame view squeezed into its half. Default is on for `tb` and off for `sbs` |

Without parameters, the last mode used in that browser is restored from `localStorage`.

Keys: drag to look, `W A S D` move, `R`/`F` up/down, `Shift` faster, `B` cycle 3D mode, `E` enhanced
detail, `H` hide panel.

## Adding a scene

1. **Get a `.sog` file.** The training pipeline (`marsplat`) writes `.ply`. The existing `.sog` files were
   converted outside that repo, and the exact command wasn't recorded. PlayCanvas's `splat-transform`
   (`npx @playcanvas/splat-transform in.ply out.sog`) is the usual tool. Check the output by loading it in
   the local viewer before you publish it.
2. **Coordinates must match the existing scenes.** Scenes are trained Z-up (x forward, y left, z up),
   with the origin at the Mastcam-Z head (about 2 m above ground). The viewer rotates that into three.js Y-up
   and starts the camera 0.3 m below the origin looking along +X. A scene in another frame will load
   sideways or out of view.
3. **Size limit: under 100 MB per file.** GitHub rejects files over 100 MB, and Pages doesn't serve Git LFS
   objects, so you can't use LFS to get around it. Files over 50 MB push with a warning; that's fine.
   The largest scene today is `site26_v2_cal.sog` at 65 MB.
4. **In the source folder:** copy the file into `scenes/` and add an entry to `scenes.json`.
   `build_site.py` publishes only entries whose `url` ends in **`_cal.sog`** (colour-calibrated and
   compressed). Name the file to match, or change that filter on purpose.
5. **Test locally:** `python serve.py`, open http://localhost:8765/?stereo=tb, and check the new scene
   in mono and in stereo.
6. **Rebuild and publish** (see below).

To remove a scene, delete its `scenes.json` entry in the source folder, rebuild, and `git rm` the file
here. `build_site.py` copies files in but never deletes them.

## Rebuild and publish

```sh
git clone https://github.com/HendrikGC02/mars-splat-viewer.git
python C:/GaussianSplattingMars/Desktop/viewer/build_site.py mars-splat-viewer
cd mars-splat-viewer
git add -A && git commit -m "..." && git push
```

Pages runs from `main` at the root and goes live about a minute after the push. Scene files that haven't
changed don't add to repo size, because git stores identical files once. Changed or new scenes add their
full size to history every time, so don't push large scenes over and over for small tweaks.

## Tests

`tests/stereo.test.html` in the source folder (not published) checks `StereoRig` in the browser. Serve the
folder, open `/tests/stereo.test.html`, and every line should say PASS. Results are also exposed as
`window.__testResults`.

## Gotchas

- **Don't use `THREE.StereoCamera`'s eye cameras directly.** They store their pose only in `matrixWorld`,
  with an identity `matrix`. Spark calls `getWorldPosition()` on the render camera every frame, which
  resets the eye to the world origin, so stereo freezes and ignores the controls. `StereoRig` gives the eyes a
  real position and quaternion. It also copies near/far/fov from the main camera, because Spark reads them
  for its depth uniforms and sorting.
- **Top-bottom puts the left eye on top.** WebGL viewports start at the bottom-left, so in `eyeViewports()`
  the left eye goes at `y = floor(H/2)`.
- **"Enhanced detail" must not bleed across the seam between the eyes.** The shader's `clampEye()` keeps
  blur and sharpening taps inside each eye's half. The `uLayout` uniform sets the split (0 mono, 1 side-by-side,
  2 top-bottom). If you add a new layout, update `eyeViewports()`, `eyeAspect()`, `LAYOUT` and the shader together.
- **Rendering cost:** stereo renders the scene twice per frame. Site 26 has 5.2M splats, so the theatre PC
  needs a decent GPU.
- `SparkControls` binds E/Q to up/down by default. The viewer remaps them to R/F because E toggles
  enhanced detail.
