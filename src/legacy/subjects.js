import { $ } from "./dom.js";
import { appState, saveState } from "./state.js";
import { openModal } from "./modal.js";
import { getActiveGroup } from "./selectors.js";

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

export { renderSubjects, addSubject, generateGoalMock };
