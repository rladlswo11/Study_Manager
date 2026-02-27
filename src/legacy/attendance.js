import { $ } from "./dom.js";
import { ATT_ICON } from "./constants.js";
import { appState, saveState } from "./state.js";
import { openModal } from "./modal.js";
import { getActiveGroup } from "./selectors.js";
import { todayKey } from "./utils.js";

let attPageItems = [];

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

  $("attendanceSummary").textContent = `🥰 ${o} · 😐 ${d} · 🤬 ${x}`;
}

export { renderAttPageList, addAttPageItem, saveAttendanceToday, renderAttendanceSummary };

// events에서 필요하면 초기화 가능
export function resetAttPageItems() {
  attPageItems = [];
}
