# Candler Foundry Flipbook

A static flipbook used in the executive dashboard and other internal contexts. The site is plain HTML/CSS/JS with a single content file (`content.js`) that drives every page, plus a browser-based editor (`admin.html`) that non-technical staff use to update copy.

- **Viewer:** `index.html`
- **Editor:** `admin.html` (also reachable at `/admin`)
- **Content:** `content.js` &mdash; a single file that exports `window.FLIPBOOK_CONTENT`
- **Assets:** `assets/` (audio, branding, graphics, headshots)

## How editing works

The editor writes drafts to the browser's `localStorage`, so typing into `admin.html` updates the live preview immediately but does not affect the public site. Publishing is explicit:

1. Staff click **Publish to live site** in `admin.html`.
2. The browser POSTs the edited content to `/.netlify/functions/save-content`.
3. The serverless function commits `content.js` to the `main` branch of this repo via the GitHub Contents API.
4. Netlify detects the push and redeploys the static site (~30&ndash;60 seconds).

A `Download content.js` button is kept as a manual fallback &mdash; useful if the Netlify function is ever misconfigured.

## Working with the repo

There are **two paths** for changes to land on the live site, and they can both update the same files. Keeping them in sync is a small discipline that saves a lot of grief.

**Path A &mdash; Web editor (for copy).** Staff open `https://<netlify-site>/admin`, edit text, click **Publish to live site**. The Netlify function commits `content.js` to `main`. No local clone needed; nothing is written to anyone's computer.

**Path B &mdash; Local clone (for code, CSS, assets).** Developers clone the repo, edit `index.html`, `admin.html`, images, etc. locally, and push.

**Path C &mdash; Claude commits via the GitHub API on Emily's behalf.** Set up to avoid running PowerShell or Git commands manually for routine code/asset changes. See **[Working with Claude](#working-with-claude)** below for full details &mdash; in short, a fine-grained PAT lives in a gitignored file at `.claude-git-token`, and Claude reads it from its sandboxed workspace mount and uses GitHub's Git Data API (`/git/blobs`, `/git/trees`, `/git/commits`, `/git/refs`) to commit and update `main` directly. No local files need to be in a clean state for Claude commits to succeed &mdash; the API path bypasses local entirely.

### Golden rules

1. **Always `git pull` before you start local work.** The web editor may have committed new copy since your last pull, and your local clone won't know. If you edit on stale files and push, you'll hit "rejected: fetch first" and need to resolve a merge.
2. **Only edit `content.js` through the web editor, not by hand.** The editor is the source of truth for copy. Hand-edits to `content.js` can collide with a concurrent Publish and get clobbered. (Structural changes to the `content.js` schema &mdash; adding or removing fields &mdash; are the exception; those need a code change anyway.)
3. **After pulling a `content.js` that was changed while you had the editor open, click "Discard saved draft".** The editor's draft lives in your browser's `localStorage` and takes precedence over the bundled file. If the two diverge (e.g. a teammate published while you were drafting), your draft will shadow the freshly deployed `content.js` until you discard it. **Hard refresh does not clear `localStorage`** &mdash; only the **Discard saved draft** button does (or an incognito window, or DevTools &rarr; Application &rarr; Storage &rarr; Clear site data).
4. **Netlify redeploys automatically** on every push to `main` &mdash; whether the push came from you or from the web editor. The live site is typically updated within 30&ndash;60 seconds of the commit landing.

### Typical developer loop

```sh
cd C:\Scripts\Flipbook
git pull origin main              # always first
# ...edit index.html, admin.html, assets, etc...
git add -A
git commit -m "Concise message describing the change"
git push origin main
```

Open the Netlify URL, hard refresh (Ctrl+Shift+R / Cmd+Shift+R) to bypass the HTTP cache and see the new version.

### If a push is rejected

Means the remote has commits you don't have &mdash; almost always a Publish from the web editor that you didn't pull. Fix:

```sh
git pull origin main --no-edit
# If a merge conflict is reported in content.js, keep your local version
# only if you know your content.js is the newer intent. Otherwise, keep
# theirs (the web editor is usually the authoritative source of copy):
git checkout --ours content.js        # keep your local version
#   — or —
git checkout --theirs content.js      # keep the web editor's version
git add content.js
git commit --no-edit
git push origin main
```

For code files (`index.html`, `admin.html`, CSS, JS, assets) conflicts are rare because only local clones touch them. If one occurs, open the file in an editor, look for the `<<<<<<<`, `=======`, `>>>>>>>` markers, decide which side to keep (or combine), save, and `git add` + `git commit --no-edit`.

