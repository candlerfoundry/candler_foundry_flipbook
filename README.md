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
