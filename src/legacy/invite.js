import { $ } from "./dom.js";
import { openModal } from "./modal.js";
import { appState, saveState } from "./state.js";
import { uid } from "./utils.js";
import { renderGroupList, refreshGroupListFromServer } from "./groups.js";
import { apiCreateInviteLink } from "../api.js";

function parseInviteLink(text) {
  // study://join?groupId=...
  try {
    const m = text.match(/groupId=([^&]+)/);
    if (!m) return null;
    return decodeURIComponent(m[1]);
  } catch {
    return null;
  }
}

function makeInviteLink(groupId) {
  // 실제 서비스에서는 도메인 + 토큰/코드 방식이겠지만
  // 지금은 UI만: study://join?groupId=...
  return `study://join?groupId=${encodeURIComponent(groupId)}`;
}

function copyInvite() {
  const val = $("inviteLink").value;
  if (!val) return;
  navigator.clipboard?.writeText(val);
  openModal("초대 링크", "복사했어! 조원에게 붙여넣어서 공유하면 돼.");
}

function joinByLink() {
  const raw = $("inviteInput").value.trim();
  if (!raw) {
    openModal("링크로 참여", "초대 링크를 붙여넣어줘!");
    return;
  }
  const gid = parseInviteLink(raw);
  if (!gid) {
    openModal("링크로 참여", "링크 형식이 올바르지 않아. (예: study://join?groupId=...)");
    return;
  }
  const g = appState.groups.find(x => x.id === gid);
  if (!g) {
    openModal("링크로 참여", "해당 그룹을 찾지 못했어. (연동 전이라 같은 브라우저에 생성된 그룹만 참여 가능)");
    return;
  }
  // 이미 멤버인지 확인
  const me = appState.currentUser;
  const exists = g.members.some(m => m.email === me.email);
  if (!exists) {
    g.members.push({ email: me.email, name: me.name });
    g.subjectsByEmail[me.email] = g.subjectsByEmail[me.email] || [];
    g.attendanceByEmail[me.email] = g.attendanceByEmail[me.email] || {};
  }
  // timer init
  if (!appState.timers[g.id]) {
    appState.timers[g.id] = { running: false, startAtMs: null, elapsedMs: 0 };
  }
  saveState(appState);

  $("inviteInput").value = "";
  openModal("참여 완료", `"${g.name}"에 참여했어! 이제 방으로 들어가볼까?`);
  renderGroupList();
}

export { parseInviteLink, makeInviteLink, copyInvite, joinByLink };