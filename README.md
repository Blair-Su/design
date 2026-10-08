# Blair Su — portfolio

Source code and assets for Blair Su's portfolio. Repository: https://github.com/Blair-Su/design.

## Publishing

GitHub Pages serves the static website directly from the root of the `main` branch. The `.nojekyll` file preserves the generated HTML, CSS, JavaScript and assets without Jekyll processing. The production domain is `www.blairsu.design`; its binding is recorded in `CNAME`. Push website updates to `main` to publish them. The Node.js server below is only for local preview.

Before committing a website update, run `npm run build`: it syncs the approved case-study drafts to the four public `project-*` routes and prepares `public-dist/`. Commit the public route files as well as the editable drafts; GitHub Pages serves the repository root. `npm run site:sync` performs only the case-study sync.

Start with `npm start`, then open http://127.0.0.1:4173/.
No package installation is needed. Node.js is the only runtime requirement.

Open http://127.0.0.1:4173/preview.html to switch between the homepage, About and four case studies, and between Studio (2160px), Desktop (1440px), Tablet (834px), and Phone (390px). Homepage previews use a fixed display viewport and scroll inside the frame, so the first-screen Hero is represented accurately. Case-study previews also scroll inside a viewport so their fixed Contents bar stays visible. Use `preview.html?device=studio` to open the 2160 × 1200 large-display preset directly. This review page is separate from the portfolio itself.

## Little fox AI companion

The approved orange pixel fox sits near the bottom of every page, horizontally centered under the header’s Resume button on Desktop and Tablet. Its alignment follows font loading and viewport resizing; Phone keeps the right-rail placement. It has white inner ears and a black T-shaped nose/mouth. `assets/chat/fox-pixel-approved.png` is the transparent source illustration; `fox-avatar.js` reuses it in fixed-body and tail layers. The body, face, seated pose and position stay fixed. Only the tail gently swings ±8 degrees in a 4.8-second loop, with its root overlapping behind the body. Matched motion curves pass through the center and loop boundary without stopping, slowing only at the two extremes. The moving tail uses subpixel interpolation to avoid pixel-snapping shimmer while the stationary body retains its pixel rendering. Transparent margins and visible overflow keep the tail inside the stage throughout the loop. The avatar stage is 96px on desktop and 80px on phone (64px on short screens or while the phone keyboard is open).

There are no automatic walking, grooming, playing, sleeping or wake-up pose changes. Clicking the fox opens a non-modal chat above it. Background tabs pause the tail; reduced-motion visitors receive the still illustration. The white speech bubble appears only on mouse hover; tapping the fox opens chat directly.

The chat uses the homepage’s white background, thin gray rules and existing typefaces. Its minimal layout has a plain header, open whitespace and text-only suggestions above the input. The homepage’s empty-chat greeting reads “Curious about something?”; About reads “Curious about Blair?”. On project pages (including local drafts), both the hover bubble and the empty-chat greeting read “Ask me about this project”. Home and About retain the “Ask me about Blair” hover bubble. Reset uses a circular reset icon, and Send uses a paper plane that switches to a stop square during replies. These controls retain accessible labels and hover titles.

The frontend uses native `fetch`, `ReadableStream`, `TextDecoder` and a shared SSE parser, without a chat SDK. It sends `message`, recent `conversationHistory`, allowlisted `pageContext`, `selectedPhotos` and selected-text `context`. It supports incremental Markdown, complete-link buffering, catalog-only `[IMAGE:id]` photo cards, a text-selection action via `askBlair`, Stop, Retry, Reset, and tab-scoped `sessionStorage`. The API forwards text deltas as `data: {"delta":"..."}\n\n` and ends successful streams with `data: [DONE]\n\n`. Interrupted streams are marked incomplete and excluded from future history. Follow-up suggestions use the visitor’s current question rather than project names or broad keywords in the AI reply. General questions reset the project topic, including on a case-study page. Clear project questions and their follow-ups keep that topic, and every project suggestion names its project explicitly.

### Free Cloudflare chat

The Worker is deployed at `https://blair-portfolio-chat.suxun70.workers.dev/api/chat`; `assets/chat/config.js` uses this verified endpoint. Real English and Chinese replies were checked on 2026-10-06. The Cloudflare account remains on Workers Free. The public website needs its normal GitHub Pages publish step to receive the frontend configuration.

The selected backend is a separate Cloudflare Worker with a Workers AI binding, using `@cf/qwen/qwen3-30b-a3b-fp8`. The static website stays on GitHub Pages. No domain transfer, OpenAI API key, external database or paid-provider fallback is needed. Keep the Cloudflare account on **Workers Free**. The current free allowance is 10,000 Workers AI neurons per day and 100,000 Worker requests per day; usage beyond the free limit fails rather than buying additional usage. The request count possible within the AI allowance varies with prompt and answer length. See [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/) and [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/).

