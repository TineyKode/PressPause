const DEFAULT_WORK_MINUTES = 120;
const DEFAULT_BREAK_MINUTES = 5;
const TIMER_STORAGE_KEY = 'pressPauseCoreTimer';
const ACTIVITY_STORAGE_KEY = 'pressPauseCoreActivity';
const api = globalThis.chrome || globalThis.browser;

const timerLabelEl = document.getElementById('timerLabel');
const countdownEl = document.getElementById('countdown');
const statusEl = document.getElementById('status');
const workMinutesInput = document.getElementById('workMinutes');
const breakMinutesInput = document.getElementById('breakMinutes');
const presetSelect = document.getElementById('presetSelect');
const reminderMessageInput = document.getElementById('reminderMessage');
const soundToggle = document.getElementById('soundToggle');
const soundSelect = document.getElementById('soundSelect');
const previewSoundBtn = document.getElementById('previewSoundBtn');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const breakBtn = document.getElementById('breakBtn');
const reminderBanner = document.getElementById('reminderBanner');
const reminderBannerMessage = document.getElementById('reminderBannerMessage');
const snoozeFiveBtn = document.getElementById('snoozeFiveBtn');
const snoozeTenBtn = document.getElementById('snoozeTenBtn');
const dismissBannerBtn = document.getElementById('dismissBannerBtn');
const todayValueEl = document.getElementById('todayValue');
const workCountEl = document.getElementById('workCount');
const exerciseCountEl = document.getElementById('exerciseCount');
const mealCountEl = document.getElementById('mealCount');
const resetTodayBtn = document.getElementById('resetTodayBtn');
const checklistInputs = [...document.querySelectorAll('[data-activity]')];

let mode = 'work';
let isRunning = false;
let remainingMs = DEFAULT_WORK_MINUTES * 60 * 1000;
let endTime = null;
let bannerVisible = false;
let bannerMessage = '';
let activityState = {
  date: new Date().toISOString().slice(0, 10),
  today: 0,
  categories: { work: 0, exercise: 0, meal: 0 },
  checklist: { stretch: true, water: true, walk: false, eyes: true },
};

function storageGet(key) {
  try {
    const localValue = localStorage.getItem(key);
    if (localValue) return Promise.resolve(JSON.parse(localValue));
  } catch {
    // Continue to extension storage when localStorage is unavailable.
  }

  const storage = api?.storage?.local;
  if (!storage) return Promise.resolve(null);
  if (!globalThis.chrome && globalThis.browser) {
    return storage.get(key).then((result) => result?.[key] || null);
  }
  return new Promise((resolve) => storage.get(key, (result) => resolve(result?.[key] || null)));
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Extension storage below remains the durable fallback.
  }

  const storage = api?.storage?.local;
  if (!storage) return Promise.resolve();
  if (!globalThis.chrome && globalThis.browser) return storage.set({ [key]: value }).catch(() => {});
  return new Promise((resolve) => storage.set({ [key]: value }, resolve));
}

function clearAlarms() {
  api?.alarms?.clear('pressPause');
  api?.alarms?.clear('pressPauseWork');
  api?.alarms?.clear('pressPauseBreak');
  api?.alarms?.clear('pressPauseSnooze');
}

function scheduleAlarm(name, when) {
  clearAlarms();
  api?.alarms?.create(name, { when });
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatDuration(durationMs) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function getDurationMs(currentMode) {
  const input = currentMode === 'break' ? breakMinutesInput : workMinutesInput;
  const fallback = currentMode === 'break' ? DEFAULT_BREAK_MINUTES : DEFAULT_WORK_MINUTES;
  return Math.max(1, Number(input.value) || fallback) * 60 * 1000;
}

function playAlertSound(soundName = soundSelect.value) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  const tones = { chime: [880], double: [660, 990], low: [440] };
  const frequencies = tones[soundName] || tones.chime;

  frequencies.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    const startTime = context.currentTime + index * 0.18;
    oscillator.type = soundName === 'low' ? 'sine' : 'triangle';
    oscillator.frequency.value = frequency;
    gainNode.gain.value = 0.0001;
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    gainNode.gain.exponentialRampToValueAtTime(0.12, startTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.5);
    oscillator.start(startTime);
    oscillator.stop(startTime + 0.55);
  });
}

function timerState() {
  return {
    mode,
    isRunning,
    remainingMs,
    endTime,
    workMinutes: Number(workMinutesInput.value) || DEFAULT_WORK_MINUTES,
    breakMinutes: Number(breakMinutesInput.value) || DEFAULT_BREAK_MINUTES,
    reminderMessage: reminderMessageInput.value.trim() || 'Step away, stretch, drink water, or rest.',
    soundEnabled: soundToggle.checked,
    soundName: soundSelect.value,
    bannerVisible,
    bannerMessage,
  };
}

async function saveTimer() {
  await storageSet(TIMER_STORAGE_KEY, timerState());
}

function applyTimerState(saved) {
  if (!saved) return;
  mode = saved.mode === 'break' ? 'break' : 'work';
  workMinutesInput.value = saved.workMinutes || DEFAULT_WORK_MINUTES;
  breakMinutesInput.value = saved.breakMinutes || DEFAULT_BREAK_MINUTES;
  reminderMessageInput.value = saved.reminderMessage || 'Step away, stretch, drink water, or rest.';
  soundToggle.checked = saved.soundEnabled !== false;
  soundSelect.value = saved.soundName || 'chime';
  bannerVisible = Boolean(saved.bannerVisible);
  bannerMessage = saved.bannerMessage || '';
  remainingMs = Number(saved.remainingMs) || getDurationMs(mode);
  endTime = Number(saved.endTime) || null;
  isRunning = Boolean(saved.isRunning && endTime && endTime > Date.now());
  if (!isRunning && saved.isRunning) {
    remainingMs = 0;
    endTime = null;
  }
}

