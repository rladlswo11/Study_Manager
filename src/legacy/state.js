import { STORAGE_KEY } from "./constants.js";

const DEFAULT_STATE = {
  currentUser: null,
  groups: [],
  activeGroupId: null,
  timers: {},
};

function loadState() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveState(state) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export { loadState, saveState };

const saved = loadState();

// ✅ groups/timers 같은 건 복원하되, 로그인 정보는 복원하지 않기
export let appState = {
  ...DEFAULT_STATE,
  ...(saved || {}),
  currentUser: null,      // 🔥 항상 로그인부터 시작
};

export function persistAppState() {
  saveState(appState);
}

export function setAppState(next) {
  appState = next;
  persistAppState();
}