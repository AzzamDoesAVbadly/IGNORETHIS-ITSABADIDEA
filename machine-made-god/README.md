# MACHINE MADE GOD

A satirical viral-media site (BuzzFeed formats × Newgrounds arcade × Adult Swim bumps, in a "defaced megacorp" look) that **writes and publishes itself**. Twice a day, a scheduled job asks a randomly chosen free AI provider for new articles, a quiz every few days, ticker headlines, late-night bumps and parody ads. It checks them for quality and repeats, builds the site, and publishes. Netlify deploys every push.

Live: https://machinemadegod.netlify.app

---

## One-time setup (≈20 minutes, then hands-off)

You only have to do these once. After that, nothing on this list needs you.

### 1. Get at least one free AI key (two or three is better)

The roulette rotates between whichever providers have keys. More keys mean fewer days where every provider is rate-limited at once.

| Provider | Where | GitHub secret name |
|---|---|---|
| Google Gemini | https://aistudio.google.com/apikey | `GEMINI_API_KEY` |
| Groq | https://console.groq.com/keys | `GROQ_API_KEY` |
| OpenRouter (free models only) | https://openrouter.ai/keys | `OPENROUTER_API_KEY` |
| Mistral | https://console.mistral.ai/api-keys | `MISTRAL_API_KEY` |
| Cerebras | https://cloud.cerebras.ai | `CEREBRAS_API_KEY` |
| Alibaba Cloud Model Studio (Qwen) | https://modelstudio.console.alibabacloud.com (international region) | `DASHSCOPE_API_KEY` |
| *Optional paid fallback:* Claude | https://console.anthropic.com | `ANTHROPIC_API_KEY` |
| *Optional paid fallback:* OpenAI | https://platform.openai.com/api-keys (needs prepaid credits) | `OPENAI_API_KEY` |

