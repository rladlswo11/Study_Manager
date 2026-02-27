import { $ } from "./dom.js";
import { appState, saveState } from "./state.js";
import { showPage } from "./navigation.js";
import { openModal } from "./modal.js";
import { renderGroupList } from "./groups.js";

export function captureTokenFromUrl() {
  const url = new URL(window.location.href);
  const token = url.searchParams.get("token");
  if (!token) return null;

  localStorage.setItem("accessToken", token);

  url.searchParams.delete("token");
  window.history.replaceState({}, "", url.toString());

  return token;
}

// (옵션) 임시 로그인 폼을 쓰는 경우 대비
export function doLogin() {
  const email = $("emailInput")?.value?.trim();
  const name = $("nameInput")?.value?.trim();
  if (!email || !name) {
    openModal("로그인", "이메일과 이름을 입력해줘!");
    return;
  }
  appState.currentUser = { email, name };
  saveState(appState);
  renderUserInfo();
  renderGroupList();
  showPage("groupListPage");
}

export function doLogout() {
  appState.currentUser = null;
  appState.activeGroupId = null;
  saveState(appState);
  showPage("loginPage");
}

export function renderUserInfo() {
  const u = appState.currentUser;
  if (!u) return;
  $("userInfo").textContent = `${u.name} (${u.email})`;
}
