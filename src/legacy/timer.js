import { $ } from "./dom.js";
import { appState, saveState } from "./state.js";
import { formatHMS } from "./utils.js";

let timerIntervalId = null;

function getTimerState() {
  const gid = appState.activeGroupId;
  if (!gid) return null;
  if (!appState.timers[gid]) appState.timers[gid] = { running:false, startAtMs:null, elapsedMs:0 };
  return appState.timers[gid];
}

function currentElapsedMs(t) {
  if (!t) return 0;
  if (!t.running || t.startAtMs == null) return t.elapsedMs || 0;
  return (t.elapsedMs || 0) + (Date.now() - t.startAtMs);
}

function ensureTimerStarted() {
  if (timerIntervalId) return;
  timerIntervalId = setInterval(() => {
    const t = getTimerState();
    if (!t) return;
    if (t.running && t.startAtMs != null) {
      // 표시만 업데이트
      syncTimerUI();
    }
  }, 250);
}

function syncTimerUI() {
  const t = getTimerState();
  if (!t) return;
  const ms = currentElapsedMs(t);
  $("timerDisplay").textContent = formatHMS(ms);
  $("timerStartBtn").disabled = t.running;
  $("timerStopBtn").disabled = !t.running;
  $("timerStatus").textContent = t.running ? "진행중" : "대기";
}

function timerStart() {
  const t = getTimerState();
  if (!t || t.running) return;
  t.running = true;
  t.startAtMs = Date.now();
  saveState(appState);
  syncTimerUI();
}

function timerStop() {
  const t = getTimerState();
  if (!t || !t.running) return;
  // 누적
  t.elapsedMs = currentElapsedMs(t);
  t.running = false;
  t.startAtMs = null;
  saveState(appState);
  syncTimerUI();
}

function timerReset() {
  const t = getTimerState();
  if (!t) return;
  t.running = false;
  t.startAtMs = null;
  t.elapsedMs = 0;
  saveState(appState);
  syncTimerUI();
}

export {
  getTimerState,
  currentElapsedMs,
  ensureTimerStarted,
  syncTimerUI,
  timerStart,
  timerStop,
  timerReset
};