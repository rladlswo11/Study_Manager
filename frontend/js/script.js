// =====================
// 간단 저장소 (연동 전)
// =====================
const STORAGE_KEY = "study_manager_mock_v1";

// 출석 표시 아이콘 매핑
const ATT_ICON = {
  "O": "⭕",
  "△": "🚫",
  "X": "❌"
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid(prefix="id") {
  return prefix + "_" + Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function formatHMS(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// =====================
// 전역 상태
// =====================
let appState = loadState() || {
  currentUser: null,
  groups: [], // {id, name, ownerEmail, members:[{email,name}], subjectsByEmail:{[email]:[]}, attendanceByEmail:{[email]:{[date]: 'O'|'△'|'X'} } }
  activeGroupId: null,

  // timer: 그룹별로 저장
  timers: {
    // [groupId]: { running: bool, startAtMs: number|null, elapsedMs: number }
  }
};

let timerIntervalId = null;

// 캘린더 UI 상태
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth(); // 0-11

// 출석(과목별 페이지) 임시 입력 목록
let attPageItems = [];

// =====================
// DOM helpers
// =====================
function $(id) { return document.getElementById(id); }

function showPage(pageId) {
  const pages = ["loginPage", "groupListPage", "groupDetailPage"];
  pages.forEach(p => {
    $(p).style.display = (p === pageId) ? "block" : "none";
  });

  // ✅ 그룹 화면에서는 글로벌 헤더(맨 위 큰 타이틀) 숨기기
  const gh = document.getElementById("globalHeader");
  if (gh) gh.style.display = (pageId === "groupDetailPage") ? "none" : "block";
}


// =====================
// 모달
// =====================
function openModal(title, bodyHtml) {
  $("modalTitle").textContent = title;
  $("modalBody").innerHTML = bodyHtml;
  $("modalOverlay").style.display = "flex";
}
function closeModal() {
  $("modalOverlay").style.display = "none";
}
$("modalCloseBtn").addEventListener("click", closeModal);
$("modalOkBtn").addEventListener("click", closeModal);

// =====================
// 로그인/로그아웃
// =====================
function renderUserInfo() {
  const u = appState.currentUser;
  if (!u) return;
  $("userInfo").textContent = `${u.name} (${u.email})`;
}

function doLogin() {
  const email = $("emailInput").value.trim();
  const name = $("nameInput").value.trim();
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

// 로그인 Enter로 실행
["emailInput", "nameInput"].forEach((id) => {
  const el = document.getElementById(id);
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doLogin();
  });
});

function doLogout() {
  appState.currentUser = null;
  appState.activeGroupId = null;
  saveState(appState);
  showPage("loginPage");
}

$("loginBtn").addEventListener("click", doLogin);
$("logoutBtn").addEventListener("click", doLogout);

// =====================
// 그룹(방) 목록
// =====================
function makeInviteLink(groupId) {
  // 실제 서비스에서는 도메인 + 토큰/코드 방식이겠지만
  // 지금은 UI만: study://join?groupId=...
  return `study://join?groupId=${encodeURIComponent(groupId)}`;
}

function createGroup() {
  const name = $("groupInput").value.trim();
  if (!name) {
    openModal("그룹 생성", "방 이름을 입력해줘!");
    return;
  }
  const group = {
    id: uid("group"),
    name,
    ownerEmail: appState.currentUser.email,
    members: [{ email: appState.currentUser.email, name: appState.currentUser.name }],
    subjectsByEmail: { [appState.currentUser.email]: [] },
    attendanceByEmail: { [appState.currentUser.email]: {} }
  };
  appState.groups.unshift(group);
  // timer state init
  if (!appState.timers[group.id]) {
    appState.timers[group.id] = { running: false, startAtMs: null, elapsedMs: 0 };
  }
  saveState(appState);

  // invite UI
  const link = makeInviteLink(group.id);
  $("inviteLink").value = link;
  $("inviteBox").style.display = "block";
  $("groupInput").value = "";

  renderGroupList();
}

// 방 생성 Enter로 실행
document.getElementById("groupInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") createGroup();
});

function copyInvite() {
  const val = $("inviteLink").value;
  if (!val) return;
  navigator.clipboard?.writeText(val);
  openModal("초대 링크", "복사했어! 조원에게 붙여넣어서 공유하면 돼.");
}

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

// 링크 참여 Enter로 실행
document.getElementById("inviteInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") joinByLink();
});

