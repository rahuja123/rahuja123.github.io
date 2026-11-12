# rahuja123.github.io

Personal site. Deliberately minimal: two pages, no web fonts, no build step, one small script.

```
index.html          # home: one-line intro, three focus areas, links
research.html       # full paper list + patents
assets/style.css    # the only stylesheet (follows system light/dark)
assets/viz.js       # the canvas illustrations on the home page (VLA, fisheye, scene flow)
                    #   and their controls: instruction chips, lens slider
assets/thumbs/      # one diagram per paper, shown left of it on research.html
assets/favicon.svg  # tab icon (+ favicon-32.png and apple-touch-icon.png fallbacks)
404.html            # shown by GitHub Pages for any address that doesn't exist
assets/og-card.html # source for og.png, the link-preview image
assets/og.png       # 1200×630 preview shown when the link is shared
```

## Local preview

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000

## Deploy

Live at https://rahuja123.github.io, served by GitHub Pages from the `master` branch
(root). `.nojekyll` tells Pages to serve the files as-is instead of building with Jekyll.
To publish a change:

```bash
git add -A && git commit -m "Describe the change" && git push
```

It's live within a minute or two. The previous academicpages/Jekyll site is still in
the git history before the "Minimal personal site" commit.

## Editing

- **Add a paper**: copy an `<article class="paper">` block in `research.html` and point its
  `<img>` at a new file in `assets/thumbs/`. The thumbnails are plain 160×120 SVGs that
  switch colours with light/dark mode; to use a real figure from the paper instead, drop
  a PNG/JPG (4:3, ~480×360) in that folder and change the `src`. If the paper belongs on
  the home page, add a link line under the matching focus area in `index.html`.
- **Keep the home page short.** The design depends on it — detail goes in `research.html`.
- **After changing CSS or JS**, bump the `?v=` number on its `<link>`/`<script>` tag so
  browsers don't keep serving the cached copy.
- **Regenerate the link-preview image** after changing your name, title or focus areas
  (edit `assets/og-card.html`, then run):

  ```bash
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars \
    --force-device-scale-factor=1 --window-size=1200,630 --virtual-time-budget=2000 \
    --screenshot="$PWD/assets/og.png" "file://$PWD/assets/og-card.html"
  ```
- **Changed your title or employer?** Update it in three places: the line under the intro
  in `index.html`, the `jobTitle`/`worksFor` block near the top of `index.html` (what
  search engines read), and `assets/og-card.html` (then regenerate `og.png`).
