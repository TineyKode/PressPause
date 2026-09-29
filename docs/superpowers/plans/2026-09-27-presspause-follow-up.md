# PressPause Follow-up Implementation Plan

> **For agentic workers:** Execute the tasks inline with focused validation after each edit.

**Goal:** Complete PressPause reminder feedback, date-aware streaks, and category activity tracking.

**Architecture:** Keep the existing Manifest V3 popup and service worker. Store activity metadata in `chrome.storage.local`, normalize legacy state on read, and render a popup banner when a reminder is fired.

**Tech Stack:** HTML, CSS, browser JavaScript, Chrome Extensions APIs.

## Global Constraints

- Preserve the existing popup and service-worker architecture.
- Do not add dependencies.
- Keep stored state backward-compatible with existing PressPause installations.

---

### Task 1: Add reminder banner UI

**Files:**
- Modify: `new-extension/popup.html`
- Modify: `new-extension/popup.css`
- Modify: `new-extension/popup.js`

- [ ] Add a hidden banner with message and dismiss controls.
- [ ] Show it when a timer or manual reminder fires, and persist the latest reminder message.
- [ ] Add accessible close behavior and visual styling.

### Task 2: Add date-aware activity and streak tracking

**Files:**
- Modify: `new-extension/popup.js`

- [ ] Add `activityDate`, `lastGoalDate`, and category counts to normalized state.
- [ ] Reset daily counts when the calendar date changes.
- [ ] Increment `todayCount` and update streak once when the daily goal is completed.
- [ ] Keep legacy state fields readable and preserve timer settings.

### Task 3: Complete category controls and validation

**Files:**
- Modify: `new-extension/popup.html`
- Modify: `new-extension/popup.js`

- [ ] Wire category `+1` buttons to persistent category counts.
- [ ] Add a daily activity reset control.
- [ ] Validate `manifest.json`, `popup.js`, and `background.js` with Node and PowerShell JSON parsing.
