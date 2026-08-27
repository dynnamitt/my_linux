/**
 * content/reframe.js — core content script (injected by the popup on demand, and
 * registered by background.js on granted origins alongside auto.js).
 *
 * Responsibilities:
 *  - harvest(): cascade scan for gallery images — Pass A `td/li a.CLS` (class on the
 *    anchor), else Pass B `td/li a img.CLS` (class on the image); deduped by src.
 *  - harvestNav(): meta scan for prev/next pagination links — anchors whose href is
 *    paginated (?page=/&page=) AND whose text matches next/prev(ious).
 *  - build(): render a toggleable, full-viewport overlay holding a responsive square
 *    grid (cells are `target=_blank` links to the full image) and a fixed top toolbar
 *    (nav chips + Close). Calling build() again tears the overlay down (toggle off).
 *    Styles are injected once as a <style> tag (no scripting.insertCSS dependency).
 *  - Auto-trigger (one-shot, consumed signals, run only via auto.js so the
 *    popup-injected path never double-builds): `window.__reframerAuto()` reframes on
 *    a same-tab prev/next nav (sessionStorage AUTO_KEY), or slideshow-breakouts a
 *    cell-opened page marked by a #hash (BREAKOUT_HASH, primary) or queued in
 *    storage.local (BREAKOUT_KEY, fallback).
 *  - slideshowBreakout(): strip a markup page down to its bottom-most `.slideshow img`,
 *    wrap it in an <a href> to the original page (nav → back → re-breakout), overlay
 *    one floating ‹ › button that opens prev/next in a new tab (each new tab carries
 *    the set in its own fragment → re-breakout), and emit the grid's url set as
 *    <link rel=grid-page-N-img-M href=…> into <head>. The set survives page→page via
 *    sessionStorage (per-tab), seeded by the grid fragment on first breakout.
 *
 * Exposes `window.__reframerBuild` (called by the popup via executeScript func) and
 * `window.__reframerAuto`. The IIFE guard makes re-injection idempotent: if the build
 * fn is already defined the script returns immediately without re-defining anything.
 *
 * No bundler: constants shared with popup.js (STORAGE_KEY, DEFAULT_COLS) are mirrored,
 * not imported.
 */
