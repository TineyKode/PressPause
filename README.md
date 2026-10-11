# PressPause

Manifest V3 browser extension for a work and break timer, with a short recovery checklist.

## What it does

- Work and break timers, with Deep work (120/10), Standard (50/10), and Quick focus (25/5)
- A reminder message you can edit
- A browser notification when the timer ends and the popup is closed
- A sound while the popup is open, if sound is turned on
- Snooze for 5 or 10 minutes
- Daily counts for work, exercise, and meals, plus a reset for today
- A break checklist: stretch, drink water, walk, and rest your eyes
- A streak that goes up once on a day when all four checklist items are checked

The day changes at UTC midnight. Missing a day resets the streak. The sound plays only while the popup is open, because that is where the audio runs.

## Install

1. Open Chrome, Edge, or another Chromium browser.
2. Go to `chrome://extensions`.
3. Turn on Developer mode.
4. Choose **Load unpacked** and select this folder.

## Files

- `manifest.json` - Manifest V3
- `popup.html`, `popup.css`, `popup.js` - timer, checklist, and streak
- `background.js` - alarm and notification
- `icon.png` - toolbar icon
- `icon.svg` - source drawing for the icon

`reminder.html`, `reminder.js`, `offscreen.html`, and `offscreen.js` are not loaded by the manifest.

## Permissions

- `alarms` - fire the timer when the popup is closed
- `notifications` - the end-of-timer notice
- `storage` - timer settings and the day's counts

## Check

```powershell
Get-Content manifest.json -Raw | ConvertFrom-Json | Out-Null
node --check popup.js
node --check background.js
```
