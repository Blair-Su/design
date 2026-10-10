# Cube.AI — local portfolio draft

Open `/cube-preview/` using the portfolio's local server. The local homepage links to this draft after the existing four projects.

This case-study page is excluded from the case preview sync and public build. Its homepage card is enclosed in `local-draft` markers, which the build removes. The two interactive experiences are published independently; see their public URLs below.

## Content sources

- Case-study copy and chapter order: the six screenshots supplied in the portfolio conversation on October 8, 2026. The repeated overview in the first two screenshots appears once.
- Prototype and demo: copies of `cube-prototype/dist` and `cube-demo/dist` from the Cubeboard.AI project, published separately under `cube/`. The case-study buttons open their public GitHub Pages URLs.
- Homepage cover: a locally rendered desktop-monitor illustration, combining the Cube logo and wordmark with the real demo's questions, notes, and colors. The GIF loops between the turning logo and board; a static poster is used for reduced-motion preferences. It is a product illustration, not a browser screenshot. Regenerate with `scripts/render-cube-cover.py`.
- Demo brief, three questions, eight ideas, face colors, and Impact × Effort ratings: `cube-prototype/dist/demo/seed.js` and `cube-prototype/dist/app.js` in that project.
- Workflow visuals are case-study diagrams of the real demo data, not screenshots. They replace the screenshot/recording placeholders in the supplied outline.

## Detail still to confirm

The project duration was not specified in the supplied material or the reviewed conversation. The timeline currently says **2026**, without inventing a number of weeks.

## Public prototype and demo

The two experiences are published through the portfolio's GitHub Pages repository. Their canonical public files are in `../cube/prototype/` and `../cube/demo/`; the older copies here are local snapshots. Each experience keeps its own browser-storage namespace. Cross-links work between the public directories, and Copy app link returns the public app URL. The case study itself remains a local draft.

- Prototype: https://www.blairsu.design/cube/prototype/
- Demo: https://www.blairsu.design/cube/demo/

Original hosted URLs (owner sign-in required):
- https://cubeboard-studio-blair.clever-flint-5576.chatgpt.site/
- https://cubeboard-demo-blair.clever-flint-5576.chatgpt.site/
