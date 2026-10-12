# Mars splat viewer

A browser viewer for Gaussian-splat reconstructions of NASA Perseverance rover scenes, built from public
PDS imagery. It's served by GitHub Pages and used in a 3D theatre room.

- **Live:** https://hendrikgc02.github.io/mars-splat-viewer/
- **Theatre link:** https://hendrikgc02.github.io/mars-splat-viewer/?stereo=tb (top-bottom stereo, left eye on top)

## This repo is the source of truth

Edit everything here and push. What's on `main` is what's live: Pages serves `main` from the repo root,
and there's no build step. The scene files themselves are trained and converted elsewhere (see
"Adding a scene").

| File | What it is |
|---|---|
| `index.html` | The whole viewer: UI, controls, render loop, optional "Enhanced detail" post-process |
| `stereo.js` | `StereoRig`: the off-axis eye cameras used for every stereo mode (see Gotchas) |
| `scenes.json` | The scene dropdown: `[{ "name": ..., "url": "scenes/<file>" }]`, first entry loads on open |
| `scenes/*.sog` | Compressed splat scenes. Every file here is public and costs repo size (see below) |
| `tests/stereo.test.html` | Browser tests for `StereoRig` |
| `serve.py`, `serve.bat` | Local dev server on http://localhost:8765 (`serve.bat` also opens the browser) |
| `.nojekyll` | Makes Pages serve files as-is |

## Stack

- No build step and no package manager. ES modules come in through an import map in `index.html`.
- three.js `0.180.0` from jsDelivr.
- [Spark](https://sparkjs.dev) `2.3.1` (`SparkRenderer`, `SplatMesh`, `SparkControls`), loaded from
  `sparkjs.dev`. Spark loads `.sog`, `.spz` and `.ply`.
- To run it locally, serve the folder over HTTP with `python serve.py` (any Python 3). ES modules don't
  load from `file://`.

## URL parameters

| Param | Values | Effect |
|---|---|---|
| `stereo` | `off`, `sbs`, `tb` | Initial 3D mode: side-by-side (L \| R) or top-bottom (L over R) |
| `squeeze` | `0`, `1` | Frame-packed stereo: each eye renders the full-frame view squeezed into its half. Default is on for `tb` and off for `sbs` |

Without parameters, the last mode used in that browser is restored from `localStorage`.

Keys: drag to look, `W A S D` move, `R`/`F` up/down, `Shift` faster, `B` cycle 3D mode, `E` enhanced
detail, `H` hide panel.

## Adding a scene

1. **Get a `.sog` file.** The training pipeline (`marsplat`) writes `.ply`, and the scenes are converted to
   compressed `.sog` with separate tooling that lives alongside the training code, not in this repo.
   `.ply` also loads, but those files run to hundreds of MB, far over the size limit below.
2. **Coordinates must match the existing scenes.** Scenes are trained Z-up (x forward, y left, z up),
   with the origin at the Mastcam-Z head (about 2 m above ground). The viewer rotates that into three.js Y-up
   and starts the camera 0.3 m below the origin looking along +X. A scene in another frame will load
   sideways or out of view.
3. **Size limit: under 100 MB per file.** GitHub rejects files over 100 MB, and Pages doesn't serve Git LFS
   objects, so you can't use LFS to get around it. Files over 50 MB push with a warning; that's fine.
   The largest scene today is `site26_v2_cal.sog` at 65 MB.
4. **Add it:** copy the file into `scenes/` and add an entry to `scenes.json`. Order in `scenes.json` is
   dropdown order, and the first entry loads on open. So far only colour-calibrated scenes have been
   published, named `*_cal.sog`. That's a convention, not something the code enforces.
5. **Test locally:** `python serve.py`, open http://localhost:8765/?stereo=tb, and check the new scene
   in mono and in stereo.
6. **Publish:** commit and push to `main`. The site goes live about a minute later. You can follow the
   build with `gh api repos/HendrikGC02/mars-splat-viewer/pages/builds/latest --jq .status`.

To remove a scene, delete its `scenes.json` entry and `git rm` the file.

**Repo size:** git keeps every version of every scene forever. Deleting or replacing a scene doesn't shrink
the repo. GitHub recommends keeping repos under about 1 GB, and Pages sites have a 1 GB limit. So test
scenes locally and commit only the final versions, not every iteration.

## Tests

Serve the folder, open http://localhost:8765/tests/stereo.test.html, and every line should say PASS.
Results are also exposed as `window.__testResults`. Run the tests after any change to `stereo.js` or to
how the eye cameras are used.

## Gotchas

- **Don't use `THREE.StereoCamera`'s eye cameras directly.** They store their pose only in `matrixWorld`,
  with an identity `matrix`. Spark calls `getWorldPosition()` on the render camera every frame, which
  resets the eye to the world origin, so stereo freezes and ignores the controls. `StereoRig` gives the eyes a
  real position and quaternion. It also copies near/far/fov from the main camera, because Spark reads them
  for its depth uniforms and sorting.
- **Top-bottom puts the left eye on top.** WebGL viewports start at the bottom-left, so in `eyeViewports()`
  the left eye goes at `y = floor(H/2)`. To check by eye, set eye separation to 50 cm: near objects should
  sit further right in the top image than in the bottom one.
- **"Enhanced detail" must not bleed across the seam between the eyes.** The shader's `clampEye()` keeps
  blur and sharpening taps inside each eye's half. The `uLayout` uniform sets the split (0 mono, 1 side-by-side,
  2 top-bottom). If you add a new layout, update `eyeViewports()`, `eyeAspect()`, `LAYOUT` and the shader together.
- **Rendering cost:** stereo renders the scene twice per frame. Site 26 has 5.2M splats, so the theatre PC
  needs a decent GPU.
- `SparkControls` binds E/Q to up/down by default. The viewer remaps them to R/F because E toggles
  enhanced detail.
