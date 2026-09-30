# Blair Su — portfolio

Source code and assets for Blair Su's portfolio. Repository: https://github.com/Blair-Su/design.

## Publishing

GitHub Pages serves the static website directly from the root of the `main` branch. The `.nojekyll` file preserves the generated HTML, CSS, JavaScript and assets without Jekyll processing. The production domain is `www.blairsu.design`; its binding is recorded in `CNAME`. Push website updates to `main` to publish them. The Node.js server below is only for local preview.

Start with `npm start`, then open http://127.0.0.1:4173/.
No package installation is needed. Node.js is the only runtime requirement.

Open http://127.0.0.1:4173/preview.html to switch between the homepage, About and four case studies, and between Desktop (1440px), Tablet (834px), and Phone (390px). Case-study previews scroll inside a viewport so their fixed Contents bar stays visible. This review page is separate from the portfolio itself.

## Editing

- `index.html`: Hero, navigation, four projects and footer.
- Hero accents follow the supplied reference: thin black rising strokes with two small interior loops beneath “users” and “business”. Both words retain ordinary word spacing without extra margins or padding.
- `styles.css`: shared rules and dedicated Desktop, Tablet (768–1023px), and Phone (up to 767px) layouts.
- `hero-hand.css` and `hero-hand.js`: waving-hand emoji beside Blair; click, tap, Enter or Space switches to a clapping emoji and a local confetti burst, then returns to waving. Reduced motion uses a still emoji and fading confetti.
- Case-study articles fill the outside frame with equal left/right insets matching the related-project heading (`--cell-inset`: Desktop 24px, Tablet 18px, Phone 16px). Artwork follows the wider article; fixed-position Lighthouse and Southern Crafted diagrams scale as complete canvases to preserve their proportions. Desktop content/chapter spacing is 72px/144px. No additional inner vertical rules are drawn.
- `script.js`: phone navigation dropdown, footer email and phone copy interactions, and the orange dot cursor. Homepage HHI uses VIEW SPONSORED PROJECT, other projects use VIEW CASE STUDY, and email/phone use COPY with their respective envelope or mobile-phone icon. Custom cursor is enabled only for a mouse with hover support.
- `assets/fonts/`: locally stored fonts; no external font request is required.
- All project covers use the same 16:9 ratio (1920×1080px for replacement artwork). Desktop and Tablet use aligned two-column rows; Phone uses a single column.
- HHI uses the user's supplied `HHI.png` unchanged as `assets/selected-projects/hhi-project-cover.png`. Its complete 16:9 composition scales to every breakpoint and retains the homepage's VIEW SPONSORED PROJECT cursor.
- Southern Crafted uses its original green (#2b422d) background and a centered laptop with a muted, looping, inline autoplay video.
- Nalu opens with its existing soft gradient and the supplied wordmark-first logo at 30% cover width. The same visible logo moves and scales down to the bottom-right (9.7% width) as the supplied scene fades in; its lettering becomes white against the photograph. The automatic twelve-second loop holds the finished composition, then reverses smoothly. The static logo paths were removed from the scene SVG so the moving logo never duplicates. The source photograph, text, and phone layers remain unchanged. Animation starts after decoding, never depends on hover, and reduced motion shows the finished composition without movement.
- Lighthouse preserves the original Selected Projects default composition: white background, yellow droplet, two phones and two station models. Its phones retain their automatic six-second movement and switch between the four original screen images, without requiring hover. Reduced motion keeps the default screens static. Additional source artwork is stored in `assets/selected-projects/`.

All four homepage project cards and the related-project cards link to local case studies. About links to the local `/about.html` page; Resume links to the existing Google document.

## About

`/about.html` preserves the original About introduction, all five work experiences, both education entries, and the fourteen-photo “What I’ve been diving into” gallery after Education. The intro pairs left-hand text with three photos: the supplied selfie above an original SCAD SERVE team photograph and a mountain photograph. The page shares the home navigation, footer, fonts and continuous ruled frame; phone layouts stack the intro and resume columns.

`about-page.css` styles the page, and `about-page.js` runs a seamless horizontal photo strip at 28px per second, with Pause/Resume control and manual horizontal scrolling. All fourteen photographs keep their proportions at 320px high on Desktop, 270px on Tablet and 230px on Phone. Reduced motion starts paused. Hover continues playback; direct scrolling, keyboard browsing and opening a photo take priority. The lightbox retains previous/next controls, arrow-key navigation and Escape dismissal. `scripts/build-about-page.py` rebuilds the page from `reference/about.html`, the local media in `assets/about/`, and the homepage shell. The builder requires Python, lxml and Pillow. No source photos are modified.

## Case studies

- `/project-3-hhi/`: HHI Concours, eight chapters.
- `/project-1-lighthouse/`: Lighthouse, seven chapters.
- `/project-2-southerncrafted/`: Southern Crafted, eight chapters.
- `/project-4-nalu/`: Nalu, five chapters.

Every case study ends with two cards copied directly from the homepage Work section, including its media, autoplay animations, captions, hover cursor and ruled grid. Following the homepage order (HHI Concours, Southern Crafted, Lighthouse, Nalu), each page shows the next two projects cyclically: 1→2,3; 2→3,4; 3→4,1; 4→1,2. Desktop and Tablet use two columns; Phone stacks them. The builder derives this order from the homepage cards.

The original case-study text, artwork and responsive content are preserved in each page. All pages share the homepage header, footer and orange cursor. The chapter divider lines span the viewport and cross the continuous outer rails, including a divider below the closing thank-you message. A fixed ruled Contents bar is available at every breakpoint, with chapter navigation, current-section highlighting, outside-click dismissal and Escape support.

HHI's New Design email has a taller preview (560–720px on Desktop/Tablet; 480px on Phone) with a bottom-right “click to view” label. Clicking or activating it with the keyboard opens the complete long image in a same-page, scrollable dialog. Close, Escape, or clicking the backdrop returns to the original reading position.
The Final Prototype introduction, Old Design and New Design share the same two-column grid on Desktop and Tablet: the right-hand copy and both images align at the article midpoint, with a 36px gap to the left text. Phone retains stacked, full-width content.

Southern Crafted's Card Sorting Workshop gallery has previous/next arrows centered inside the image's left/right edges on every breakpoint. Hover or keyboard focus shows a black tooltip with white destination text (See Header, See Body, or See Footer), updated after every switch. No page count is displayed; a screen-reader status announces the current slide. The three slides loop in either direction.

Southern Crafted's Desktop HMW statement is horizontally centered within its card and breaks after “find relevant information,” to balance the two lines, using the same 20px size and 1.5 line height as the “Guided by our style guide…” body copy. Tablet and Phone keep natural wrapping.

`case-study.css` and `case-study.js` style and control the shared case-study shell. `assets/case-studies/` contains the original layout styles, media and preserved carousel/artwork interactions. Inter and Newsreader case-study fonts are stored locally. The static server supports byte ranges for video playback.

The imported HTML snapshots are under `reference/case-studies/`. `scripts/build-case-pages.py` rebuilds the four pages from those snapshots and the shared homepage shell; it requires Python and lxml and uses no network access. The synced project `sources/` directory is not used or modified.

Local review screenshots and responsive verification reports are kept in `qa/`, which is excluded from the repository.

## Reference decisions

- Eemon Roy: fine outer rails, continuous inset card rails through images, captions and row spacing, a two-edged centre gutter, and horizontal rules with distinct full-frame and inset spans. Phone navigation has a single hamburger button; opening it shows Work / About / Resume as three ruled rows over the page, with an X to close.
- Static Hero with a translucent rounded orange highlight behind Product Designer. Users and business have distinct hand-drawn looping underlines; both inherit the Hero's black text color. The orange cursor uses `--accent-orange` (#ed612b). The highlight hue, saturation, lightness and opacity are editable via the `--hero-highlight-*` variables in `styles.css`. No large pink stroke, testimonials or sidequests section.
- Header uses a Blair Su text logo in the Hero's Averia Serif Libre font, at 20px to visually balance the uppercase 15px Work navigation label on Desktop, Tablet and Phone.
- Browser tab icons use the supplied portrait photo with rounded corners across Home, About, case studies and the responsive preview page.
- Rachel Chen: image above a left/right caption, placed in aligned rows as requested; 17px Source Serif 4 “Project name · Description” on the left in #32404f, with 15px Geist years above project types on the right. Cards up to 700px wide use two aligned rows: project name/year above description/type. On phone, types and years use 14px. Types are Figma Make Prototype (HHI), UI/UX Design (Southern Crafted), CodeX & Figma Prototype (Lighthouse), and Product Concept (Nalu).
- Footer: name and copyright align to the project images' left edge. About and Connect use plain text links with a lighter hover color; the lower copyright/back-to-top row has been removed.

Project placement: HHI Concours (2026) at top left, Southern Crafted (2024) at top right, Lighthouse (2023) below HHI Concours, and Nalu (2025) at bottom right. Short descriptions retain the existing homepage wording; years are verified against the existing public Blair Su pages.

Card project names use the muted text color. Type labels use medium weight (500) and each project's accent: HHI brown, Southern Crafted sage green, Lighthouse gold, and Nalu plum. The shared styles apply to both Home and related-project cards; names, descriptions and years retain regular weight, and years stay muted.

Source references: https://www.eemonroy.com/ · https://www.rachelchen.tech/ · https://www.blairsu.design/project-1-lighthouse/