Each reply is capped at 600 output tokens and a short recent history. The built-in rate limiter permits 6 requests per minute per hashed IP **per Cloudflare location**; this is an abuse throttle, not a global spending cap. Workers Free is the protection against paid overage. CORS permits only the configured website and local-preview origins, but does not authenticate visitors.

When AI is unconfigured, unavailable, throttled or out of allowance, the chat shows curated bilingual portfolio answers labelled **Portfolio FAQ**, with an explicit saved-answer notice. An unknown question receives an honest fallback with portfolio/contact links. A one-minute browser cooldown avoids repeatedly requesting an unavailable service. Saved FAQ exchanges are excluded from AI history. A partially received AI response remains marked incomplete; it is never replaced with a saved answer. Stopping a reply does not trigger a fallback.

The application does not log chat content. Cloudflare processes questions, recent conversation and selected public portfolio context when AI is connected; the chat's information panel explains this. Session history stays in the visitor's tab. Keep `server/knowledge.js` and the FAQ limited to public portfolio information.

### Local preview

1. Use Node.js 22 or newer. `npm start` previews the site without installing packages or adding a key. For the current preview, use `PORT=4187 npm start`.
2. Without `CLOUDFLARE_CHAT_URL`, the local `/api/chat` route runs the Worker with AI disabled and returns clearly labelled saved portfolio answers. This local route alone is not a live AI connection; the browser now uses the verified remote endpoint in `config.js`.
3. After deployment, optionally copy `.env.example` to `.env` and set `CLOUDFLARE_CHAT_URL` to the verified `https://<worker>.<subdomain>.workers.dev/api/chat` URL. Restart the preview. Environment files and Wrangler credentials are ignored by Git.
4. `npm install` is needed for deployment tooling. `npm run chat:check` bundles and validates the Worker without uploading it or running inference. `wrangler dev` with the AI binding is different: inference is remote and uses the account's allowance.

### Connect and deploy

A walkthrough in Chinese is available in [cloudflare/SETUP.md](cloudflare/SETUP.md).

