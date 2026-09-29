# PressPause

PressPause is a Manifest V3 browser extension for scheduling work breaks and tracking small recovery habits.

## Features

- Adjustable work and break timers
- Deep work, standard, and quick-focus presets
- Browser notifications when the popup is closed, with optional sound while it is open
- Snooze actions for five or ten minutes
- Custom reminder message
- Break checklist for stretching, water, walking, and eye rest
- Simple daily activity tracking

## Load the extension

1. Open Chrome, Edge, or another Chromium browser.
2. Go to `chrome://extensions` or the browser's extensions page.
3. Enable Developer mode.
4. Select **Load unpacked**.
5. Select this `new-extension` folder.

## Main files

- `manifest.json` - Manifest V3 permissions and entry points
- `popup.html`, `popup.css`, `popup.js` - timer popup and activity dashboard
- `background.js` - alarm and notification service worker
- `offscreen.html`, `offscreen.js` - retained audio prototype files; not required by the current compatible build
- `icon.svg` - PressPause branding asset

## Test locally

From this directory:

```powershell
Get-Content manifest.json -Raw | ConvertFrom-Json | Out-Null
node --check popup.js
node --check background.js
node --check offscreen.js
```