(() => {
  if (window.__reframerBuild) return; // already injected in this tab

  // ---- config --------------------------------------------------------------
  const OVERLAY_ID = "reframer-overlay";
  const PENDING_ID = "reframer-pending";
  const STYLE_ID = "reframer-style";
  const Z_BASE = 2147483000;         // sit above virtually any page chrome
  const CONTAINERS = ["td", "li"];   // table cells and list items

  // Auto-reframe across prev/next navigation (no bundler -> values mirror popup.js).
  const STORAGE_KEY = "reframerCfg"; // cached {cls, cols, history} in storage.local
  const DEFAULT_COLS = 6;            // fallback when cached cfg lacks cols
  const AUTO_KEY = "reframerAuto";   // sessionStorage flag: paginate-and-reframe mode

  // Slideshow-breakout: a cell link opening a markup page can be stripped down to its
  // slideshow image — but only if breakout was enabled for the build that created the
  // cell. The opener signals the new tab two ways:
  //   • BREAKOUT_HASH (primary): the click handler rewrites cell.href's fragment
  //     BEFORE navigation — synchronous, so it cannot lose the cross-tab race that a
  //     storage write → document_start read hits (the new tab routinely reads before
  //     the opener's write lands, esp. Firefox). Fragments survive HTTP redirects.
  //     The hash itself carries the intent, so the new tab needs no storage round-trip
  //     to decide: a cell only bears the hash when its build had breakout on.
  //   • BREAKOUT_KEY (fallback): storage.local queue, for redirects that drop the hash;
  //     gated consumer-side on the persisted cfg.breakout toggle.
  const BREAKOUT_HASH = "reframer-breakout"; // #fragment marker set on cell hrefs at click
  const HASH_SEP = "|"; // fragment: #reframer-breakout|img-1|…|img-n carries the full set
  const SET_KEY = "reframerSet"; // sessionStorage: JSON url set, survives same-tab nav
  const BREAKOUT_KEY = "reframerBreakout"; // storage.local: URLs opened from reframe cells
  const BREAKOUT_MAX = 30;                 // cap the queue
  const SLIDESHOW_SEL = '[class~="slideshow" i] img'; // .slideshow img (descendant), case-insensitive

  // Meta nav scan: anchors whose href is paginated AND whose text reads next/prev.
  const NAV_PAGE_RE = /[?&]page=/i;     // ?page= or &page= in the URL
  const NAV_REL_RE = /\b(?:next|prev(?:ious)?)\b/i;  // whole word next / prev / previous
  const NAV_LABEL_MAX = 28;          // truncate long nav labels

  // Inline SVG glyph (stroke = currentColor), sized via the wrapping button.
  const ICON_CLOSE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>`;

  // Styles injected via a <style> tag from the content script itself — avoids
  // scripting.insertCSS (which proved unreliable) and any web-accessible-resource setup.
  const CSS_TEXT = `
/* No backdrop-filter here: filter/backdrop-filter would make the overlay a
   containing block for position:fixed children, so the flowing toolbar would
   scroll with the grid instead of staying pinned to the viewport. */
#${OVERLAY_ID} {
  position: fixed; inset: 0; margin: 0; padding: 64px 24px 24px; overflow: auto;
  background: rgba(12,13,16,.94);
  font: 13px/1.4 system-ui, sans-serif;
}
#${OVERLAY_ID} .reframe-grid { display: grid; gap: 10px; width: 100%; }
/* Flowing toolbar: fixed to the viewport (stays put while the grid scrolls),
   holds the navigation links and the close button. */
#${OVERLAY_ID} .reframe-toolbar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 6;
  display: flex; align-items: center; gap: 10px; padding: 8px 14px;
  background: rgba(20,22,28,.96); border-bottom: 1px solid rgba(255,255,255,.12);
  box-shadow: 0 2px 12px rgba(0,0,0,.5);
}
#${OVERLAY_ID} .reframe-nav {
  display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;
  overflow-x: auto; white-space: nowrap;
}
#${OVERLAY_ID} .reframe-nav-label { flex: none; color: #9aa0a6; font: 600 11px/1 system-ui, sans-serif; }
#${OVERLAY_ID} .reframe-nav a {
  flex: none; display: inline-block; max-width: 200px; overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap; vertical-align: middle;
  padding: 6px 10px; font: 600 12px/1 system-ui, sans-serif; color: #cfe0ff;
  text-decoration: none; background: rgba(79,140,255,.18);
  border: 1px solid rgba(79,140,255,.5); border-radius: 6px;
}
#${OVERLAY_ID} .reframe-nav a:hover { background: rgba(79,140,255,.45); color: #fff; }
#${OVERLAY_ID} .reframe-overlay-close {
  flex: none; margin-left: auto; display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px; font: 600 13px/1 system-ui, sans-serif; color: #fff;
  background: rgba(0,0,0,.4); border: 1px solid rgba(255,255,255,.3);
  border-radius: 8px; cursor: pointer;
}
#${OVERLAY_ID} .reframe-overlay-close:hover { background: rgba(255,80,80,.92); }
#${OVERLAY_ID} .reframe-overlay-close svg { width: 16px; height: 16px; }
#${OVERLAY_ID} .reframe-cell {
  display: block; aspect-ratio: 1 / 1; background-color: #0d0e11;
  background-size: contain; background-position: center; background-repeat: no-repeat;
  border: 1px solid rgba(255,255,255,.08); border-radius: 8px; cursor: pointer;
  transition: transform .12s ease, box-shadow .12s ease, border-color .12s ease;
}
#${OVERLAY_ID} .reframe-cell:hover {
  transform: scale(1.03); border-color: rgba(79,140,255,.8); box-shadow: 0 6px 22px rgba(0,0,0,.5);
}
#${OVERLAY_ID} .reframe-notice {
  position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%);
  padding: 16px 22px; color: #e8e8ea; background: #2a2d34; border: 1px solid #3a3e47;
  border-radius: 10px; cursor: pointer;
}`;

  /**
   * Ordered harvest cascade. The user's class may live on the anchor (Pass A)
   * or on the image (Pass B); B runs only when A finds nothing.
   * `sel(c)` -> array of container-scoped selectors; `pick(node)` -> {src,href}.
   */
  const PASSES = [
    {
      on: "anchor",
      sel: (c) => CONTAINERS.map((k) => `${k} a.${c}`),
      pick: (a) => {
        const img = a.querySelector("img");
        return { src: img && (img.currentSrc || img.src), href: a.href };
      },
    },
    {
      on: "img",
      sel: (c) => CONTAINERS.map((k) => `${k} a img.${c}`),
      pick: (img) => ({ src: img.currentSrc || img.src, href: img.closest("a")?.href }),
    },
  ];

  // ---- harvest -------------------------------------------------------------
  /**
   * Find {src, href} pairs for a class, trying the anchor-class pass first and
   * falling back to the image-class pass. Dedupes by src; returns the first
   * non-empty pass.
   * @param {string} cls raw class name from the popup
   * @returns {{src:string,href:string}[]}
   */
  function harvest(cls) {
    const c = CSS.escape(cls);
    for (const pass of PASSES) {
      const seen = new Set();
      const items = pass
        .sel(c)
        .flatMap((s) => [...document.querySelectorAll(s)])
        .map(pass.pick)
        .filter((it) => it.src && it.href)
        .filter((it) => (seen.has(it.src) ? false : seen.add(it.src)));
      if (items.length) return items;
    }
    return [];
  }

  // ---- meta nav scan -------------------------------------------------------
  /**
   * Scan every anchor for navigation links — only those whose href is paginated
   * (?page=/&page=) AND whose text reads "next" or "prev". Dedupes hrefs into a
   * Set; preserves document order.
   * @returns {{href:string,text:string}[]}
   */
  function harvestNav() {
    const seen = new Set();
    return [...document.querySelectorAll("a[href]")]
      .map((a) => ({ href: a.href, text: (a.textContent || "").trim() }))
      .filter(({ href, text }) => href && NAV_PAGE_RE.test(href) && NAV_REL_RE.test(text))
      .filter(({ href }) => (seen.has(href) ? false : seen.add(href)));
  }

  /**
   * Short display label for a nav link: the link text, else the page number from
   * the URL, else the trailing path segment.
   * @param {string} href
   * @param {string} text
   * @returns {string}
   */
  function navLabel(href, text) {
    if (text) return text.length > NAV_LABEL_MAX ? `${text.slice(0, NAV_LABEL_MAX - 1)}…` : text;
    const m = href.match(/[?&]page=([^&#]+)/i);
    if (m) return `page ${decodeURIComponent(m[1])}`;
    try { return new URL(href).pathname.split("/").filter(Boolean).pop() || href; }
    catch { return href; }
  }

  /** Escape a URL for safe use inside a CSS url("...") token. */
  const cssUrl = (u) => `url("${String(u).replace(/[\\"]/g, "\\$&")}")`;

  /**
   * Show a lightweight "pending" banner immediately (works at document_start,
   * before <head>/<body> exist) so a slow auto-action doesn't look like nothing
   * happened. Inline-styled to avoid depending on the injected stylesheet.
   * @param {string} [label] banner text
   */
  function showPending(label = "Reframing… (waiting for page)") {
    const existing = document.getElementById(PENDING_ID);
    if (existing) { existing.textContent = label; return; } // relabel in place
    const el = document.createElement("div");
    el.id = PENDING_ID;
    el.textContent = label;
    el.setAttribute("style", [
      "position:fixed", "top:12px", "left:50%", "transform:translateX(-50%)",
      "z-index:2147483647", "padding:8px 16px", "border-radius:8px",
      "background:rgba(20,22,28,.95)", "color:#cfe0ff",
      "font:600 13px/1 system-ui,sans-serif", "border:1px solid rgba(79,140,255,.6)",
      "box-shadow:0 4px 16px rgba(0,0,0,.5)", "pointer-events:none",
    ].join(";"));
    (document.body || document.documentElement).append(el);
  }

  /** Remove the pending banner if present. */
  function removePending() {
    document.getElementById(PENDING_ID)?.remove();
  }

  /** Run `fn` once the DOM is parsed (now if already past loading). */
  function whenReady(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, { once: true });
    else fn();
  }

  /** Run `fn` once the page is fully loaded — its last load event (now if already complete). */
  function whenLoaded(fn) {
    if (document.readyState === "complete") fn();
    else window.addEventListener("load", fn, { once: true });
  }

  /**
   * Queue a cell's target URL so the tab it opens can slideshow-breakout. Uses shared
   * storage.local (survives target=_blank/noopener, unlike sessionStorage); the companion
   * on that page matches location.href. Capped, fire-and-forget.
   * @param {string} url
   */
  function queueBreakout(url) {
    if (!browser?.storage?.local) return;
    browser.storage.local.get(BREAKOUT_KEY).then((res) => {
      const q = (res?.[BREAKOUT_KEY] || []).filter((u) => u !== url);
      q.push(url);
      browser.storage.local.set({ [BREAKOUT_KEY]: q.slice(-BREAKOUT_MAX) });
    }).catch(() => {});
  }

  /**
   * Parse the slideshow-breakout fragment `#reframer-breakout|img-1|…|img-n` — the
   * marker + the url set the grid carried (already absolute, piped in by the cell
   * click handler). Returns null when the marker is absent.
   * @param {string} hash full location.hash ("#…")
   * @returns {{urls:string[]}|null}
   */
  function parseBreakoutHash(hash) {
    if (!hash?.startsWith(`#${BREAKOUT_HASH}`)) return null;
    const urls = hash
      .slice(BREAKOUT_HASH.length + 1) // drop "#reframer-breakout"
      .split(HASH_SEP)
      .map((part) => { try { return decodeURIComponent(part); } catch { return ""; } })
      .filter(Boolean);
    return { urls };
  }

  /** Persist the set for this tab (survives same-tab nav; per-tab, dies with it). */
  function stashSet(urls) {
    if (!urls?.length) return;
    try { sessionStorage.setItem(SET_KEY, JSON.stringify(urls)); } catch {}
  }

  /** The set stashed by a prior breakout on this tab, else null. */
  function readSet() {
    try { return JSON.parse(sessionStorage.getItem(SET_KEY) || "null"); } catch { return null; }
  }

  /** Emit one <link rel=grid-page-N-img-M href=…> per url (n = page of 26). */
  function emitGridLinks(doc, urls) {
    const head = doc.querySelector("head") || doc.documentElement;
    urls.forEach((u, i) => {
      const link = doc.createElement("link");
      link.rel = `grid-page-${Math.floor(i / 26) + 1}-img-${(i % 26) + 1}`;
      link.href = u;
      head.append(link);
    });
  }

  /**
   * Strip the page down to its bottom-most `.slideshow img` (case-insensitive class):
   * keep only that image — as a fresh <img src> — centered on black, scaled to fit
   * the viewport; drop everything else. Halts (no DOM change) if no usable image is
   * found. If the re-requested image fails to load, reloads back to the full page.
   * When `urls` is provided (the grid's href set), the image is wrapped in an
   * <a href> back to the original page (that url stays queued → re-breakout), one
   * floating ‹ › button opens prev/next in a new tab (the new tab gets the set via
   * its fragment and breaks out on its own), and the set is emitted as
   * <link rel=grid-page-N-img-M href=…> in <head>.
   * @param {string[]} [urls]
   * @returns {boolean} whether an image was found and broken out
   */
  function slideshowBreakout(urls = []) {
    const imgs = document.querySelectorAll(SLIDESHOW_SEL);
    const found = imgs[imgs.length - 1]; // bottom-most
    const src = found && (found.currentSrc || found.src);
    if (!src) return false; // no .slideshow img (or no usable src) → halt, leave page intact

    // Halt in-flight loads before the destructive strip. (Timers/listeners of page
    // scripts survive — an auto-advancing slideshow can still navigate away; there
    // is no way to cancel those from a content script.)
    window.stop();

    // Non-destructive loop: ‹ › must navigate, return to the original page, and
    // re-breakout — so always restore our url to the queue (get→set is racy;
    // "set if missing" loses nothing).
    if (browser?.storage?.local) {
      browser.storage.local.get(BREAKOUT_KEY).then((res) => {
        const q = res?.[BREAKOUT_KEY] || [];
        if (!q.includes(location.href)) {
          q.push(location.href);
          browser.storage.local.set({ [BREAKOUT_KEY]: q.slice(-BREAKOUT_MAX) });
        }
      }).catch(() => {});
    }
    stashSet(urls); // keep the set for this tab's next page

    // Current position in the carried href set; the page url is the closest match
    // (fragments don't change gallery identity). -1 = unlisted → start at 0.
    let idx = Math.max(0, urls.findIndex((u) => u === location.href));

    // Insert a BRAND-NEW img (don't move the page's live node): gallery/lazyload
    // scripts and MutationObservers often track the original and would remove it once
    // we restructure the DOM — leaving a black page with no image. A fresh node, with
    // only `src`, is invisible to the page's scripts.
    const img = document.createElement("img");
    // Constrain to the viewport: natural-size images would otherwise overflow.
    img.style.cssText = "max-width:100vw;max-height:100vh;object-fit:contain";
    // Dead-end guard: hotlink protection or an expired signed URL would otherwise
    // leave the user on a black page with a broken image and no way back.
    img.onerror = () => location.reload();
    img.src = src; // resolved absolute URL
    // Wrap the img in a same-tab link back to the original page: requeue above makes
    // this navigation re-breakout (the non-destructive loop).
    const back = document.createElement("a");
    back.href = location.href;
    back.title = "Back to page (re-breakouts)";
    back.append(img);

    const body = document.createElement("body");
    // overflow:hidden: nothing may scroll or spill, whatever the img does.
    body.style.cssText =
      "margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#000;overflow:hidden";
    body.append(back);

    if (urls.length) {
      // Two floating buttons: ‹ prev (left) / › next (right), each opening in a NEW
      // TAB (target=_blank semantics) with the set re-tagged in the fragment → the
      // new tab breaks out on its own. Same-tab nav would race this page's
      // window.stop(); a new tab side-steps it.
      const BTN_CSS =
        "position:fixed;top:50%;transform:translateY(-50%);" +
        "width:52px;height:52px;display:flex;align-items:center;justify-content:center;" +
        "border:1px solid rgba(255,255,255,.35);border-radius:50%;text-decoration:none;" +
        "background:rgba(20,22,28,.55);color:#fff;font:600 24px/1 system-ui,sans-serif;" +
        "cursor:pointer;user-select:none;";
      /** The set member at idx + delta (wraps), fragment-tagged with the whole set. */
      const tagged = (delta) => {
        const target = urls[(idx + delta + urls.length) % urls.length];
        try {
          const u = new URL(target);
          u.hash = [BREAKOUT_HASH, ...urls.map((x) => encodeURIComponent(x))].join(HASH_SEP);
          return u.href;
        } catch { return target; }
      };
      const mkBtn = (glyph, side, delta) => {
        const b = document.createElement("a");
        b.target = "_blank";
        b.rel = "noopener";
        b.textContent = glyph;
        b.href = tagged(delta);
        b.title = `${delta < 0 ? "Previous" : "Next"} (new tab): ${urls[(idx + delta + urls.length) % urls.length]}`;
        b.style.cssText = BTN_CSS + (side === "left" ? "left:18px" : "right:18px");
        return b;
      };
      body.append(mkBtn("‹", "left", -1), mkBtn("›", "right", 1));

      // Keyboard: ← prev / → next, same new-tab semantics.
      document.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        window.open(tagged(e.key === "ArrowLeft" ? -1 : 1), "_blank", "noopener");
      });
    }

    // <html> itself survives replaceChildren — strip any page class/style it carries
    // so the original stylesheet-less attributes can't impose layout on the new body.
    document.documentElement.removeAttribute("class");
    document.documentElement.removeAttribute("style");
    document.documentElement.replaceChildren(body); // drop <head> + old <body>

    // Fresh head: pass on the whole set as <link rel=grid-page-N-img-M href=…> so the
    // page itself advertises the grid it came from; link#reframer-grid-current tracks
    // the slideshow position.
    const head = document.createElement("head");
    if (urls.length) {
      emitGridLinks(document, urls);
      const cur = document.createElement("link");
      cur.id = "reframer-grid-current";
      cur.rel = "grid-current";
      cur.href = urls[idx];
      head.append(cur);
    }
    const title = document.createElement("title");
    title.textContent = urls.length ? `${idx + 1} / ${urls.length}` : "slideshow-breakout";
    head.append(title);
    document.documentElement.prepend(head);
    document.title = title.textContent; // some UIs need the property, not the element
    return true;
  }

  /** Inject the overlay stylesheet once (idempotent by id). */
  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS_TEXT;
    (document.head || document.documentElement).append(style);
  }

  // ---- toolbar -------------------------------------------------------------
  /**
   * Build the flowing toolbar: navigation chips (from harvestNav) on the left and
   * the overlay close button on the right.
   * @param {{href:string,text:string}[]} navItems
   * @param {() => void} onClose
   * @returns {HTMLElement}
   */
  function mkToolbar(navItems, onClose) {
    const bar = document.createElement("div");
    bar.className = "reframe-toolbar";

    const nav = document.createElement("div");
    nav.className = "reframe-nav";
    const label = document.createElement("span");
    label.className = "reframe-nav-label";
    label.textContent = navItems.length ? `Navigation (${navItems.length}):` : "No navigation links";
    nav.append(label);
    navItems.forEach(({ href, text }) => {
      const a = document.createElement("a");
      a.href = href;            // real navigation — loads the linked page
      a.title = href;
      a.textContent = navLabel(href, text);
      // Flag paginate-and-reframe mode so the next page auto-rebuilds (if the site
      // is scoped/registered). Navigation proceeds normally (no preventDefault).
      a.addEventListener("click", () => { try { sessionStorage.setItem(AUTO_KEY, "1"); } catch {} });
      nav.append(a);
    });

    const close = document.createElement("button");
    close.className = "reframe-overlay-close";
    close.type = "button";
    close.title = "Close and return to the page";
    close.innerHTML = `${ICON_CLOSE}<span>Close</span>`;
    close.addEventListener("click", onClose);

    bar.append(nav, close);
    return bar;
  }

  // ---- build / teardown ----------------------------------------------------
  let activeTeardown = null; // teardown of the currently-shown overlay, if any

  /**
   * Render the overlay grid for the given config. If an overlay already exists,
   * tears it down (toggle off).
   * @param {{cls:string,cols:number,breakout?:boolean}} cfg
   * @returns {{count:number,toggledOff:boolean}}
   */
  function build({ cls, cols, breakout }) {
    injectStyles();
    removePending(); // the grid/notice replaces any pending banner

    // Toggle off: tear the live overlay down via its own teardown so the keydown
    // listener is removed and auto mode is exited (a bare element.remove() would
    // leak the previous invocation's listener and leave AUTO_KEY set).
    if (document.getElementById(OVERLAY_ID)) {
      if (activeTeardown) activeTeardown(); else document.getElementById(OVERLAY_ID).remove();
      return { count: 0, toggledOff: true };
    }

    const items = harvest(cls);
    const navItems = harvestNav();

    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.style.zIndex = String(Z_BASE);

    let onKey; // assigned per-branch below; referenced by teardown
    const teardown = () => {
      try { sessionStorage.removeItem(AUTO_KEY); } catch {} // exit paginate-and-reframe mode
      overlay.remove();
      document.removeEventListener("keydown", onKey);
      activeTeardown = null;
    };
    activeTeardown = teardown;
    const toolbar = mkToolbar(navItems, teardown);

    if (!items.length) {
      onKey = (e) => { if (e.key === "Escape") teardown(); };
      document.addEventListener("keydown", onKey);
      const notice = document.createElement("div");
      notice.className = "reframe-notice";
      notice.textContent = `No matches for .${cls}`;
      overlay.append(toolbar, notice);
      document.body.append(overlay);
      return { count: 0, toggledOff: false };
    }

    // Full-width grid: each column gets an equal 1fr share of the viewport;
    // cells stay square (aspect-ratio: 1) so height follows the computed width.
    const grid = document.createElement("div");
    grid.className = "reframe-grid";
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    onKey = (e) => { if (e.key === "Escape") teardown(); };
    document.addEventListener("keydown", onKey);

    items.forEach((it) => {
      const cell = document.createElement("a");
      cell.className = "reframe-cell";
      cell.href = it.href;          // click opens the linked page/image in a new tab
      cell.target = "_blank";
      cell.rel = "noopener";
      cell.style.backgroundImage = cssUrl(it.src);
      // Signal the target page. The hash carries the breakout intent decided at
      // build time — and, separator-joined, the full anchor-href set of this grid
      // (not the thumbnail img.src), so the survival set flows page → page through
      // the non-destructive loop: ‹ › same-tab navigation, back to the original,
      // breakout re-runs. The storage queue stays as a cfg-gated fallback for
      // fragment-stripping redirects.
      cell.addEventListener("click", () => {
        queueBreakout(it.href); // fallback signal (survives a hash-dropping redirect)
        if (!breakout) return; // no intent → leave the URL untouched
        try {
          const u = new URL(cell.href);
          const parts = [BREAKOUT_HASH, ...items.map((x) => encodeURIComponent(x.href))];
          u.hash = parts.join(HASH_SEP); // primary signal: set before navigation, no race
          cell.href = u.href;
        } catch {}
      });
      grid.append(cell);
    });

    // Toolbar (nav + close) flows at the top; explicit close only — clicking the
    // backdrop must NOT dismiss.
    overlay.append(toolbar, grid);
    document.body.append(overlay);
    return { count: items.length, toggledOff: false };
  }

  // ---- export --------------------------------------------------------------
  // Exposed on window so the popup can invoke it via scripting.executeScript
  // ({func, args}) in the same content sandbox — no message round-trip (which
  // would mask content-script exceptions as a generic error).
  window.__reframerBuild = build;

  /** Reframe from cached config once the DOM is parsed (earlier than document_idle). */
  function autoReframe() {
    showPending(); // instant feedback, even at document_start on a slow page
    whenReady(() => {
      if (document.getElementById(OVERLAY_ID)) return removePending();
      browser.storage.local.get(STORAGE_KEY).then((res) => {
        const cfg = res?.[STORAGE_KEY];
        if (cfg?.cls && !document.getElementById(OVERLAY_ID)) {
          // pass breakout through so auto-reframed cells signal like manual ones
          build({ cls: cfg.cls, cols: cfg.cols ?? DEFAULT_COLS, breakout: cfg.breakout });
        } else {
          removePending();
        }
      }).catch(() => removePending());
    });
  }

  /**
   * One-shot trigger run by the registered companion (auto.js) — never by the
   * popup-injected path, so there is no race with build(). Three independent signals,
   * each consumed once:
   *   1. same-tab prev/next reframe — sessionStorage flag set by a nav chip.
   *   2. slideshow-breakout via hash — the cell was built with breakout on, so the
   *      #hash (marker + the grid's url set) self-authorizes the strip; the set
   *      becomes ‹ › slideshow buttons and <head> link tags (no storage round-trip).
   *   3. slideshow-breakout via queue — this page's URL queued (storage.local) by a
   *      cell click; fallback for fragment-stripping redirects, gated on
   *      cfg.breakout. The grid's url set does not survive this path (no ‹ › nav).
   */
  window.__reframerAuto = function reframerAuto() {
    let flagged;
    try {
      flagged = sessionStorage.getItem(AUTO_KEY);
      sessionStorage.removeItem(AUTO_KEY); // consume → one-shot
    } catch {}
    if (flagged) return autoReframe();

    // Slideshow-breakout via hash: the fragment carries marker + url set, is readable
    // at document_start with zero async — this is what actually fires in Firefox — and
    // self-authorizes (a hash-bearing cell was built with breakout on), so it bypasses
    // the storage cfg gate entirely.
    const hashSignal = parseBreakoutHash(location.hash);
    if (hashSignal) {
      stashSet(hashSignal.urls); // seed this tab's set before the fragment is stripped
      // One-shot: strip the hash so a plain reload restores the full markup page.
      try { history.replaceState(null, "", location.pathname + location.search); } catch {}
      showPending("Breaking out…"); // feedback while the page finishes loading
      // Wait for full load (not just DOMContentLoaded): the strip is destructive, so
      // let lazy images/scripts settle and the real src resolve before tearing down.
      whenLoaded(() => {
        if (slideshowBreakout(hashSignal.urls)) return; // strip removes the banner
        // Failure feedback: don't leave the user staring at an unexplained page.
        showPending("Breakout failed: no .slideshow img found");
        setTimeout(removePending, 4000);
      });
      return;
    }
    if (!browser?.storage?.local) return;
    browser.storage.local.get([BREAKOUT_KEY, STORAGE_KEY]).then((res) => {
      const queue = res?.[BREAKOUT_KEY] || [];
      const urlHit = queue.includes(location.href);
      // Breadcrumb trail: every gate in the chain, so a silent no-op is diagnosable
      // from the page console alone.
      console.info(
        `[img-src-reframer] breakout check — queued:${urlHit} enabled:${!!res?.[STORAGE_KEY]?.breakout}`,
      );
      if (!urlHit) return;
      // Consume the queue entry so it can't stale-fire on a later coincidental visit.
      browser.storage.local.set({ [BREAKOUT_KEY]: queue.filter((u) => u !== location.href) });
      if (!res?.[STORAGE_KEY]?.breakout) return;
      showPending("Breaking out…"); // feedback while the page finishes loading
      // Wait for full load (not just DOMContentLoaded): the strip is destructive, so
      // let lazy images/scripts settle and the real src resolve before tearing down.
      whenLoaded(() => {
        // No fragment set survived the redirect — recover the stashed set from a
        // prior breakout on this tab so ‹ › nav keeps working page → page.
        if (slideshowBreakout(readSet() || [])) return; // strip removes the banner
        // Failure feedback: don't leave the user staring at an unexplained page.
        showPending("Breakout failed: no .slideshow img found");
        setTimeout(removePending, 4000);
      });
    }).catch(() => {});
  };
})();
