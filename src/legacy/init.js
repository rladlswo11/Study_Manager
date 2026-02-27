import { bindEvents } from "./events.js";
import { captureTokenFromUrl, renderUserInfo } from "./auth.js";
import { appState, saveState } from "./state.js";
import { showPage, setActiveSubTab } from "./navigation.js";
import { refreshGroupListFromServer, renderGroupList } from "./groups.js";

let __inited = false;

export async function init() {
  if (__inited) return;
  __inited = true;

  bindEvents();

  // 1) URL에서 token 파라미터 캡처(로그인 콜백 대비)
  const token = captureTokenFromUrl();
  if (token) {
    appState.currentUser = { email: "googleUser", name: "googleUser" };
    saveState(appState);
  }

  // 1.5) token은 없지만 accessToken이 이미 저장돼 있으면 로그인 상태로 간주
  if (!appState.currentUser && localStorage.getItem("accessToken")) {
    appState.currentUser = { email: "googleUser", name: "googleUser" };
    saveState(appState);
  }

  // 2) 로그인 상태 체크
  if (appState.currentUser || localStorage.getItem("accessToken")) {
    renderUserInfo();
    showPage("groupListPage");

    try {
      await refreshGroupListFromServer();
    } catch (e) {
      console.error("스터디 목록 불러오기 실패:", e);
      appState.groups = [];
      renderGroupList();
    }
  } else {
    showPage("loginPage");
  }

  // 기본 서브탭은 과목 설정
  setActiveSubTab("subjects");
}