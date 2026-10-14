# Topis website

`index.html` is the site: a single page modelled on the structure of nexomaya.com
(header → hero → who we are → our way → what we do → how we work → contact → footer).

- `styles.css`: colour tokens, base styles, layout and every page section.
- `script.js`: mobile menu, Fujisawa local time, and `?review` mode.
- Modules in use: `css/utilities.css`, `css/hero.css` (washi texture, headline wipe, hanko),
  `css/reveal.css` + `js/reveal.js` (section headings and principles), `css/kanji.css`
  (brush labels), `js/core.js`.

Placeholder copy is marked with class `ph`. Open the page with `?review` (for example
`index.html?review`) to outline every placeholder that still needs real content.

Contact: "Email us" goes to hello@topismos.com and "Book a call" opens
https://calendly.com/topismos-info/30min in a new tab. Both also appear as plain
links in the Contact details and the footer.

## Modules not used by index.html

These were built earlier and are kept for reference; `demo.html` still wires them together.
They are no longer linked from the site: the pinned story (`story.*`), the animated process
line (`process.*`), case studies (`projects.js`, `case-study.*`, `count-up.js`), the time-zone
timeline (`timeline.*`) and the AI demo (`ai-demo.*`, `api/demo.js`).

## Module reference

| Feature | CSS | JS | Hooks in the HTML |
|---|---|---|---|
| Shared helpers | `utilities.css` | `core.js` (load first) | `<script>document.documentElement.classList.add('js')</script>` in `<head>` |
| Scroll reveal | `reveal.css` | `reveal.js` | `data-reveal`, `data-reveal-delay="1-3"` |
| Kanji brush labels | `kanji.css` | via `reveal.js` | `<span class="kanji" data-reveal="brush">` |
| Hero texture, seal, headline | `hero.css` | none | `.hero-line` spans, `.hanko`, the `#hanko-rough` SVG filter |
| Pinned principles story | `story.css` | `story.js` | `[data-story]`, `.story__pin`, `.story__step` |
| Process line | `process.css` | `process.js` (fallback only) | `[data-process]`, `.process__step`, `.process__num` |
| Case studies | `case-study.css` | `projects.js`, `count-up.js`, `case-study.js` | `[data-work-list]`, `<dialog data-case>` |
| Time-zone timeline | `timeline.css` | `timeline.js` | `<div class="tz" data-timeline>` |
| Try our AI | `ai-demo.css` | `ai-demo.js` + `api/demo.js` | `[data-ai-demo]` section |

Script order matters: `core` → `projects` → `count-up` → `case-study` → `reveal`, then the rest.
`case-study.js` must run before `reveal.js` so the generated rows get revealed.

## Merging into the site

1. Check the palette names. The modules use `--washi`, `--sumi`, `--nezumi`, `--ai`, `--shu`.
   If `styles.css` names them differently, find and replace those names.
2. Add the classes and data attributes from `demo.html` to the existing markup. The
   `demo.html` `<style>` block is a stand-in; do not copy it.
3. Remove anything these modules replace: the three static clocks and their script, any
   existing hero or seal animation, and any existing project-row click handling.
4. The section with `id="work"` is where closing a shared case-study link lands (`#work`).

## Try our AI: setup

`api/demo.js` uses `claude-opus-5-5` at low effort, capped at 2,000 output tokens, with input
capped at 500 characters and 5 requests per IP per 10 minutes. Server-side refusal fallback
(an Anthropic beta) is on; remove `betas` and `fallbacks` from the request to turn it off.

1. **Pin the SDK.** `package.json` says `"latest"`. In the site folder, run
   `npm install @anthropic-ai/sdk`. This writes the exact current version and a
   `package-lock.json`. Commit both. `node_modules/` is git-ignored.
2. **Create an API key.** Go to console.anthropic.com → API Keys → Create Key. Copy it now;
   it is shown only once. Set a monthly spend limit under Billing → Limits: it is the real
   cost cap, since the in-memory rate limit is per function instance.
3. **Add it to Vercel.**
   1. Open vercel.com → your project → **Settings** → **Environment Variables**.
   2. Key: `ANTHROPIC_API_KEY`. Value: paste the key.
   3. Environments: tick **Production** and **Preview** (Development only if you use `vercel dev`).
   4. Click **Save**. Mark it **Sensitive** if offered, so it can't be read back in the dashboard.
   5. Optional: add `ALLOWED_ORIGIN` = `https://your-domain.com` (exact scheme and host, no
      trailing slash) to reject requests from other sites.
4. **Redeploy.** Environment variables only apply to new deployments: Deployments → ⋯ on
   the latest one → **Redeploy**, or push a commit.
5. **Test.** Submit an idea on the live site. If you get the "something went wrong"
   message, open the project's **Logs** in Vercel; `ANTHROPIC_API_KEY is not set` means
   step 3 or step 4 didn't take.

Local testing: install the Vercel CLI (`npm i -g vercel`), run `vercel link`, then
`vercel env pull .env.local`, then `vercel dev`. `.env.local` is git-ignored.

## Known limits

- Rate limiting is in memory, so each warm function instance counts separately. For a strict
  limit, use a shared store such as Upstash Redis from the Vercel Marketplace.
- Live call window: with strict 9:00–18:00 hours on both sides, Tokyo overlaps San Francisco
  for about 1 hour (US summer) or 2 hours (US winter), and never overlaps New York. To show
  the hours the team actually takes calls, change `WORK_HOURS` / `TEAM_ZONE` in `timeline.js`.
  Weekends aren't excluded.
- The process line's desktop layout assumes 4 equal columns with the numbers at the start
  of each column.
- None of this has been run in a browser or against the API yet. Node isn't installed on the
  machine the modules were written on.
