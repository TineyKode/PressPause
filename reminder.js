const STORAGE_KEY = 'pressPauseState';

function getState() {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEY, (result) => resolve(result[STORAGE_KEY] || {}));
  });
}

function saveState(state) {
  return new Promise((resolve) => chrome.storage.local.set({ [STORAGE_KEY]: state }, resolve));
}

async function dismiss() {
  const state = await getState();
  state.bannerVisible = false;
  await saveState(state);
  window.close();
}

async function snooze(minutes) {
  const state = await getState();
  const delay = minutes * 60 * 1000;
  state.mode = 'work';
  state.isRunning = true;
  state.remainingMs = delay;
  state.endTime = Date.now() + delay;
  state.bannerVisible = false;
  await saveState(state);
  chrome.alarms.clear('pressPause');
  chrome.alarms.clear('pressPauseSnooze');
  chrome.alarms.create('pressPauseSnooze', { when: state.endTime });
  window.close();
}

getState().then((state) => {
  document.getElementById('title').textContent = state.mode === 'break' ? 'Break complete' : 'Time to pause';
  document.getElementById('message').textContent = state.bannerMessage || state.reminderMessage || 'Stretch, eat, walk, or rest.';
});

document.getElementById('dismiss').addEventListener('click', dismiss);
document.getElementById('snoozeFive').addEventListener('click', () => snooze(5));
document.getElementById('snoozeTen').addEventListener('click', () => snooze(10));