function deleteGroup(groupId) {
  const g = appState.groups.find(x => x.id === groupId);
  if (!g) return;

  // 방장만 삭제 가능 (UI에서도 숨기지만 한번 더 체크)
  if (g.ownerEmail !== appState.currentUser.email) {
    openModal("삭제 불가", "방장만 그룹을 삭제할 수 있어.");
    return;
  }

  appState.groups = appState.groups.filter(x => x.id !== groupId);
  delete appState.timers[groupId];
  if (appState.activeGroupId === groupId) appState.activeGroupId = null;
  saveState(appState);
  renderGroupList();
}

function enterGroup(groupId) {
  const g = appState.groups.find(x => x.id === groupId);
  if (!g) return;

  const me = appState.currentUser;
  const isMember = g.members.some(m => m.email === me.email);
  if (!isMember) {
    openModal("입장 불가", "이 방은 링크로 참여한 멤버만 입장할 수 있어.");
    return;
  }

  appState.activeGroupId = groupId;
  saveState(appState);

  // 그룹 헤더 표시
  $("currentGroupName").textContent = g.name;
  const role = (g.ownerEmail === me.email) ? "방장(오너)" : "멤버";
  $("currentGroupRole").textContent = `내 역할: ${role}`;

  // 탭 초기화: 메인
  setActiveSideTab("dashboard");
  renderMembers();
  renderSubjects();
  renderAttendanceSummary();
  renderCalendar();

  // 타이머 UI
  ensureTimerStarted(); // interval만 켜고 running 여부는 상태로 판단
  syncTimerUI();

  showPage("groupDetailPage");
}

