const ALARM_NAMES = new Set(['pressPause', 'pressPauseWork', 'pressPauseBreak', 'pressPauseSnooze']);
const api = globalThis.chrome || globalThis.browser;
const TIMER_STORAGE_KEY = 'pressPauseCoreTimer';

if (api?.alarms?.onAlarm) {
  api.alarms.onAlarm.addListener((alarm) => {
    if (!ALARM_NAMES.has(alarm.name)) return;

    api.storage.local.get(TIMER_STORAGE_KEY, (result) => {
      const timer = result?.[TIMER_STORAGE_KEY] || {};
      const message = timer.reminderMessage || 'Step away, stretch, drink water, or rest.';

      timer.isRunning = false;
      timer.endTime = null;
      timer.remainingMs = 0;
      timer.bannerVisible = true;
      timer.bannerMessage = message;

      api.storage.local.set({ [TIMER_STORAGE_KEY]: timer });
      api.notifications?.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: alarm.name === 'pressPauseBreak' ? 'Break complete' : 'Time to pause',
        message,
        priority: 2,
        requireInteraction: true,
      });
    });
  });
}