function applyActivityState(saved) {
  if (!saved) return;
  if (saved.date !== todayKey()) {
    storageSet(ACTIVITY_STORAGE_KEY, activityState);
    return;
  }

  activityState = {
    ...activityState,
    ...saved,
    today: Number(saved.today) || 0,
    categories: { ...activityState.categories, ...(saved.categories || {}) },
    checklist: { ...activityState.checklist, ...(saved.checklist || {}) },
  };
}

function saveActivity() {
  storageSet(ACTIVITY_STORAGE_KEY, activityState);
}

function renderActivity() {
  todayValueEl.textContent = activityState.today;
  workCountEl.textContent = activityState.categories.work;
  exerciseCountEl.textContent = activityState.categories.exercise;
  mealCountEl.textContent = activityState.categories.meal;
  checklistInputs.forEach((input) => {
    input.checked = activityState.checklist[input.dataset.activity] === true;
  });
}

function render() {
  const currentRemainingMs = isRunning && endTime ? Math.max(0, endTime - Date.now()) : remainingMs;
  countdownEl.textContent = formatDuration(currentRemainingMs);
  timerLabelEl.textContent = mode === 'break' ? 'Break session' : 'Work session';
  statusEl.textContent = isRunning ? 'Running' : (currentRemainingMs <= 0 ? 'Complete' : 'Ready');
  statusEl.style.color = isRunning ? '#34d399' : '#a5b4cf';
  reminderBanner.hidden = !bannerVisible;
  reminderBannerMessage.textContent = bannerMessage;
  renderActivity();
  startBtn.disabled = isRunning;
  pauseBtn.disabled = !isRunning;
  breakBtn.disabled = isRunning;
}

function startTimer(nextMode) {
  mode = nextMode;
  remainingMs = getDurationMs(mode);
  endTime = Date.now() + remainingMs;
  isRunning = true;
  bannerVisible = false;
  scheduleAlarm(nextMode === 'break' ? 'pressPauseBreak' : 'pressPauseWork', endTime);
  saveTimer();
  render();
}

function pauseTimer() {
  if (!isRunning) return;
  remainingMs = Math.max(0, endTime - Date.now());
  endTime = null;
  isRunning = false;
  clearAlarms();
  saveTimer();
  render();
}

function resetTimer() {
  isRunning = false;
  endTime = null;
  remainingMs = getDurationMs(mode);
  bannerVisible = false;
  clearAlarms();
  saveTimer();
  render();
}

function snoozeReminder(minutes) {
  mode = 'work';
  remainingMs = minutes * 60 * 1000;
  endTime = Date.now() + remainingMs;
  isRunning = true;
  bannerVisible = false;
  scheduleAlarm('pressPauseSnooze', endTime);
  saveTimer();
  render();
}

async function restore() {
  applyTimerState(await storageGet(TIMER_STORAGE_KEY));
  applyActivityState(await storageGet(ACTIVITY_STORAGE_KEY));
  render();
}

startBtn.addEventListener('click', () => startTimer('work'));
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);
breakBtn.addEventListener('click', () => startTimer('break'));
previewSoundBtn.addEventListener('click', () => playAlertSound(soundSelect.value));
workMinutesInput.addEventListener('change', () => { if (!isRunning && mode === 'work') resetTimer(); });
breakMinutesInput.addEventListener('change', () => { if (!isRunning && mode === 'break') resetTimer(); });
soundToggle.addEventListener('change', saveTimer);
soundSelect.addEventListener('change', saveTimer);
reminderMessageInput.addEventListener('change', saveTimer);
presetSelect.addEventListener('change', () => {
  const presets = { deep: [120, 10], standard: [50, 10], quick: [25, 5] };
  const values = presets[presetSelect.value];
  if (!values) return;
  workMinutesInput.value = values[0];
  breakMinutesInput.value = values[1];
  resetTimer();
  presetSelect.value = '';
});
snoozeFiveBtn.addEventListener('click', () => snoozeReminder(5));
snoozeTenBtn.addEventListener('click', () => snoozeReminder(10));
dismissBannerBtn.addEventListener('click', () => { bannerVisible = false; saveTimer(); render(); });
resetTodayBtn.addEventListener('click', () => {
  activityState = {
    date: todayKey(),
    today: 0,
    categories: { work: 0, exercise: 0, meal: 0 },
    checklist: { stretch: true, water: true, walk: false, eyes: true },
  };
  saveActivity();
  renderActivity();
});

document.querySelectorAll('[data-category]').forEach((button) => {
  button.addEventListener('click', () => {
    const category = button.dataset.category;
    activityState.categories[category] += 1;
    activityState.today += 1;
    saveActivity();
    renderActivity();
  });
});

checklistInputs.forEach((input) => {
  input.addEventListener('change', () => {
    activityState.checklist[input.dataset.activity] = input.checked;
    saveActivity();
  });
});

setInterval(() => {
  if (isRunning && endTime <= Date.now()) {
    remainingMs = 0;
    endTime = null;
    isRunning = false;
    bannerVisible = true;
    bannerMessage = reminderMessageInput.value.trim() || 'Step away, stretch, drink water, or rest.';
    clearAlarms();
    saveTimer();
    if (soundToggle.checked) playAlertSound(soundSelect.value);
  }
  render();
}, 250);

restore();
