# Topis website

Company website for Topis. Audience: US startups and agencies looking for a development partner. Copy is in American English; Japanese appears as accents (kanji labels, principle names).

## About the team (source of truth for copy)

- Team name: Topis Mos. Japanese engineers based in Fujisawa, Japan; friends and colleagues.
- Education: Shonan Institute of Technology, bachelor's and master's degrees in computer science.
- Senior software engineers, 7+ years of experience.
- Skills: frontend, backend, full stack, AI, blockchain. Main focus: backend and AI.
- Also do AI training work (creating, reviewing and evaluating LLM training and eval data).
- Tone: modelled loosely on nexomaya.com. Short, warm, values-led, people before technology.

## Content rules

- Client work is under NDA. Never name clients, show their code, or invent metrics.
  Case studies describe the kind of system built, in NDA-safe terms.
- Never present third-party products or open-source projects (e.g. Next.js, Cal.com,
  LangChain, Ollama, go-ethereum) as our work or imply we built them.
- Only state facts the owner has provided. Anything unconfirmed stays marked `ph`.

## Stack

- Plain HTML, CSS and vanilla JavaScript. No frameworks, no build step, no bundler, no TypeScript.
- Deployed on Vercel as a static site. The only server code is Vercel functions in `/api` (Node.js).
- Core files: `index.html`, `styles.css`, `script.js`. Feature modules live in `css/` and `js/`, loaded with plain `<link>` and `<script defer>` tags.
- Secrets live only in Vercel environment variables. Never put keys in frontend code, `.env` files in the repo, or commits. `.env.example` lists the variable names.

## Design direction

- Japanese restraint: ma (negative space) over decoration. When in doubt, remove rather than add.
- Colours come only from the `:root` tokens in `styles.css`. Never hardcode new colours.
  - `--washi`: paper background
  - `--sumi`: ink text
  - `--nezumi`: secondary text, rules, quiet UI
  - `--ai`: indigo accent (links, focus, progress, active states)
  - `--shu`: vermilion, **used only for the hanko seal**
  - `--sakura`: pale cherry blossom pink, **used only for the hanaikada petals**
- Type: Shippori Mincho for headings, Zen Kaku Gothic New for body text.

## Motion rules

- Few, purposeful animations. Don't animate every element; reveals are limited to section headings, project rows and principle blocks.
- Every animation respects `prefers-reduced-motion`: put the hidden or start state inside `@media (prefers-reduced-motion: no-preference)` so reduced motion shows the finished state with no transition.
- Animate only `transform` and `opacity` where possible (masks are used for the brush and wipe effects).
- Never block reading. Content is visible without JavaScript: hidden states are scoped to `html.js`, which is set by an inline script in `<head>`.
- Scroll-triggered effects use the shared helpers in `js/core.js` (`Topis.observeOnce`, `Topis.reducedMotion`) rather than new observers.
- Toggle state with classes and data attributes, not inline styles. Inline CSS custom properties are fine only for data-driven geometry, such as the timeline.
- The hero load sequence stays under 1.5 s in total.
- Exception (owner's decision, 2026-10-12): the 花筏 (hanaikada) background in
  `js/hanaikada.js` runs behind the whole page, all year: petals drifting on a stream
  that runs the length of the page and scrolls with it (at 85% speed, for depth),
  shown through one fixed canvas. Keep it faint enough that all text stays WCAG AA
  over a petal (canvas at 50% opacity), still (but scrolling) with reduced motion,
  and paused while the tab is hidden.

## Accessibility

- Semantic HTML: landmarks, one `h1`, headings in order, lists for lists, buttons for actions, links for navigation.
- Keyboard focus is always visible (`:focus-visible` in `--ai`). Never remove outlines without a replacement.
- Every meaningful image has alt text; decorative images use `alt=""` or `aria-hidden="true"`.
- Text meets WCAG AA contrast (4.5:1 body, 3:1 large text). This includes dimmed or inactive states.
- Custom widgets follow ARIA patterns. For example, the timeline is `role="slider"` with `aria-valuetext`, and the case study is a modal `<dialog>` that traps focus, closes on Escape and returns focus.

## Do not touch unless asked

- Team photos.
- LinkedIn links.
- Placeholder content marked with class `ph`. Keep the class on new placeholder content too.
