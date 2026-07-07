# Stone-classifier training corpus

- Photos of printed Go diagrams used to train the per-intersection stone
  classifier. Never shipped: `.gcloudignore` excludes `training/` from Cloud
  Run source uploads.
- Layout: `corpus/<publisher>/<book>-<page-or-figure>.jpeg`, one diagram per
  photo, original camera file.
- Each photo gains a `.json` sidecar during labelling (corners, per-
  intersection labels, provenance). Patches are never stored; they are
  extracted from photo + sidecar at training time, so pipeline improvements
  apply retroactively to the whole corpus.
- Capture: fill the frame with the diagram, page as flat as practical,
  ordinary lighting. Prefer dense diagrams (many stones), and include
  number-labelled and unlabelled stones.