function renderGroupList() {
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
    inviteBtn.addEventListener("click", () => {
      $("inviteLink").value = makeInviteLink(g.id);
      $("inviteBox").style.display = "block";
      openModal("초대 링크", "초대 링크가 생성됐어. 복사해서 공유해줘!");
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

$("createGroupBtn").addEventListener("click", createGroup);
$("copyInviteBtn").addEventListener("click", copyInvite);
$("joinByLinkBtn").addEventListener("click", joinByLink);

// =====================
// 그룹 내부: 좌측 사이드 탭
// =====================
function setActiveSideTab(tabName) {
  document.querySelectorAll(".sideBtn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });

  const tabs = ["dashboard", "members", "myroom", "ranking"];
  tabs.forEach(t => {
    const el = document.getElementById(`tab-${t}`);
    if (el) el.style.display = (t === tabName) ? "block" : "none";
  });
}

document.querySelectorAll(".sideBtn").forEach(btn => {
  btn.addEventListener("click", () => {
    setActiveSideTab(btn.dataset.tab);
    // 필요시 렌더 재호출
    if (btn.dataset.tab === "dashboard") {
      renderAttendanceSummary();
      renderCalendar();
    }
    if (btn.dataset.tab === "members") renderMembers();
    if (btn.dataset.tab === "myroom") renderSubjects();
  });
});

$("backToGroupsBtn").addEventListener("click", () => {
  appState.activeGroupId = null;
  saveState(appState);
  showPage("groupListPage");
  renderGroupList();
});

// =====================
// 그룹 내부: 멤버 목록 (방장/멤버 차등)
// =====================
function getActiveGroup() {
  return appState.groups.find(g => g.id === appState.activeGroupId) || null;
}

function renderMembers() {
  const g = getActiveGroup();
  if (!g) return;

  const me = appState.currentUser;
  const isOwner = g.ownerEmail === me.email;

  $("ownerControls").style.display = isOwner ? "flex" : "none";
  $("memberOwnerHint").style.display = isOwner ? "block" : "none";

  const ul = $("memberList");
  ul.innerHTML = "";
  g.members.forEach(m => {
    const li = document.createElement("li");
    li.className = "listItem";
    const badge = (m.email === g.ownerEmail) ? `<span class="badge">방장</span>` : `<span class="badge" style="background:#f1f5f9;color:#0f172a;">멤버</span>`;
    li.innerHTML = `
      <span>${m.name} <span class="muted small">(${m.email})</span></span>
      ${badge}
    `;
    ul.appendChild(li);
  });
}

$("openInviteModalBtn").addEventListener("click", () => {
  const g = getActiveGroup();
  if (!g) return;
  openModal("멤버 초대(임시)", `
    <div class="muted small">아래 링크를 복사해 조원에게 공유하세요.</div>
    <div style="display:flex; gap:8px; margin-top:10px;">
      <input value="${makeInviteLink(g.id)}" readonly />
      <button class="btn btn-secondary" onclick="navigator.clipboard?.writeText('${makeInviteLink(g.id)}')">복사</button>
    </div>
  `);
});
$("openFineModalBtn").addEventListener("click", () => {
  openModal("벌금 관리(임시)", "연동 전이라 버튼만 있습니다. 나중에 멤버별 벌금 입력/누적 기능을 붙이면 돼요.");
});

// =====================
// 내 스터디방: 서브탭
// =====================
function setActiveSubTab(sub) {
  document.querySelectorAll(".subBtn").forEach(b => b.classList.toggle("active", b.dataset.sub === sub));
  ["subjects", "attendance", "weekly"].forEach(s => {
    const el = document.getElementById(`sub-${s}`);
    if (el) el.style.display = (s === sub) ? "block" : "none";
  });
}

document.querySelectorAll(".subBtn").forEach(btn => {
  btn.addEventListener("click", () => setActiveSubTab(btn.dataset.sub));
});

// =====================
// 과목 설정 (임시)
// =====================
function renderSubjects() {
  const g = getActiveGroup();
  if (!g) return;
  const me = appState.currentUser.email;
  const subjects = g.subjectsByEmail[me] || [];

  const ul = $("subjectList");
  ul.innerHTML = "";

  if (!subjects.length) {
    const li = document.createElement("li");
    li.className = "listItem";
    li.innerHTML = `<span class="muted">아직 추가된 과목이 없어요.</span>`;
    ul.appendChild(li);
    return;
  }

  subjects.forEach((s, idx) => {
    const li = document.createElement("li");
    li.className = "listItem";
    li.innerHTML = `
      <span>
        <b>${s.name}</b>
        <span class="muted small">· 총 ${s.totalPages}p · 중요도 ${s.importance} · 난이도 ${s.difficulty} · · 기간 ${s.periodDays}일</span>
      </span>
      <button class="btn btn-ghost" data-del="${idx}">삭제</button>
    `;
    li.querySelector("button").addEventListener("click", () => {
      subjects.splice(idx, 1);
      g.subjectsByEmail[me] = subjects;
      saveState(appState);
      renderSubjects();
    });
    ul.appendChild(li);
  });
}

function addSubject() {
  const g = getActiveGroup();
  if (!g) return;
  const me = appState.currentUser.email;
  const subjects = g.subjectsByEmail[me] || [];

  const name = $("subjectName").value.trim();
  const totalPages = Number($("subjectTotalPages").value);
  const importance = Number($("subjectImportance").value);
  const difficulty = Number($("subjectDifficulty").value);
  const periodDays = Number($("subjectPeriodDays").value);

  if (!name) return openModal("과목 추가", "과목 이름을 입력해줘!");
  if ([totalPages, importance, difficulty, periodDays].some(x => Number.isNaN(x))) {
    return openModal("과목 추가", "숫자 항목을 모두 입력해줘!");
  }

  subjects.push({ name, totalPages, importance, difficulty, periodDays });
  g.subjectsByEmail[me] = subjects;
  saveState(appState);

  $("subjectName").value = "";
  $("subjectTotalPages").value = "";
  $("subjectImportance").value = "";
  $("subjectDifficulty").value = "";
  $("subjectPeriodDays").value = "";

  renderSubjects();
}

function generateGoalMock() {
  const g = getActiveGroup();
  if (!g) return;

  const me = appState.currentUser.email;
  const subjects = g.subjectsByEmail[me] || [];
  if (!subjects.length) return openModal("목표 자동설정", "먼저 과목을 1개 이상 추가해줘!");

  // ✅ (추가) 오늘 총 목표 공부시간(분) 읽기
  const totalMinutes = Number($("dailyGoalMinutes")?.value || 0);
  if (totalMinutes <= 0) return openModal("목표 자동설정", "오늘 목표 공부 시간을 먼저 입력해줘!");

  // ✅ 가중치로 시간 배분: (중요도 + 난이도) 기반, 최소 1
  const weights = subjects.map(s => Math.max(1, (Number(s.importance) || 0) + (Number(s.difficulty) || 0)));
  const sumW = weights.reduce((a, b) => a + b, 0);

  // ✅ 과목별 배분 시간(분)
  const minutesAlloc = subjects.map((s, i) =>
    Math.max(1, Math.round(totalMinutes * (weights[i] / sumW)))
  );

  // ✅ 페이지 목표(임시): "하루 분량" = totalPages/periodDays 를 기반으로 가중치만 반영
  const goals = subjects.map((s, i) => {
    const dailyPages = (Number(s.totalPages) || 0) / Math.max(1, Number(s.periodDays) || 1);
    const ratio = weights[i] / sumW;
    const pages = Math.max(1, Math.round(dailyPages * ratio));

    return { name: s.name, goalMinutes: minutesAlloc[i], goalPages: pages };
  });

  const html = goals.map(g => `• <b>${g.name}</b>: ${g.goalMinutes}분 / ${g.goalPages}p`).join("<br/>");
  $("goalOutput").innerHTML = html;
}

$("addSubjectBtn").addEventListener("click", addSubject);
$("generateGoalBtn").addEventListener("click", generateGoalMock);

// =====================
// 출석 등록 (임시)
// =====================
function saveAttendanceToday() {
  const g = getActiveGroup();
  if (!g) return;

  const me = appState.currentUser.email;
  const goalMin = Number($("attGoalMinutes").value);
  const actualMin = Number($("attActualMinutes").value);

  if (Number.isNaN(goalMin) || Number.isNaN(actualMin)) {
    return openModal("출석 등록", "목표/실제 시간을 숫자로 입력해줘!");
  }

  // ✅ 분량 충족: 과목이 1개 이상 있고, 모든 과목에서 실제 >= 목표면 OK
  const pagesOk = (attPageItems.length > 0) && attPageItems.every(it => it.actualPages >= it.goalPages);
  
  attPageItems = [];
  renderAttPageList();


  let mark = "X";
  if (pagesOk) mark = "O";
  else if (actualMin >= goalMin && goalMin > 0) mark = "△";
  else mark = "X";

  g.attendanceByEmail[me] = g.attendanceByEmail[me] || {};
  g.attendanceByEmail[me][todayKey()] = mark;

  saveState(appState);

  openModal("출석 등록 완료", `오늘 출석이 <b>${mark}</b>로 기록됐어! 메인 달력에서 확인해봐.`);
  renderAttendanceSummary();
  renderCalendar();
}

function renderAttPageList() {
  const ul = $("attPageList");
  if (!ul) return;

  ul.innerHTML = "";

  if (!attPageItems.length) {
    const li = document.createElement("li");
    li.className = "listItem";
    li.innerHTML = `<span class="muted">아직 추가된 과목이 없어요. 위에서 과목/목표/실제를 입력하고 “과목 추가”를 눌러줘!</span>`;
    ul.appendChild(li);
    return;
  }

  attPageItems.forEach((it, idx) => {
    const li = document.createElement("li");
    li.className = "listItem";
    li.innerHTML = `
      <span>
        <b>${it.name}</b>
        <span class="muted small">· 목표 ${it.goalPages}p · 실제 ${it.actualPages}p</span>
      </span>
      <button class="btn btn-ghost">삭제</button>
    `;
    li.querySelector("button").addEventListener("click", () => {
      attPageItems.splice(idx, 1);
      renderAttPageList();
    });
    ul.appendChild(li);
  });
}

function addAttPageItem() {
  const name = $("attSubjectName")?.value.trim();
  const goalPages = Number($("attGoalPages")?.value);
  const actualPages = Number($("attActualPages")?.value);

  if (!name) return openModal("출석 등록", "과목 이름을 입력해줘!");
  if ([goalPages, actualPages].some(x => Number.isNaN(x))) {
    return openModal("출석 등록", "목표/실제 페이지를 숫자로 입력해줘!");
  }
  if (goalPages < 0 || actualPages < 0) {
    return openModal("출석 등록", "페이지는 0 이상으로 입력해줘!");
  }

  attPageItems.push({ name, goalPages, actualPages });

  $("attSubjectName").value = "";
  $("attGoalPages").value = "";
  $("attActualPages").value = "";

  renderAttPageList();
}

$("addAttPageBtn").addEventListener("click", addAttPageItem);

// Enter로 과목 추가
["attSubjectName", "attGoalPages", "attActualPages"].forEach((id) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addAttPageItem();
  });
});

$("saveAttendanceBtn").addEventListener("click", saveAttendanceToday);


// =====================
// 주간요약 버튼 (임시)
// =====================
$("weeklySummaryBtn").addEventListener("click", () => {
  const g = getActiveGroup();
  if (!g) return;
  const me = appState.currentUser.email;

  // 임시: 이번 주 출석을 간단히 세어 보여주기
  const att = (g.attendanceByEmail[me] || {});
  const now = new Date();
  const day = now.getDay(); // 0(일)~6
  const monday = new Date(now);
  const diffToMon = (day === 0 ? -6 : 1 - day); // 일요일이면 -6
  monday.setDate(now.getDate() + diffToMon);

  let o=0, d=0, x=0;
  for (let i=0;i<7;i++) {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    const key = `${dd.getFullYear()}-${String(dd.getMonth()+1).padStart(2,'0')}-${String(dd.getDate()).padStart(2,'0')}`;
    const m = att[key];
    if (m === "O") o++;
    else if (m === "△") d++;
    else if (m === "X") x++;
  }

  $("weeklyOutput").innerHTML = `
    <b>이번 주 요약(임시)</b><br/>
    출석 O: ${o}일 / △: ${d}일 / X: ${x}일<br/><br/>
    <b>피드백(임시)</b><br/>
    • 출석이 끊기기 쉬운 요일을 파악해봐요.<br/>
    • 목표 시간을 너무 높게 잡으면 △/X가 늘 수 있어요.
  `;
});

// =====================
// 메인: 출석 요약 + 캘린더
// =====================
function renderAttendanceSummary() {
  const g = getActiveGroup();
  if (!g) return;
  const me = appState.currentUser.email;
  const att = g.attendanceByEmail[me] || {};

  // 이번 달 요약
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;

  let o=0, d=0, x=0;
  Object.entries(att).forEach(([k, v]) => {
    const [yy, mm] = k.split("-").map(Number);
    if (yy === y && mm === m) {
      if (v === "O") o++;
      else if (v === "△") d++;
      else if (v === "X") x++;
    }
  });

  $("attendanceSummary").textContent = `⭕ ${o} · 🚫 ${d} · ❌ ${x}`;
}

function renderCalendar() {
  const g = getActiveGroup();
  if (!g) return;

  const me = appState.currentUser.email;
  const att = g.attendanceByEmail[me] || {};

  const title = `${calYear}년 ${calMonth+1}월`;
  $("calTitle").textContent = title;

  const grid = $("calendarGrid");
  grid.innerHTML = "";

  const dayNames = ["일","월","화","수","목","금","토"];
  dayNames.forEach(d => {
    const div = document.createElement("div");
    div.className = "dayHead";
    div.textContent = d;
    grid.appendChild(div);
  });

  const first = new Date(calYear, calMonth, 1);
  const last = new Date(calYear, calMonth+1, 0);
  const startDay = first.getDay();
  const daysInMonth = last.getDate();

  // 빈칸
  for (let i=0;i<startDay;i++) {
    const cell = document.createElement("div");
    cell.className = "dayCell";
    cell.style.opacity = "0.4";
    grid.appendChild(cell);
  }

  for (let d=1; d<=daysInMonth; d++) {
    const cell = document.createElement("div");
    cell.className = "dayCell";

    const key = `${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const mark = att[key] || "";

    cell.innerHTML = `
      <div class="dayNum">${d}</div>
      <div class="mark">
        ${mark ? `<span class="dot ${mark==='O'?'ok':(mark==='△'?'mid':'no')}">
          ${ATT_ICON[mark]}
        </span>` : ""}
      </div>

    `;

    // 클릭하면 해당 날짜 메모/등록으로 연결할 수도 있음(추후)
    cell.addEventListener("click", () => {
      openModal("출석(임시)", `${key}의 출석: <b>${mark || "-"}</b><br/><span class="muted small">등록은 '내 스터디방 → 출석 등록'에서 해줘.</span>`);
    });

    grid.appendChild(cell);
  }
}

$("calPrevBtn").addEventListener("click", () => {
  calMonth -= 1;
  if (calMonth < 0) { calMonth = 11; calYear -= 1; }
  renderCalendar();
});
$("calNextBtn").addEventListener("click", () => {
  calMonth += 1;
  if (calMonth > 11) { calMonth = 0; calYear += 1; }
  renderCalendar();
});

// =====================
// 타이머 (탭 이동에도 유지)
// =====================
function getTimerState() {
  const gid = appState.activeGroupId;
  if (!gid) return null;
  if (!appState.timers[gid]) appState.timers[gid] = { running:false, startAtMs:null, elapsedMs:0 };
  return appState.timers[gid];
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

function currentElapsedMs(t) {
  if (!t) return 0;
  if (!t.running || t.startAtMs == null) return t.elapsedMs || 0;
  return (t.elapsedMs || 0) + (Date.now() - t.startAtMs);
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

$("timerStartBtn").addEventListener("click", timerStart);
$("timerStopBtn").addEventListener("click", timerStop);
$("timerResetBtn").addEventListener("click", timerReset);

// =====================
// 초기 진입
// =====================
function init() {
  // 로그인 상태면 바로 그룹 목록
  if (appState.currentUser) {
    renderUserInfo();
    renderGroupList();
    showPage("groupListPage");
  } else {
    showPage("loginPage");
  }

  // 기본 서브탭은 과목 설정
  setActiveSubTab("subjects");
}

init();
