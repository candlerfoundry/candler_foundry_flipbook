// netlify/functions/save-content.js
//
// Receives edited flipbook content from admin.html and commits it back to
// content.js in the GitHub repo on the configured branch. Netlify watches
// that branch and redeploys automatically, so a successful POST here results
// in the live flipbook updating within ~30-60 seconds.
//
// Required Netlify environment variables (set in the Netlify UI under
// Site settings -> Environment variables):
//
//   GITHUB_TOKEN   Fine-grained personal access token with
//                  "Contents: Read and write" permission on the flipbook repo.
//   GITHUB_OWNER   GitHub org/user that owns the repo, e.g. "candlerfoundry".
//   GITHUB_REPO    Repo name, e.g. "candler_foundry_flipbook".
//   GITHUB_BRANCH  Branch to commit to. Defaults to "main" if unset.
//
// Optional:
//
//   EDITOR_TOKEN   If set, callers must pass the same value in the
//                  "x-editor-token" header or the POST is rejected. Leave
//                  unset during the "anyone with the link can edit" phase;
//                  set it (and have admin.html prompt for it) once you want
//                  a simple shared-secret gate in front of the editor.

const GITHUB_API = "https://api.github.com";
const CONTENT_PATH = "content.js";

exports.handler = async function handler(event) {
  // --- Method check --------------------------------------------------------
  if (event.httpMethod === "OPTIONS") {
    return cors(204, "");
  }
  if (event.httpMethod !== "POST") {
    return cors(405, { error: "Method not allowed. Use POST." });
  }

  // --- Optional shared-secret auth ----------------------------------------
  const requiredToken = process.env.EDITOR_TOKEN;
  if (requiredToken) {
    const provided = event.headers["x-editor-token"] || event.headers["X-Editor-Token"];
    if (provided !== requiredToken) {
      return cors(401, { error: "Unauthorized: bad or missing x-editor-token." });
    }
  }

  // --- Env-var sanity check ------------------------------------------------
  const {
    GITHUB_TOKEN,
    GITHUB_OWNER,
    GITHUB_REPO,
    GITHUB_BRANCH = "main",
  } = process.env;

  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    return cors(500, {
      error:
        "Server not fully configured. GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO must be set in Netlify environment variables.",
    });
  }

  // --- Parse payload -------------------------------------------------------
  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (err) {
    return cors(400, { error: "Request body is not valid JSON." });
  }

  const content = payload.content;
  const commitMessage =
    (payload.message && String(payload.message).slice(0, 200)) ||
    "Update content.js via flipbook editor";

  if (!Array.isArray(content)) {
    return cors(400, {
      error: "Request body must include a 'content' array (the FLIPBOOK_CONTENT value).",
    });
  }

  // Re-serialize to exactly the format content.js currently uses.
  const fileText =
    "window.FLIPBOOK_CONTENT = " + JSON.stringify(content, null, 2) + ";\n";
  const newBase64 = Buffer.from(fileText, "utf8").toString("base64");

  const apiBase = `${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${CONTENT_PATH}`;
  const authHeaders = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    "User-Agent": "candler-foundry-flipbook-editor",
    Accept: "application/vnd.github+json",
  };

  try {
    // 1. Look up the current SHA of content.js so the commit is a proper update.
    const getRes = await fetch(
      `${apiBase}?ref=${encodeURIComponent(GITHUB_BRANCH)}`,
      { headers: authHeaders }
    );

    let existingSha;
    if (getRes.status === 200) {
      const existing = await getRes.json();
      existingSha = existing.sha;

      // Short-circuit if nothing actually changed.
      const existingBase64 = (existing.content || "").replace(/\s+/g, "");
      if (existingBase64 === newBase64.replace(/\s+/g, "")) {
        return cors(200, {
          ok: true,
          unchanged: true,
          message: "No changes — content.js on GitHub already matches.",
        });
      }
    } else if (getRes.status !== 404) {
      const errBody = await getRes.text();
      return cors(getRes.status, {
        error: `GitHub GET failed (${getRes.status}): ${errBody}`,
      });
    }
    // 404 is fine — file doesn't exist yet, we'll create it.

    // 2. PUT the new content (create or update).
    const putBody = {
      message: commitMessage,
      content: newBase64,
      branch: GITHUB_BRANCH,
      ...(existingSha ? { sha: existingSha } : {}),
    };

    const putRes = await fetch(apiBase, {
      method: "PUT",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(putBody),
    });

    if (!putRes.ok) {
      const errBody = await putRes.text();
      return cors(putRes.status, {
        error: `GitHub PUT failed (${putRes.status}): ${errBody}`,
      });
    }

    const result = await putRes.json();
    return cors(200, {
      ok: true,
      unchanged: false,
      commit: {
        sha: result.commit && result.commit.sha,
        url: result.commit && result.commit.html_url,
      },
      message: "content.js committed. Netlify will redeploy shortly.",
    });
  } catch (err) {
    return cors(500, { error: `Unexpected error: ${err.message}` });
  }
};

// Small helper so every response has consistent CORS + JSON headers.
function cors(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-editor-token",
      "Cache-Control": "no-store",
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  };
}
