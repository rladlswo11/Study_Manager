import { $ } from "./dom.js";
import { ATT_ICON } from "./constants.js";
import { appState } from "./state.js";
import { getActiveGroup } from "./selectors.js";
import { todayKey } from "./utils.js";

let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth(); // 0-11

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

export function prevMonth() {
  calMonth -= 1;
  if (calMonth < 0) {
    calMonth = 11;
    calYear -= 1;
  }
  renderCalendar();
}

export function nextMonth() {
  calMonth += 1;
  if (calMonth > 11) {
    calMonth = 0;
    calYear += 1;
  }
  renderCalendar();
}

export { renderCalendar };
