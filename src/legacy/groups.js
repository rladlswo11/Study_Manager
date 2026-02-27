import { $ } from "./dom.js";
import { appState, saveState } from "./state.js";
import { getActiveGroup } from "./selectors.js";
import { openModal } from "./modal.js";
import { showPage } from "./navigation.js";
import { ensureTimerStarted, syncTimerUI } from "./timer.js";
import { renderAttendanceSummary } from "./attendance.js";
import { renderCalendar } from "./calendar.js";
import { renderMembers } from "./members.js";
import { renderSubjects } from "./subjects.js";
import { apiGetMyStudies, apiCreateInviteLink, apiDeleteStudy } from "../api.js";


function renderGroupList() {
  console.log("appState.currentUser:", appState.currentUser);
  console.log("groups:", appState.groups);

  const list = $("groupList");
  list.innerHTML = "";

  const me = appState.currentUser;
  const groups = appState.groups;

  if (!groups.length) {
    const li = document.createElement("li");
    li.className = "listItem";
    li.innerHTML = `<span class="muted">아직 스터디 방이 없어요. 왼쪽에서 방을 생성해보세요.</span>`;
    list.appendChild(li);
    return;
  }

  groups.forEach(g => {
    console.log("group:", g);
    console.log("ownerEmail:", g.ownerEmail);
    console.log("members:", g.members);
    console.log("me.email:", me?.email);

    const li = document.createElement("li");
    li.className = "listItem";

    const isOwner = g.ownerEmail === me.email;
    const isMember = g.members.some(m => m.email === me.email);

    const left = document.createElement("div");
    left.innerHTML = `
      <div style="font-weight:900;">${g.name}</div>
      <div class="muted small">${isOwner ? "방장" : "멤버"} · 멤버 ${g.members.length}명 · ${isMember ? "참여됨" : "미참여"}</div>
    `;

    const right = document.createElement("div");
    right.style.display = "flex";
    right.style.gap = "8px";

    const enterBtn = document.createElement("button");
    enterBtn.className = "btn btn-primary";
    enterBtn.textContent = "들어가기";
    enterBtn.disabled = !isMember;
    enterBtn.addEventListener("click", () => enterGroup(g.id));

    const inviteBtn = document.createElement("button");
    inviteBtn.className = "btn btn-secondary";
    inviteBtn.textContent = "링크";
    inviteBtn.addEventListener("click", async () => {
      try {
        const data = await apiCreateInviteLink(g.id);

        const token = data?.token ?? data?.invite_token ?? data?.invite?.token;
        const url = data?.url ?? data?.invite_url;

        const linkText = url
          ? url
          : token
            ? `study://join?token=${token}`
            : JSON.stringify(data);

        $("inviteLink").value = linkText;
        $("inviteBox").style.display = "block";
        openModal("초대 링크", linkText);

      } catch (e) {
        openModal("초대 링크 생성 실패", e?.message || String(e));
      }
    });


    const delBtn = document.createElement("button");
    delBtn.className = "btn btn-ghost";
    delBtn.textContent = "삭제";
    delBtn.style.display = isOwner ? "inline-block" : "none";
    delBtn.addEventListener("click", () => deleteGroup(g.id));

    right.appendChild(enterBtn);
    right.appendChild(inviteBtn);
    right.appendChild(delBtn);

    li.appendChild(left);
    li.appendChild(right);
    list.appendChild(li);
  });
}