### Quick sanity checks before pushing

- `git diff --cached` to see exactly what will land in the commit.
- Open `index.html` and `admin.html` locally and confirm they end with `</html>` &mdash; truncated files in the past have caused silent JavaScript failures.
- If you touched rendering code, spot-check in a browser before pushing.

## One-time setup

### 1. Connect this repo to Netlify

In Netlify: **Add new site &rarr; Import from Git &rarr; GitHub &rarr; `candlerfoundry/candler_foundry_flipbook`**. Netlify will read `netlify.toml` and pick up the static publish dir and functions dir automatically. No build command is needed.

### 2. Create a GitHub token for the editor to commit with

Use a **fine-grained personal access token** (GitHub &rarr; Settings &rarr; Developer settings &rarr; Personal access tokens &rarr; Fine-grained tokens):

- **Resource owner:** `candlerfoundry`
- **Repository access:** Only select repositories &rarr; `candler_foundry_flipbook`
- **Repository permissions:** `Contents: Read and write`
- **Expiration:** whatever rotation policy you prefer

Copy the token value &mdash; you will only see it once.

### 3. Set Netlify environment variables

In the Netlify site: **Site settings &rarr; Environment variables &rarr; Add a variable**. Add these four:

| Name            | Value                                 |
| --------------- | ------------------------------------- |
| `GITHUB_TOKEN`  | the fine-grained token from step 2    |
| `GITHUB_OWNER`  | `candlerfoundry`                      |
| `GITHUB_REPO`   | `candler_foundry_flipbook`            |
| `GITHUB_BRANCH` | `main`                                |

Mark `GITHUB_TOKEN` as secret. Trigger a redeploy so the function picks up the new env vars.

### 4. Smoke test

Open `https://<your-netlify-site>/admin`, change a small bit of copy, click **Publish to live site**. You should see:

- A confirmation banner with a short commit SHA, e.g. "Published (commit `3a7f1c2`)."
- A new commit on `main` in GitHub with the message "Update content.js via flipbook editor".
- Netlify automatically redeploys the site; reload `index.html` after a minute to see the change live.

If publish fails, the editor falls back to showing the HTTP status and the GitHub error message in the status bar, and offers the manual `Download content.js` path as a backup.

## Adding auth later

Right now anyone with the `/admin` URL can edit. When you're ready to gate it:

- **Simple shared-secret (quick):** set `EDITOR_TOKEN` in Netlify env vars, and add a prompt in `admin.html` that collects the token and sends it as an `x-editor-token` header. The function already rejects requests without a matching token when `EDITOR_TOKEN` is set.
- **Proper user login:** use **Netlify Identity** to gate `/admin.html` behind invited users. The function can inspect the Netlify Identity JWT to identify the committer and include their name/email in the commit message.

## Working with Claude

Claude (running in Cowork mode) has access to the repo via two channels: a read/write mount of `C:\Scripts\Flipbook` for direct file operations, and a sandboxed Linux shell with allowlisted outbound HTTPS for API calls. To commit on Emily's behalf without going through PowerShell, Claude reads `.claude-git-token` (a gitignored file at the repo root) and uses GitHub's Git Data API to push commits directly.

### Token file

- **Path:** `C:\Scripts\Flipbook\.claude-git-token`
- **Format:** the bare token on one line, no quotes, no `KEY=` prefix &mdash; just `github_pat_…`
- **Scope:** fine-grained PAT, **resource owner: `candlerfoundry`**, **repository access: only `candler_foundry_flipbook`**, **permissions: `Contents: Read and write`** (everything else No access)
- **Gitignored:** the rule lives in `.gitignore` (line `.claude-git-token`); never commit this file
- **Rotation:** match your normal PAT rotation policy; the same token works for both Claude commits and Netlify's `save-content` function so you only need to manage one secret

### How Claude commits

```
1. Read token from .claude-git-token
2. GET /repos/{owner}/{repo}/git/ref/heads/main         -> current commit SHA
3. GET /repos/{owner}/{repo}/git/commits/{sha}          -> tree SHA
4. POST /git/blobs (base64 content) for each changed file
5. POST /git/trees with base_tree=<parent> + new entries
6. POST /git/commits with the new tree and the parent SHA
7. PATCH /git/refs/heads/main to the new commit SHA
```

This is a **single atomic multi-file commit**, not a sequence of Contents API PUTs. Netlify auto-rebuilds when the ref updates.

### Why use the API path instead of editing local files