1. Register at [Cloudflare](https://dash.cloudflare.com/sign-up), verify the email address, and confirm the account uses **Workers Free**. Do not enable a paid plan. The website domain does not need to be added or moved.
2. Run `npm install`, then `npm run chat:login`. Complete Cloudflare's browser authorization yourself; never paste a password, login code or API token into chat or frontend files.
3. Review `wrangler.jsonc`: the AI binding, model in `cloudflare/worker.js`, free-plan limits and exact `ALLOWED_ORIGINS`. For another preview port, add that exact origin.
4. Run `npm run chat:deploy`. If prompted for a `workers.dev` subdomain, choose one for the account. Append `/api/chat` to the successfully deployed Worker URL. Check an actual portfolio question and confirm the reply is AI output, not a **Portfolio FAQ** fallback, before claiming the connection works.
5. Set `CHAT_ENDPOINT` in `assets/chat/config.js` to that verified Worker URL. Publish this frontend change through the existing GitHub Pages workflow. Until it is published, the public static site cannot use the new endpoint. The local default `/api/chat` route still supports the optional preview proxy above.

The older OpenAI/Vercel handler remains available as an **inactive, separately billed alternative**. It runs locally only if `CHAT_PROVIDER=openai` is explicitly set; the Cloudflare Worker never calls it. Its server-only settings remain commented in `.env.example`. Do not deploy that alternative as part of the free setup. Switching providers would also require updating the chat's provider notice.

### Content and validation

- `assets/chat/pet.js`, `pet.css`: chat UI and fox presentation. `fox-avatar.js`: approved artwork layers and tail animation. `pet-motion.js`: reduced-motion and background-tab pause handling. Earlier action controllers and illustrations are unused references. `config.js`: public endpoint. `catalog.js`: project prompts and image allowlist. `core.js`: shared SSE/Markdown handling. `faq.js`: curated saved portfolio answers.
- `cloudflare/worker.js`, `wrangler.jsonc`: free AI binding, origin rules, input validation, rate limits, streaming and fallback. `server/cloudflare-preview.js`: local preview and optional remote Worker proxy. `server/chat-shared.js`: shared validation and public portfolio instructions.
- `server/knowledge.js`: generated reference text from About and the four case studies. Run `npm run chat:knowledge` after updating portfolio content; the script uses only Python's standard library. Local HHI/Lighthouse drafts have separate reference entries, used only when a preview context is requested. Sources with conflicting metrics are preserved and the assistant is instructed not to invent a reconciled result.
- `npm test`: mocked provider tests covering validation, UTF-8/SSE fragmentation, safe rendering, incomplete streams, origin rules, quotas, cancellation and labelled FAQ fallback. No real AI calls occur.
- `npm run build`: produces browser assets only. Environment files, Worker/server modules, source snapshots and tests are excluded. The local server also refuses private source/config paths.
- `tests/pet.browser.mjs` and `tests/cloudflare.browser.mjs`: browser checks using Playwright and a running local preview. Set `PREVIEW_URL` and optionally `PLAYWRIGHT_MODULE`. Screenshots go to ignored `qa/`. These verify real local FAQ handling and mocked AI streams; live model quality requires an authorized Cloudflare account and a deployed Worker.

Implementation references: [Workers AI bindings](https://developers.cloudflare.com/workers-ai/configuration/bindings/), [Qwen model](https://developers.cloudflare.com/workers-ai/models/qwen3-30b-a3b-fp8/), [rate-limit binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/). Interaction inspiration: [Rachel Chen](https://www.rachelchen.tech/).

## Editing

- `index.html`: Hero, navigation, four projects and footer.
- Tool-box decorations follow the supplied “Build with AI Tools Illustration” reference: textured lime and lilac background shapes, coral petals, and bold black hand-drawn rays, rings and loops. No strokes sit underneath the box. Separate SVG layers sit behind and in front of the box and tool-card canvas. Explicit CSS gives the front layer an 8-unit rounded stroke and the color layer no stroke, overriding the homepage's generic UI-icon style. The decorations remain in place during entry and replay, with staggered 3.6–4.6 second breathing, swaying, twinkling and floating loops; only the four tool cards pop out of the box. The card positions are slightly adjusted to leave room for the strokes, while their sizes and replay behavior remain unchanged. Reduced motion keeps all decorations still. The transparent `assets/vibe-tools/box-clean.webp` removes the original blue stripe; the original `box.webp` remains available as the source.
- Hero introduction text uses a compact responsive scale (36–48px on Desktop, 36px on Tablet, 27–32px on Phone), a 920px maximum text width, and relaxed line height. Reduced vertical padding and a centered 1040px illustration grid with two 400px stages bring Work closer to the introduction. Both illustration captions and visible artwork bottoms remain aligned; Phone keeps equally sized stacked stages up to 340px wide.
- The left illustration uses `--vibe-height-scale: .88` to lower its top edge and balance the visual height of Craft with Taste. The box is 12% shorter at the same width and bottom baseline; tool-card centers and decoration positions move down with the composition while their shapes and sizes stay intact. The canvas mask, launch origin and static fallback follow the same proportions.
- On windows at least 600px wide, the complete Hero fills the opening viewport below the header so Work begins below the fold. The introduction keeps its comfortable type scale (34–42px on shorter windows); both illustrations use the remaining vertical room, up to 430px wide, after reserving space for their aligned captions. The artwork group is a size container so stage widths respond to the actual space left below the text rather than shrinking everything by a fixed viewport ratio. Both illustrations remain side by side and retain their visible-bottom alignment.
- In the side-by-side Hero layout, the visible spaces above the introduction, between the introduction and illustrations, and below the captions are equal. The text and illustration group are positioned together after font loading and layout resizing, accounting for the artwork's transparent upper margin while preserving illustration sizes. Phone keeps its stacked layout and balances the space above and below the introduction.
- At widths of at least 1800px and heights of at least 900px, the homepage uses dedicated large-display proportions: 50–68px introduction text, a 1280px text measure, a 1480px illustration grid, artwork up to 680px wide, and 30–36px captions. Illustration sizes still respect the available viewport height so both captions remain visible. Smaller or shorter windows retain the existing layout.
- The transparent craft illustration sits to the right of “Build with AI tools” on Desktop and Tablet, and stacks below it on Phone. Its “Craft with Taste” caption uses the same typography and alignment as the tool-box caption. `assets/craft/craft-loop-yellow.webp` plays a four-second loop with a yellow pencil; visitors who prefer reduced motion receive `craft-still-yellow.webp` through the picture element. The artwork itself has no background, bottom title, or title underline. An 8% vertical offset inside its shared-height stage aligns the artwork's visible bottom with the tool box while keeping both captions on the same baseline.
- Hero accents follow the supplied reference: thin black rising strokes with two small interior loops beneath “users” and “business”. Both words retain ordinary word spacing without extra margins or padding.
- `styles.css`: shared rules and dedicated Desktop, Tablet (768–1023px), and Phone (up to 767px) layouts.
- Case-study text panels, research quotes, guiding principles and validation notes have square corners across all four projects and all three responsive layouts; their existing borders, backgrounds and padding are preserved.
- `hero-hand.css` and `hero-hand.js`: waving-hand emoji beside Blair; click, tap, Enter or Space switches to a clapping emoji and a local confetti burst, then returns to waving. On Phone, the greeting uses a centered flex row to align the hand with the text while preserving its 44px minimum tap target. Reduced motion uses a still emoji and fading confetti.
- `vibe-tools.css` and `vibe-tools.js`: a paper-box animation inside the first Hero section, below the introduction and aligned left within the same frame. “Vibe Coding Partner” is centered below the animation and uses the Hero's Averia Serif Libre at 32px on Desktop, 28px on Tablet and 24px on Phone. Figma, GitHub, Codex and Framer pop out once when the illustration enters view; click or keyboard activation replays it. The complete logo tiles retain their proportions and use reference-inspired fixed tilts of −17°, −10°, +10° and +12°, with slightly staggered positions. All assets live in `assets/vibe-tools/`; there is no visible tool-name footer or box lettering. Reduced motion shows the completed composition, and a static box remains available if animation assets fail to load.
- Case-study articles fill the outside frame with equal left/right insets matching the related-project heading (`--cell-inset`: Desktop 24px, Tablet 18px, Phone 16px). Artwork follows the wider article; fixed-position Lighthouse and Southern Crafted diagrams scale as complete canvases to preserve their proportions. Desktop content/chapter spacing is 72px/144px. No additional inner vertical rules are drawn.
- `script.js`: phone navigation dropdown, footer email and phone copy interactions, and the orange dot cursor. Homepage HHI uses VIEW SPONSORED PROJECT, other projects use VIEW CASE STUDY, and email/phone use COPY with their respective envelope or mobile-phone icon. Custom cursor is enabled only for a mouse with hover support.
- `assets/fonts/`: locally stored fonts; no external font request is required.
- All project covers use the same 16:9 ratio (1920×1080px for replacement artwork). Desktop and Tablet use aligned two-column rows; Phone uses a single column.
- HHI uses the user's supplied `HHI.png` unchanged as `assets/selected-projects/hhi-project-cover.png`. Its complete 16:9 composition scales to every breakpoint and retains the homepage's VIEW SPONSORED PROJECT cursor.
- Southern Crafted uses its original green (#2b422d) background and a centered laptop with a muted, looping, inline autoplay video. A black backing extends beneath the screen bezel to prevent green seams between the video and the transparent mockup at different sizes.
- Nalu uses the supplied `Nalu_Project Image 2.png` composition, exported at 960/1920/3840px as WebP for both Home and the case-study hero. The homepage's twelve-second loop fades from the logo into the complete photograph; the overlay logo fades out to avoid duplicating the artwork's own logo. Reduced motion shows the complete scene without animation.
- Lighthouse preserves the original Selected Projects default composition: white background, yellow droplet, two phones and two station models. Its phones retain their automatic six-second movement and switch between the four original screen images, without requiring hover. Reduced motion keeps the default screens static. Additional source artwork is stored in `assets/selected-projects/`.

All four homepage project cards and the related-project cards link to local case studies. About links to the local `/about.html` page; Resume links to the existing Google document.

## About

Hovering over the three intro photos shows the existing orange cursor pill with a text-only label: “that's me!” on the portrait, “with the team :)” on the team photo, and “weekend mode ✨” on the mountain photo. Labels preserve their lowercase wording and use the shared cursor sizing and viewport-edge handling; touch input keeps the normal photo behavior.

The intro keeps the heading and three-photo composition without the former typing illustration.

`/about.html` preserves the original About introduction, all five work experiences, both education entries, and the fourteen-photo “What I’ve been diving into” gallery after Education. The intro pairs left-hand text with three photos: the supplied selfie above an original SCAD SERVE team photograph and a mountain photograph. The page shares the home navigation, footer, fonts and continuous ruled frame; phone layouts stack the intro and resume columns.

`about-page.css` styles the page, and `about-page.js` runs a seamless horizontal photo strip at 28px per second, with Pause/Resume control and manual horizontal scrolling. All fourteen photographs keep their proportions at 320px high on Desktop, 270px on Tablet and 230px on Phone. Reduced motion starts paused. Hover continues playback; direct scrolling, keyboard browsing and opening a photo take priority. The lightbox retains previous/next controls, arrow-key navigation and Escape dismissal. `scripts/build-about-page.py` rebuilds the page from `reference/about.html`, the local media in `assets/about/`, and the homepage shell. The builder requires Python, lxml and Pillow. No source photos are modified.

## Case studies

The editable case studies live in `hhi-preview/`, `lighthouse-preview/`, `southern-preview/` and `nalu-preview/`. Each uses the shared homepage header, footer, fonts and cursor, with a responsive Table of Contents and project-specific CSS/JavaScript. Back and Table of Contents match the navigation entries' type size. Run `npm run site:sync` or `npm run build` to copy the approved pages, styles, scripts and local HHI artwork into their canonical routes. Preview pages retain `noindex`; the published copies do not.

- `/project-3-hhi/`: Overview, The problem, Why this touchpoint, The design, Results and Reflection. Ticket-confirmation artwork opens in a scrollable, keyboard-accessible dialog.
- `/project-1-lighthouse/`: the revised diabetes-travel story, with responsive high-resolution cover and Final Solution boards.
- `/project-2-southerncrafted/`: Overview, Discovery, Home Page Redesign, Results and Reflection. The original homepage hero and original design-system composition are retained. Collections and Product In Real Life use enlarged looping GIF demonstrations with still alternatives for reduced motion. Results show 43% to 89% task completion and 32 to 85 SUS scores.
- `/project-4-nalu/`: Overview, The Gap, The Twist, Final Prototype, Recognition and Reflection. Four prototype subsections put each description between its heading and artwork. The metadata columns have equal width, the workshop photos have a bounded height, and the new 16:9 hero is shared with Home.

The historical imported HTML snapshots remain under `reference/case-studies/`. `scripts/build-case-pages.py` reconstructs that older layout for reference; it is not the publishing workflow. Do not run it over the current public pages without re-running `npm run site:sync`. The synced project `sources/` directory is not modified.

## Scroll-triggered motion

`scroll-reveal.js`, loaded by `script.js`, adds one-time fades with an 18px upward motion to content entering the viewport on Home, About and all four case studies. Items on the same row appear with a short stagger. The initial viewport stays visible immediately; navigation and sticky layout stay in place. Anchor links, keyboard focus, printing, history restoration and reduced-motion preferences keep content accessible. Unsupported observers fall back to visible content. `tests/scroll-reveal.test.js` checks these behaviors.

Local review screenshots, reports and intermediate exports stay in ignored `qa/`, `tmp/` and `output/` directories.

## Reference decisions

- Eemon Roy: fine outer rails, continuous inset card rails through images, captions and row spacing, a two-edged centre gutter, and horizontal rules with distinct full-frame and inset spans. Phone navigation has a single hamburger button; opening it shows Work / About / Resume as three ruled rows over the page, with an X to close.
- Static Hero with a translucent rounded orange highlight behind Product Designer. Users and business have distinct hand-drawn looping underlines; both inherit the Hero's black text color. The orange cursor uses `--accent-orange` (#ed612b). The highlight hue, saturation, lightness and opacity are editable via the `--hero-highlight-*` variables in `styles.css`. No large pink stroke, testimonials or sidequests section.
- Header uses a Blair Su text logo in the Hero's Averia Serif Libre font, at 20px to visually balance the uppercase 15px Work navigation label on Desktop, Tablet and Phone.
- Browser tab icons use the supplied portrait photo with rounded corners across Home, About, case studies and the responsive preview page.
- Rachel Chen: image above a left/right caption, placed in aligned rows as requested; 17px Source Serif 4 “Project name · Description” on the left in #32404f, with 15px Geist years above project types on the right. Cards up to 700px wide use two aligned rows: project name/year above description/type. On phone, types and years use 14px. Types are Figma Make Prototype (HHI), UI/UX Design (Southern Crafted), CodeX & Figma Prototype (Lighthouse), and Product Concept (Nalu).
- Footer: name and copyright align to the project images' left edge. About and Connect use plain text links with a lighter hover color; the lower copyright/back-to-top row has been removed.

Project placement: HHI Concours (2026) at top left, Lighthouse (2023) at top right, Southern Crafted (2024) below HHI Concours, and Nalu (2025) at bottom right. Short descriptions retain the existing homepage wording; years are verified against the existing public Blair Su pages.

Card project names use the muted text color. Type labels use medium weight (500) and each project's accent: HHI brown, Southern Crafted sage green, Lighthouse gold, and Nalu plum. The shared styles apply to both Home and related-project cards; names, descriptions and years retain regular weight, and years stay muted.

Source references: https://www.eemonroy.com/ · https://www.rachelchen.tech/ · https://www.blairsu.design/project-1-lighthouse/