Free tiers have usage limits that change over time, and some free tiers (for example Gemini's) may use your prompts to improve their models. That's fine for public satire, but don't put anything private in the prompts. Claude is only used if every free provider fails on a given piece, and only if you add its key. Leave it out to stay at $0.

### 2. Add the keys to GitHub

GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**. Add each key using the names above.

### 3. Make sure Netlify builds this folder

The repo-root `netlify.toml` already points at `machine-made-god/`. In Netlify → Site configuration → Build & deploy, the **Base directory** should be empty or `machine-made-god`.

### 4. Turn it on

GitHub → **Actions** tab → enable workflows if asked → **The Machine** → **Run workflow**. Watch the log; you should see something like:

```text
The machine wakes. Providers in the chamber: gemini, groq
→ Article 1: Music & Subcultures / news
  ✓ "Emo Band Reunites Solely to Settle Dispute Over Van Ownership" via groq (llama-3.3-70b-versatile)
```

From then on it runs at about 9am and 9pm US Eastern every day.

---

## Making money

| Stream | Status | What you do (once) |
|---|---|---|
| **AdSense** | Ad slots built in. Parody ads show until it's configured. | Apply at https://adsense.google.com with the site URL. When approved, add `PUBLIC_ADSENSE_CLIENT=ca-pub-…` in Netlify → Environment variables (or set `adsenseClient` in `src/data/site.json`) and redeploy. Auto ads start immediately. For fixed placements, create ad units and set `PUBLIC_ADSENSE_SLOT_HOME`, `_LIST`, `_ARTICLE`, `_SIDE`. `ads.txt` and the privacy policy are generated for you. |
| **Merch** | Designs shown at `/shop/`, marked "coming soon". | Open a print-on-demand store (Printful + Shopify, Redbubble, Teespring, etc.), upload the slogans from `src/data/merch.json`, then set `PUBLIC_MERCH_STORE_URL`. Buy buttons appear automatically. |
| **Video** | `/tv/` plays the bumps as an on-site broadcast. | Not automated yet; see "Known limitations." |

Google reviews AdSense sites before approving them and has a spam policy against mass-produced low-value content. The quality and duplicate checks exist to keep the site on the right side of that. If AdSense rejects the site, lower `articlesPerRun` and give it a few weeks of content.

---

## Mission Control (`/control/`)

A private, password-protected panel at **https://machinemadegod.netlify.app/control/** (works on your phone):

- **Overview:** machine on/off, Run now, recent GitHub runs, what each run published (and which AI wrote and edited it), provider health (cooldowns, out-of-credit, last errors), content counts per section.
- **Posts:** every published post with Hide / Delete; hidden posts with Show.
- **Write:** order a piece from your own idea (pick a section/format or let the machine choose). It runs the full pipeline and publishes in about 3–5 minutes.
- **Playground:** ask any or all AI providers the same thing side by side, or spin the roulette. Optionally use the site's editorial voice as the system prompt.
- **Promotion:** promote any post on demand, plus the promotion log.

### Set it up (once, about 10 minutes)

1. **Make a GitHub token** so the panel can run, pause, hide and delete: GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token.
   - Repository access: **Only select repositories** → this repo.
   - Permissions → Repository: **Actions** Read and write, **Contents** Read and write, **Variables** Read and write (Metadata read is automatic).
   - Expiration: pick the longest you're comfortable with, and set a calendar reminder to renew it.
2. **Add Netlify environment variables:** Netlify → Site configuration → Environment variables → Add a variable → **Import from a .env file**, and paste:
   ```text
   CONTROL_PASSWORD=pick-a-long-password-12-plus-characters
   GITHUB_TOKEN=github_pat_...
   GEMINI_API_KEY=...
   GROQ_API_KEY=...
   OPENROUTER_API_KEY=...
   CEREBRAS_API_KEY=...
   DASHSCOPE_API_KEY=...
   ```
   (The AI keys are only needed for the Playground. Add `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` too if you want those there.)
3. **Redeploy:** Deploys → Trigger deploy → Deploy site. Then open `/control/` and log in.

Without `GITHUB_TOKEN` the panel still works read-only (status, reports, playground). Sessions last 14 days; changing `CONTROL_PASSWORD` logs everyone out.

Locally you can run the same panel against your `.env` with `npm run control` → http://localhost:8787/control/.

---

## Auto-promotion

After every run, new posts are promoted automatically once the deploy is live:

- **Bluesky:** posts an AI-written caption with a link card. Make a Bluesky account for the site, then bsky.app → Settings → Privacy and security → **App passwords** → create one. Add GitHub secrets `BLUESKY_HANDLE` (e.g. `machinemadegod.bsky.social`) and `BLUESKY_APP_PASSWORD`.
- **Mastodon:** make an account on an instance whose rules allow automated accounts (check the instance's About page), tick "This is an automated account" in profile settings, then Preferences → Development → New application with the `write:statuses` scope. Add GitHub secrets `MASTODON_INSTANCE` (e.g. `https://mastodon.social`) and `MASTODON_TOKEN`.
- **IndexNow:** on by default. Every new URL is pinged to Bing, Yandex and other IndexNow search engines. The key file is in `public/`.
- **Google:** not automatable for free. Add the site to Google Search Console once and submit `/sitemap-index.xml`.

Channels without credentials are skipped. Turn promotion off with the GitHub variable `PROMOTION_ENABLED=false`, or `"promotion": { "enabled": false }` in `machine.config.json`. Every post is recorded in `src/data/promo-log.json` (visible in Mission Control). Promotion commits are tagged `[skip netlify]` so they don't use Netlify build minutes.

---

## Day-to-day (optional; the machine doesn't need you)

- **Everything below can also be done from Mission Control (`/control/`).**
- **Pause the machine:** GitHub → Settings → Secrets and variables → Actions → **Variables** → add `MACHINE_ENABLED` = `false`. Delete it to resume. (Or set `"enabled": false` in `machine.config.json`.)
- **Pull a bad post:** open the file in GitHub (`machine-made-god/src/content/articles/…`), click edit, add `draft: true` to the front matter (or delete the file), commit. The site redeploys in about a minute.
- **Run it now:** Actions → The Machine → Run workflow.
- **Check which providers work:** locally, `npm run machine:check` (needs keys in `.env`).
- **See what happened:** each run's log is in the Actions tab; the last 30 runs and per-provider stats are in `src/data/machine-state.json`.

### The editor (/admin)

`/admin/` is a browser editor (Decap CMS) for articles and site/money settings. Every save is a commit that redeploys the site. To enable login once:

1. GitHub → Settings → Developer settings → OAuth Apps → New. Homepage `https://machinemadegod.netlify.app`, callback `https://api.netlify.com/auth/done`.
2. Netlify → Site configuration → Access & security → OAuth → Install provider → GitHub, paste the client ID and secret.
3. Visit `/admin/` and log in with GitHub. Only people with write access to the repo can edit.

Quizzes and generator settings aren't in the editor (it would drop fields it doesn't know about). Edit those in GitHub directly.

---

## Configuration

`machine.config.json`:

| Setting | Default | Meaning |
|---|---|---|
| `enabled` | `true` | Master switch |
| `articlesPerRun` | `2` | Articles per run (2 runs/day → 4/day) |
| `quizEveryDays` | `3` | New quiz at most every N days |
| `tickerPerRun` / `bumpsPerRun` / `adsPerRun` | `4` / `2` / `1` | Filler content per run |
| `maxAttemptsPerPiece` | `6` | Providers tried before giving up on a piece |
| `cooldownMinutes` | `360` | How long a rate-limited provider sits out |
| `duplicateThreshold` | `0.45` | Headline similarity (0–1) above which a piece is rejected as a repeat |
| `providers[]` | 5 free + Ollama + Claude | Base URL, key name, starting model, model preferences, weight |

The schedule lives in `/.github/workflows/machine.yml` (`cron` lines, in UTC).

The AI's instructions live in `prompts/`: `voice.md` (editorial bible and hard rules), `formats.json` (per-format instructions), `sparks.json` (random topic seeds that keep it from repeating itself). Edit these to change the voice.

---

## How it works

```text
GitHub Actions (cron, 2×/day)
  └─ npm run generate
       ├─ pick section + format (favoring under-filled sections)
       ├─ roulette: weighted-shuffle providers that have keys and aren't cooling down
       │    try one → parse JSON → normalize → validate → duplicate check
       │    any failure → next provider (rate limits get a cooldown;
       │    retired models are replaced automatically from the provider's /models list)
       ├─ write Markdown/JSON into src/content and src/data
  └─ npm run build   (re-validates every file + checks every internal link; fails = nothing published)
  └─ git commit + push → Netlify deploys
```

- **Stack:** Astro 7 (static site), plain CSS, a few small scripts, no database. Content is files in git, so every change is versioned and reversible, hosting is free, and there's no server to keep alive.
- **Images:** every illustration is generated in code (`src/components/Art.astro`) from the article's slug, motif, palette and label: defaced logos, memos, billboards, badges, CRTs, stickers, charts, phones. Free, tiny, and always on-brand.
- **Safety rails:** hard rules in `prompts/voice.md` (no real people, no real companies as targets, no real tragedies or politicians, punch up), plus the model's own `uses_real_people` flag, banned-phrase filters, link/handle filters, length and structure checks, and duplicate detection. Every page carries satire labels.

### Project layout

```text
machine-made-god/
├── machine.config.json      generator settings + provider list
├── prompts/                 the AI's editorial instructions
├── scripts/
│   ├── generate.mjs         the machine
│   ├── lib/roulette.mjs     provider roulette, cooldowns, model discovery
│   ├── lib/schemas.mjs      JSON schemas for AI output
│   ├── lib/mock.mjs         offline fake provider (tests)
│   └── check-links.mjs      post-build broken link check
├── src/
│   ├── content/articles/    one Markdown file per article
│   ├── content/quizzes/     one JSON file per quiz
│   ├── data/                sections, authors, ticker, bumps, ads, polls, merch, site, machine-state
│   ├── components/          Art, Card, FakeAd, AdSlot, Poll, Ticker, …
│   ├── pages/               routes (home, /c/, /a/, /quiz/, /arcade/, /tv/, /search/, …)
│   └── lib/                 content loading + validation shared with the generator
├── public/admin/            Decap CMS editor
└── tests/                   node:test unit tests
```

---

## Running locally

Requires Node.js 22.22 or newer.

```bash
cd machine-made-god
npm install
npm run dev                      # http://localhost:4321
npm test                         # unit tests
npm run build                    # production build + link check → dist/
MACHINE_MOCK=1 npm run generate  # test the machine offline with fake content
cp .env.example .env             # add keys, then:
npm run machine:check            # which providers answer?
npm run generate -- --dry-run    # generate for real, print instead of saving
npm run generate                 # generate and save (then commit + push yourself)
```

To run on your own computer with a local model instead of the cloud: install Ollama, `ollama pull llama3.1`, set `OLLAMA_ENABLED=1` in `.env`, and run `npm run generate`. Your computer has to be on, and older machines will be slow.

## Backups

All content and settings are files in this git repo, so GitHub is the backup. To restore anything, revert the commit. For an offline copy: `git clone` the repo, or download a ZIP from GitHub.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Action fails with "No AI providers are available" | No keys are set, or every provider is cooling down. Add secrets, or wait out the cooldown (listed in the log). |
| Action fails at "Build and validate" | A generated file broke a rule the generator missed. The log names the file and rule; nothing was published. Next run tries again. |
| A provider always fails with "model unavailable" | The machine tries to switch models automatically. If that fails, update that provider's `model` in `machine.config.json`. |
| Site didn't update after a run | Check that Netlify auto-deploys from `main` and the base directory is right. |
| GitHub stopped running the schedule | GitHub pauses schedules on repos with no activity for 60 days. The machine's own commits count as activity, but if every run fails for 60 days the schedule pauses. Re-enable it in the Actions tab. |

## Verification checklist

- [ ] `npm test` passes
- [ ] `npm run build` ends with "no broken internal links"
- [ ] Home shows a featured story, trending list, latest grid, quizzes, arcade, picks, poll, merch
- [ ] Every section page loads; empty sections show the "Nothing here yet" state
- [ ] An article shows byline, art, pull quote, mid-article ad, satire note, tags, share buttons, related
- [ ] All 3 quizzes complete with keyboard only (Tab, arrows, Enter) and show a result and share link
- [ ] Search finds "band", filters by section, sorts, shows an empty state for "zzzz"
- [ ] All 3 arcade games start and end; MMG TV changes with ← →
- [ ] `MACHINE_MOCK=1 npm run generate` then `npm run build` succeeds
- [ ] Layout works at phone width (about 400px)

## Known limitations

- **Free AI quality varies.** Free models are weaker comedians than paid ones. The voice guide, sparks and duplicate checks help, but some posts will be mediocre. Adding the optional Claude key as a fallback, or switching its `tier` to free so it's in the normal rotation, raises quality at a cost.
- **No human review by design (full autopilot).** Filters catch broken output, links, banned phrases, self-reported real people and repeats. They can't catch every bad joke. Use the kill switch and `draft: true` if something slips through.
- **Video isn't automated.** Bumps play on `/tv/`, but nothing renders or uploads videos to YouTube yet. That would need a YouTube channel and API credentials.
- **Merch isn't automated.** Designs exist, but creating products in a print-on-demand store needs your store account.
- **Trending is editorial, not analytics.** "Trending" means "the machine flagged it", with no view counts behind it. Fake poll numbers are labeled as invented.
- **No comments.** Left out on purpose: they'd need moderation, which contradicts "never do another thing."
- **Social share images** use the site's default card (no per-article images yet).
- **New games aren't generated.** The arcade has three hand-built games; the machine writes articles, not code.