Local files can drift from the repo state for a few reasons specific to this machine: (a) the editor's `localStorage` draft can be ahead of `content.js` if Emily was drafting and someone else (or the API) committed; (b) Cowork's mount layer between Claude's Linux sandbox and Windows occasionally truncates files mid-write &mdash; we've seen this several times in 2026, always recoverable by re-pulling from GitHub; (c) Windows Git's `core.autocrlf=true` rewrites line endings on checkout, which can collide with Claude-written LF files. Going through the API path sidesteps all three: Claude pulls the current file from GitHub, edits in `/tmp`, and PUTs the result back. The local copy is purely a viewer.

### Workflow for Claude in a fresh session

1. **Confirm the token is readable**: Linux-side path is `/sessions/<session>/mnt/Flipbook/.claude-git-token`. Read it; never echo the value back to the user.
2. **Sanity-check the token** with a `GET /user` and `GET /repos/candlerfoundry/candler_foundry_flipbook` call. Confirm `permissions.push: true`.
3. **Pull the current state of any file you intend to edit** from `https://raw.githubusercontent.com/candlerfoundry/candler_foundry_flipbook/main/<path>` rather than reading local; locals may be stale or truncated.
4. **Edit in /tmp or in-memory**, write a Python script (or similar) that performs the edits.
5. **Commit via the Git Data API** using the seven-step pattern above.
6. **Update local mirror** by writing the same content to `C:\Scripts\Flipbook\<path>` so Emily can browse the new files locally; not required for correctness.
7. **Tell Emily the commit SHA and the GitHub URL** so she can verify in her browser and trust the change.

## Architecture notes

### Content schema (`content.js`)

`window.FLIPBOOK_CONTENT` is an array of page entries. Four entry `type` values: `cover`, `note` (Foundry intro page with themes), `spread` (a category spread &mdash; this is the bulk of the flipbook), `close` (back cover). Each spread has:

