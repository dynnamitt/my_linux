/**
 * background.js — non-persistent event page that owns the scoped auto-reframe
 * content-script registration (id "reframer-auto": reframe.js + auto.js, at
 * document_start, persistAcrossSessions).
 *
 * Why the background does it (not the popup): the popup only calls
 * permissions.request(); the resulting doorhanger can close the popup before it could
 * register anything. So registration is event-driven here instead:
 *  - permissions.onAdded  → syncAuto(new origins): add them and (re)register.
 *  - permissions.onRemoved → syncAuto(): prune revoked origins (else update rejects).
 *  - on worker startup     → syncAuto(getAll origins): reconcile registration with the
 *                            permissions actually held (e.g. after an update/reload).
 *
 * syncAuto() always rebuilds `matches` as exactly the granted-and-still-permitted set
 * (verified per-origin via permissions.contains), and register/update with a fallback
 * so a persisted id from a prior session doesn't throw a duplicate-id error.
 */

// ---- config ----------------------------------------------------------------
const AUTO_SCRIPT_ID = "reframer-auto";
// reframe.js defines window.__reframerBuild; auto.js calls it when the one-shot
// nav flag is set. Both run, in order, on registered origins. Leading slash =
// extension-root resolution.
const AUTO_JS = ["/content/reframe.js", "/content/auto.js"];

/**
 * Register (or update) the auto-reframe content script so its `matches` is exactly
 * the set of origins we still hold host permission for, unioned with `add`.
 * @param {string[]} add origin match patterns to include (e.g. "https://x/*")
 */
async function syncAuto(add = []) {
  const [existing] = await browser.scripting
    .getRegisteredContentScripts({ ids: [AUTO_SCRIPT_ID] })
    .catch(() => []);

  const wanted = new Set([...(existing?.matches ?? []), ...add]);

  // Drop any origin whose permission was revoked — else update/register rejects.
  const matches = [];
  for (const m of wanted) {
    if (await browser.permissions.contains({ origins: [m] }).catch(() => false)) matches.push(m);
  }

  if (!matches.length) {
    if (existing) await browser.scripting.unregisterContentScripts({ ids: [AUTO_SCRIPT_ID] }).catch(() => {});
    return;
  }

  const spec = {
    id: AUTO_SCRIPT_ID,
    js: AUTO_JS,
    matches,
    // document_start so the "pending reframe" banner appears ASAP after a slow
    // navigation; the actual build waits for DOMContentLoaded (see __reframerAuto).
    runAt: "document_start",
    persistAcrossSessions: true,
  };
  try {
    await (existing
      ? browser.scripting.updateContentScripts([spec])
      : browser.scripting.registerContentScripts([spec]));
  } catch (e) {
    // register can race a persisted id ("already registered"); fall back to update.
    await browser.scripting.updateContentScripts([spec]).catch((err) =>
      console.warn("[img-src-reframer] content-script sync failed:", err)
    );
  }
}

// New grant from the popup's permissions.request → register for those origins.
browser.permissions.onAdded.addListener((p) => {
  if (p.origins?.length) syncAuto(p.origins);
});
// Revocation (about:addons) → prune so future updates don't reject.
browser.permissions.onRemoved.addListener(() => syncAuto());
// Reconcile registration with granted permissions whenever the worker starts.
browser.permissions.getAll().then((p) => syncAuto(p.origins ?? [])).catch(() => {});
