/**
 * content/auto.js — auto-trigger companion for reframe.js.
 *
 * Registered by background.js (id "reframer-auto") as the second file after
 * reframe.js, scoped to granted origins, at document_start. Its sole job is to invoke
 * `window.__reframerAuto()` — which reframe.js defines but deliberately never calls
 * itself. This split is what prevents a race: the popup's manual path injects only
 * reframe.js (never auto.js), so it can never auto-build while build() also runs.
 *
 * `__reframerAuto()` is a no-op unless a one-shot signal is present (a same-tab
 * prev/next sessionStorage flag, or this page's URL queued for slideshow-breakout),
 * so this runs harmlessly on every load of a registered origin.
 */
(() => {
  try {
    if (!window.__reframerAuto) {
      // reframe.js must run first in the same registration — if it didn't, the
      // build/auto functions simply don't exist on this page.
      console.warn("[img-src-reframer] auto.js ran but __reframerAuto is missing");
      return;
    }
    console.info(`[img-src-reframer] auto.js on ${location.href}`);
    window.__reframerAuto();
  } catch (e) { console.warn("[img-src-reframer] auto-reframe skipped:", e); }
})();
