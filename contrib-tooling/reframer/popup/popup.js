/**
 * popup/popup.js — toolbar popup controller.
 *
 * Flow on "Reframe" (onReframe):
 *  1. Read inputs: class (custom field wins over preset), columns, breakout checkbox.
 *  2. enableAutoReframe(activeTab) — request a per-origin host permission. This MUST be
 *     the handler's FIRST await: Firefox invalidates the click gesture after any prior
 *     await, so the active tab is fetched once at popup open (init) and cached. The
 *     background script registers the scoped content script off permissions.onAdded.
 *  3. Persist config to storage.local (loadCfg/saveCfg; class history deduped/capped).
 *  4. inject(): executeScript the content file, then call window.__reframerBuild(cfg)
 *     directly via an executeScript func — no messaging, no insertCSS. Each boundary is
 *     wrapped by step() so a failure reports which call broke.
 *
 * The Reframe button mirrors overlay state (probeShown on open, and the build result):
 * blue "Reframe: OFF" (click shows) / red "Reframe: ON" (click hides). Constants
 * STORAGE_KEY/DEFAULT_COLS are mirrored in content/reframe.js (no bundler).
 */

// ---- config ----------------------------------------------------------------
const STORAGE_KEY = "reframerCfg";
const DEFAULT_COLS = 6,
  MAX_HISTORY = 12;
const PRESET_CLASSES = ["", "expp", "thumb", "thumbnail", "preview", "photo"];
// Leading slash = resolve from extension root. Firefox resolves a bare path
// relative to the calling popup document (popup/...), which 404s the injection.
const CONTENT_JS = "/content/reframe.js";
const OVERLAY_ID = "reframer-overlay"; // mirrors content/reframe.js OVERLAY_ID

const $ = (id) => document.getElementById(id);

// Cached at popup open so onReframe can call permissions.request as its FIRST await
// (Firefox requires the user gesture to be intact — any prior await invalidates it).
let activeTab = null;

/**
 * Read persisted config, falling back to defaults.
 * @returns {Promise<{cls:string,cols:number,breakout:boolean,history:string[]}>}
 */
async function loadCfg() {
  const { [STORAGE_KEY]: cfg } = await browser.storage.local.get(STORAGE_KEY);
  return {
    cls: cfg?.cls ?? "",
    cols: cfg?.cols ?? DEFAULT_COLS,
    breakout: cfg?.breakout ?? true, // opt-out: on by default
    history: cfg?.history ?? [],
  };
}

/**
 * Persist config, prepending the chosen class to the dedup'd history.
 * @param {{cls:string,cols:number,breakout:boolean,history:string[]}} cfg
 */
async function saveCfg(cfg) {
  const history = [cfg.cls, ...cfg.history.filter((c) => c && c !== cfg.cls)]
    .filter(Boolean)
    .slice(0, MAX_HISTORY);
  await browser.storage.local.set({ [STORAGE_KEY]: { ...cfg, history } });
}

/** Populate preset <select> and history <datalist>. */
function fillLists(history) {
  $("preset").replaceChildren(
    ...PRESET_CLASSES.map((c) => {
      const o = document.createElement("option");
      o.value = c;
      o.textContent = c || "— custom —";
      return o;
    }),
  );
  $("cls-history").replaceChildren(
    ...history.map((c) => {
      const o = document.createElement("option");
      o.value = c;
      return o;
    }),
  );
}

/** Show a status line; `err` toggles error styling. */
function setStatus(msg, err = false) {
  const el = $("status");
  el.textContent = msg;
  el.classList.toggle("err", err);
}

/** Reflect overlay state on the Reframe button: red ON (click hides) / blue OFF (click shows). */
function setToggle(on) {
  const b = $("reframe");
  b.textContent = on ? "Reframe: ON" : "Reframe: OFF";
  b.classList.toggle("on", on);
  b.classList.toggle("off", !on);
}

/**
 * Probe whether the reframe overlay is currently mounted on the tab. Standalone
 * func injection (no content script needed); returns false on restricted pages.
 * @param {number} tabId
 * @returns {Promise<boolean>}
 */
async function probeShown(tabId) {
  try {
    const [frame] = await browser.scripting.executeScript({
      target: { tabId },
      func: () => !!document.getElementById("reframer-overlay"),
    });
    return !!frame?.result;
  } catch {
    return false;
  }
}