- `genre`, `intro`, `supportTitle` &mdash; right-page heading bits (`intro` is optional; `.support-intro` is rendered conditionally)
- `feature.{title, instructor, image, lede, quote, courseLabel, headshot, facultyBlurb, facultyBio}` &mdash; left-page featured course. The visible title and description on the rendered page come from `feature.title` and `feature.lede`. `feature.facultyBlurb` is no longer rendered on the front face of the faculty card under the current design (kept for back-compat).
- `supporting[]` &mdash; right-page accordion list, each with `{title, instructor, summary, headshot?, instructorUrl?}`
- `leftBlocks[]` &mdash; **internal only.** Positioned text blocks from the previous absolutely-positioned left-page design. The new flex/grid layout does not render these and the editor does not expose UI for them. The data is still maintained so master cascade can keep it consistent.
- `layout{}` &mdash; sizing/position knobs (font sizes, %/px positions, scale factors). Read [Master spread cascade](#master-spread-cascade-important--read-before-changing-layout-code) before editing this object &mdash; only the master spread's `layout` actually drives rendering.

### Faculty card flip

Each spread's left page renders a **3D flip card** for the featured instructor:
- **Front:** large circular headshot (default 130 design-px), `INSTRUCTOR` mono kicker, name, short blurb, a "Tap for bio &#8634;" hint
- **Back:** kicker `About <FirstName>`, full bio text, "Back to front &#8634;" hint
- **Interaction:** native `<button>`; click, tap, Enter, or Space toggles `.is-flipped` which applies `transform: rotateY(180deg)` to `.faculty-card-inner`. The back face only renders if `feature.facultyBio` is truthy.

### Headshot resolution

`getDefaultHeadshot(instructor)` in `index.html` walks a `HEADSHOT_TABLE` of ~35 lowercased name substrings. First match wins; fallback is the Foundry logomark in a circular disc. To add an instructor: drop their photo at `assets/headshots/<first-last>.jpg` and add a row to the table. All 30 photos in `assets/headshots/` were sourced from the sister repo `candlerfoundry/executive-bi-dashboard` under `assets/faculty-staff-headshots/`, normalized to lowercase-dashed filenames.

### Letterbox scaling (responsive layout)

The book renders at fixed **design dimensions of 1500&times;780** inside a `.book-scaler` element. JS computes `scale = min(stage.offsetWidth / 1500, stage.offsetHeight / 780)` and applies it via `--book-scale` on `.book-scaler`. **Important:** use `offsetWidth`/`offsetHeight` (layout box), not `getBoundingClientRect` (rendered box) &mdash; the editor's preview iframe applies its own ancestor `transform: scale`, and `getBoundingClientRect` would compound the two and double-shrink the book. There's no `Math.min(..., 1)` cap; the book scales up beyond 1.0 on big monitors.

### Master spread cascade (important — read before changing layout code)

The seven category spreads are designed to look identical. Spread 0 (currently **Scripture & Theology**) is the **master** and is the single source of truth for `layout`. Inside `applyMasterSpreadTemplate()` (defined identically in both `admin.html` and `index.html`), each non-master spread's `layout` is rebuilt as `{...entry.layout, ...masterLayout}` &mdash; i.e. the master's values win. This runs every time the editor calls `persistWorkingData`, and again on the iframe side when it receives a `flipbook:update` postMessage, so any per-spread layout customization is silently overwritten.

**This is intentional.** Editing a slider on the master spread propagates to all 7 spreads automatically. Editing on any other spread looks like nothing happened (because the change is reverted within milliseconds). If a future change makes you want to flip the merge order to `{...masterLayout, ...entry.layout}`, **don't** &mdash; that breaks the design intent and was already tried and reverted in late April 2026.

The same function also unifies `supportTitle` and `feature.courseLabel` across spreads, but `feature.title`, `feature.lede`, `feature.image`, etc. stay per-spread.

### Editor sliders for layout knobs

`admin.html` exposes range sliders that all write to `master.layout` and cascade to every spread. Only sliders that have a visible effect under the current Option-2 flex/grid layout are exposed. Working sliders, with the CSS class they ultimately style:

| Slider label | `layout` key | CSS target | Notes |
| --- | --- | --- | --- |
| Category size | `genreFontSize` | `.feature-genre` | left-page orange uppercase header |
| Graphic scale | `imageScalePercent` | `.featured-hero` width | hero image (3:2) |
| Graphic shadow | `imageShadow` | `.featured-hero img` filter | `none` / `soft` / `strong` |
| Label size | `courseLabelFontSize` | `.featured-eyebrow` | "★ Featured Course" pill |
| Description horizontal position | `descriptionX` | `.featured-text-block` translateX | &plusmn;20% nudge |
| Description vertical position | `descriptionY` | `.featured-text-block` translateY | &plusmn;20% nudge |
| Description height (0 = auto) | `descriptionHeight` | `.featured-text-block` height | when &gt; 0, breaks out of grid stretch |
| Instructor card horizontal position | `instructorCardX` | `.faculty-card-slot.featured-instructor-slot` translateX | &plusmn;20% |
| Instructor card vertical position | `instructorCardY` | same translateY | &plusmn;20% |
| Instructor card width | `instructorCardWidth` | `.featured-bottom` grid column 2 | 80&ndash;300px (default 200) |
| Instructor card height (0 = auto) | `instructorCardHeight` | slot height | when &gt; 0, breaks out of grid stretch |
| Instructor headshot size | `facultyAvatarSizePx` | `.featured-instructor-avatar` | |
| Instructor name size | `facultyNameSizePx` | `.featured-instructor-name` | |
| Instructor blurb size | `facultyBlurbSizePx` | `.featured-instructor-bio-link` | actually styles "Tap for Bio" link &mdash; the `feature.facultyBlurb` data field doesn't render anywhere on the front face under the current design |
| Heading size | `rightHeadingFontSize` | `.section-genre` font-size | right-page genre header |
| Heading box width | `rightHeadingWidthPercent` | `.section-genre` width | |
| Intro size | `rightIntroFontSize` | `.support-intro` | only renders if `entry.intro` is non-empty |
| Intro box width | `rightIntroWidthPercent` | `.support-intro` width | same |
| Right-page headshot size | `rightCardAvatarSizePx` | `.support-avatar` | |
| Course title size | `rightCardTitleFontSize` | `.support-text strong` | |
| Course list instructor name size | `rightCardMetaFontSize` | `.support-text span` | (label says "Instructor name size" but it's the right-page one) |
| Course summary size | `rightCardSummaryFontSize` | `.support-panel p` | only visible after expanding a supporting course |
| Course stack width | `rightListWidthPercent` | `.support-list` width | |

Plus a dedicated **Course description** textarea that writes `feature.lede` directly (the visible `<p class="featured-desc">` is rendered from this field).

Sliders that were intentionally removed because they have no clean meaning in the new flex/grid layout: `imageY`, `genreY`, `genreWidthPercent`, `courseLabelY`, `courseLabelWidthPercent`, `facultyY`, `facultyScalePercent`, `facultyWidthPercent`. The fields still exist in the schema for back-compat but no UI is exposed.

The `entry.leftBlocks` system (positioned text blocks) is fully **dead** in the new layout &mdash; the data is still maintained internally so master cascade keeps it consistent, but `renderSpread` no longer renders it and the editor no longer exposes any UI for it. Course title/description live on `feature.title` / `feature.lede` and are rendered as `<h2 class="featured-title">` / `<p class="featured-desc">` inside `.featured-text-block`.

Defaults are wired into `createDefaultSpreadLayout()`. New layout fields fall through to defaults if missing on a spread.

**Clamp pattern:** all `normalizeContent` clamps for layout fields use `Number.isFinite(v)` rather than `Number(v) || default` &mdash; this matters because `Number(0) || 10` evaluates to `10` (since `0` is falsy), which silently rewrites a legitimate 0 to the default. We hit this when `imageY: 0` got persistently rewritten to `10` during slider testing.

### Netlify Function: `save-content`

Located at `netlify/functions/save-content.js`. POSTed by the **Publish to live site** button in `admin.html` with `{content: <FLIPBOOK_CONTENT array>, message?: <commit message>}`. Reads four env vars (`GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH`), looks up the existing `content.js` SHA, and PUTs the new content via the **Contents** API (single-file commit, distinct from the Claude path which uses the lower-level **Git Data** API for multi-file commits). Optional `EDITOR_TOKEN` env var enables a shared-secret gate that requires an `x-editor-token` header.

## Known issues

### Local file truncation (Cowork mount + Windows specific)

When Claude writes a large file to the mount, the resulting file on the Windows side is occasionally truncated mid-statement, ending up the same byte size as Claude's LF-only write rather than the CRLF-converted size that Windows Git would produce. We've hit this on `index.html`, `admin.html`, `content.js`, and `README.md`. Confirmed via canary test that nothing on the Windows side is rewriting files in the background &mdash; it's a transient mount/sync interaction at the moment of write. The recovery path is always the same: pull the file fresh from GitHub, re-apply edits, push via the API. The Path C (Claude API) workflow is robust to this because it sources from GitHub, not local.

### Editor `localStorage` shadowing

`admin.html` loads `content.js` as the bundled baseline, then overlays any draft saved in `localStorage`. If the deployed `content.js` changes (e.g., schema migration, or someone else publishes), the editor will keep showing the in-browser draft until **Discard saved draft** is clicked, an incognito window is used, or DevTools clears site data. Hard refresh does **not** clear `localStorage`. Add a brief `Discard saved draft` reminder when shipping any schema change.

### Class-name drift between sliders and rendered DOM

The left page went through an "Option-2" redesign that swapped many class names: `.feature-image-card` &rarr; `.featured-hero`, `.feature-course-label` &rarr; `.featured-eyebrow`, `.faculty-avatar-large` &rarr; `.featured-instructor-avatar`, `.faculty-name` &rarr; `.featured-instructor-name`, `.faculty-blurb` &rarr; `.featured-instructor-bio-link`. Old CSS rules still exist for the legacy classes, and several of them carry CSS-variable consumers (`var(--image-y, ...)`, `var(--course-label-font-size, ...)`, etc.) but their selectors don't match anything in the rendered DOM anymore. When wiring a new editor slider, look at the **live** rendered class with DevTools, not at the CSS rules &mdash; a `var()` reference in a stylesheet doesn't mean the variable reaches the page.

Same situation on the right page: `.section-title` (legacy, `display: none`) consumed `--right-heading-size`/`--right-heading-width`, but the live `.section-genre` had hardcoded values until those vars were retargeted onto it.

### `Dr. ian McFarland` typo

`content.js` for the NT spread has `"instructor": "Dr. ian McFarland"` (lowercase `i`). Cosmetic; flagged but not auto-corrected since instructor strings are Emily's copy domain. Fix via the editor when convenient.

## Local development

The production site is pure static &mdash; open `index.html` directly, or run any static server from the repo root:

```sh
npx serve .
# or
python -m http.server
```

For full end-to-end testing (editor &rarr; function &rarr; GitHub), run Netlify's dev server so the `/.netlify/functions/*` route resolves locally:

```sh
npm install -g netlify-cli
netlify dev
```

## Repo layout

```
.
├── index.html                      # Flipbook viewer
├── admin.html                      # Browser-based editor
├── content.js                      # The content payload (committed by the editor)
├── assets/                         # Images, audio, branding, headshots
├── netlify.toml                    # Netlify build + redirect config
├── netlify/
│   └── functions/
│       └── save-content.js         # Commits content.js back to this repo
├── .gitignore
└── README.md
```

Files intentionally excluded from Git (see `.gitignore`): `node_modules/`, the `playwright-*.png` debug screenshots from local development, the unused root-level `Friendly Students 2.png` duplicate, `pauls-vision-carousel-mockup.html`, and `assets/Instructors Linking Preview.xlsx` (a planning spreadsheet, not a runtime asset).