function addStudyToListUI(study) {
  const ul = $("groupList");
  if (!ul) return;

  const studyId = study?.id ?? study?.study_id; // 둘 다 대응

  const li = document.createElement("li");
  li.className = "listItem";
  li.dataset.studyId = studyId ?? "";

  li.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
      <div>
        <div><b>${study?.name ?? "새 스터디"}</b></div>
        <div class="muted small">id: ${studyId ?? "-"}</div>
      </div>
      <button class="btn btn-secondary btnInvite">초대 링크</button>
    </div>
  `;

  // ✅ 초대 링크 버튼 이벤트
  li.querySelector(".btnInvite")?.addEventListener("click", async () => {
    if (!studyId) return openModal("오류", "studyId가 없어서 링크를 만들 수 없어!");

    try {
      const data = await apiCreateInviteLink(studyId);

      // 백엔드가 뭘 반환하는지 몰라서 여러 키 대응
      const token = data?.token ?? data?.invite_token ?? data?.invite?.token;
      const url = data?.url ?? data?.invite_url;

      // 화면에 보여줄 링크 문자열 만들기
      const linkText = url
        ? url
        : token
          ? `study://join?token=${token}`
          : JSON.stringify(data);

      // 기존 UI에 있던 inviteLink input이 있으면 거기 넣기
      const inviteInput = $("inviteLink");
      if (inviteInput) inviteInput.value = linkText;

      openModal("초대 링크", linkText);
    } catch (e) {
      openModal("초대 링크 생성 실패", e?.message || String(e));
    }
  });

  ul.appendChild(li);
}

function enterGroup(groupId) {
  const g = appState.groups.find(x => x.id === groupId);
  if (!g) return;

  const me = appState.currentUser;

  console.log("ownerEmail:", g.ownerEmail, typeof g.ownerEmail);
  console.log("me.email:", me.email, typeof me.email);

  const isOwner = g.ownerEmail === me.email;

  const members = Array.isArray(g.members) ? g.members : [];
  const isMember = members.some(m => m.email === me.email);

  if (!isOwner && !isMember) {
    openModal("입장 불가", "이 방은 링크로 참여한 멤버만 입장할 수 있어.");
    return;
  }

  appState.activeGroupId = groupId;
  saveState(appState);

  $("currentGroupName").textContent = g.name;
  $("currentGroupRole").textContent =
    isOwner ? "내 역할: 방장(오너)" : "내 역할: 멤버";

  renderMembers();
  renderSubjects();
  renderAttendanceSummary();
  renderCalendar();
  
  //타이머 UI
  ensureTimerStarted();
  syncTimerUI();

  showPage("groupDetailPage"); // ✅ 주소 이동 말고 이걸로 통일
}

async function deleteGroup(groupId) {
  const g = appState.groups.find(x => x.id === groupId);
  if (!g) return;

  // 방장만 삭제 가능 (UI에서도 숨기지만 한번 더 체크)
  if (g.ownerEmail !== appState.currentUser.email) {
    openModal("삭제 불가", "방장만 그룹을 삭제할 수 있어.");
    return;
  }

  const ok = confirm(`정말 "${g.name}" 그룹을 삭제할까?`);
  if (!ok) return;

  try {
    // ✅ 백엔드 삭제 호출
    await apiDeleteStudy(groupId);

    // ✅ 성공하면 로컬 상태 정리(기존 로직)
    appState.groups = appState.groups.filter(x => x.id !== groupId);
    delete appState.timers[groupId];
    if (appState.activeGroupId === groupId) appState.activeGroupId = null;

    saveState(appState);
    renderGroupList();

    openModal("삭제 완료", "그룹이 삭제됐어!");
  } catch (e) {
    openModal("삭제 실패", e?.message || String(e));
  }
}


async function refreshGroupListFromServer() {
  const raw = await apiGetMyStudies();

  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.studies)
      ? raw.studies
      : Array.isArray(raw?.items)
        ? raw.items
        : (raw ? [raw] : []);

  const meEmail = appState.currentUser?.email || "googleUser";

  appState.groups = list
    .filter(s => s && s.id != null && s.name)
    .map((s) => ({
      id: s.id,
      name: s.name,
      ownerEmail: s.ownerEmail || s.owner_email || meEmail,
      members: s.members || [{ email: meEmail }],
    }));

  renderGroupList();
}

export { renderGroupList, addStudyToListUI, enterGroup, deleteGroup, refreshGroupListFromServer };
export { getActiveGroup } from "./selectors.js";
