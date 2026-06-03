# img-src-reframer

Firefox (MV3) extension that re-presents `<table>`/`<ul>`/`<ol>` image galleries as a
clean, full-width square grid overlay, with prev/next pagination, auto-reframe across
navigation, and optional slideshow-breakout.

## Install (temporary)

1. Open `about:debugging#/runtime/this-firefox`.
2. **Load Temporary Add-on…** → select `manifest.json` in this folder.
3. Open a gallery page, click the toolbar icon, pick the image class, and **Reframe**.

Requires Firefox ≥ 127. Temporary add-ons are removed on restart — reload via the same page.