/**
 * Request a scoped host permission for the tab's origin. The background script's
 * permissions.onAdded listener does the actual content-script registration, so it
 * still completes even if this popup closes when the permission doorhanger appears.
 * permissions.request MUST be this handler's first await (Firefox needs the gesture).
 * @param {{url?:string}} tab
 * @returns {Promise<string>} short status: enabled | denied | unsupported
 */
async function enableAutoReframe(tab) {
  if (!tab.url || !/^https?:/.test(tab.url)) return "unsupported-origin";
  let origin;
  try {
    origin = new URL(tab.url).origin + "/*";
  } catch {
    return "unsupported-origin";
  }
  const granted = await browser.permissions.request({ origins: [origin] });
  return granted ? "enabled" : "denied";
}

/** Run an async step, re-throwing with a boundary label so failures are locatable. */
async function step(label, fn) {
  try {
    return await fn();
  } catch (e) {
    throw new Error(`${label}: ${e?.message ?? e}`);
  }
}

/**
 * Inject the content script into a tab, then call its build() directly via
 * executeScript (no messaging, no insertCSS — the script injects its own styles).
 * @param {number} tabId
 * @param {{cls:string,cols:number}} cfg
 * @returns {Promise<{count:number,toggledOff:boolean}|undefined>}
 */
async function inject(tabId, cfg) {
  const target = { tabId };
  await step("executeScript", () =>
    browser.scripting.executeScript({ target, files: [CONTENT_JS] }),
  );
  // breakout is passed so cells built this run carry the intent themselves (the
  // hash signal self-authorizes; see reframe.js), not just the cached global toggle.
  const arg = { cls: cfg.cls, cols: cfg.cols, breakout: cfg.breakout };
  const frames = await step("run", () =>
    browser.scripting.executeScript({
      target,
      func: (a) => window.__reframerBuild(a),
      args: [arg],
    }),
  );
  const frame = frames?.[0];
  if (frame?.error)
    throw new Error(`run: ${frame.error.message ?? frame.error}`);
  return frame?.result;
}

async function onReframe() {
  const cls = $("cls").value.trim() || $("preset").value.trim();
  const cols = Math.max(1, parseInt($("cols").value, 10) || DEFAULT_COLS);
  const breakout = $("breakout").checked;

  if (!cls) return setStatus("Pick or type a class first.", true);

  const tab = activeTab;
  if (!tab?.id) return setStatus("No active tab.", true);

  // FIRST await MUST be the permission request so the click gesture stays valid
  // (Firefox rejects permissions.request after any intervening await). Non-fatal.
  let auto = "skipped";
  try {
    auto = await enableAutoReframe(tab);
  } catch (e) {
    console.warn("[img-src-reframer] auto-reframe setup failed:", e);
    auto = `err:${e.message}`;
  }

  const cfg = { cls, cols, breakout, history: (await loadCfg()).history };
  await saveCfg(cfg);
  console.info(`[img-src-reframer] config saved — breakout:${breakout} cls:"${cls}" cols:${cols}`);

  try {
    const res = await inject(tab.id, cfg);
    if (res) setToggle(!res.toggledOff); // overlay built => ON; toggled off => OFF
    setStatus(
      res?.toggledOff
        ? "Overlay closed."
        : `Reframed ${res?.count ?? 0} · auto:${auto}`,
      res && res.count === 0 && !res.toggledOff,
    );
  } catch (e) {
    console.error("[img-src-reframer]", e);
    setStatus(`Failed: ${e.message}`, true);
  }
}

async function init() {
  [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
    const cfg = await loadCfg();
    console.info(`[img-src-reframer] popup opened — persisted breakout:${cfg.breakout}`);
  fillLists(cfg.history);
  $("preset").value = PRESET_CLASSES.includes(cfg.cls) ? cfg.cls : "";
  $("cls").value = cfg.cls;
  $("cols").value = cfg.cols;
  $("breakout").checked = cfg.breakout;
  $("preset").addEventListener("change", () => {
    $("cls").value = $("preset").value;
  });
  $("reframe").addEventListener("click", onReframe);
  $("cls").addEventListener("keydown", (e) => {
    if (e.key === "Enter") onReframe();
  });
  setToggle(activeTab?.id ? await probeShown(activeTab.id) : false);
}

init();
