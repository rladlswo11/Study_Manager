import { $ } from "./dom.js";
import { openModal } from "./modal.js";
import { appState } from "./state.js";
import { getActiveGroup } from "./selectors.js";

export function generateWeeklySummaryMock() {
  const g = getActiveGroup();
  if (!g) return;

  const me = appState.currentUser?.email;
  if (!me) return;

  const att = (g.attendanceByEmail?.[me] || {});
  const keys = Object.keys(att);
  const cnt = { O: 0, "△": 0, X: 0 };

  keys.forEach((k) => {
    const v = att[k];
    if (v === "O") cnt.O += 1;
    else if (v === "△") cnt["△"] += 1;
    else if (v === "X") cnt.X += 1;
  });

  const html = `
    <div class="muted small">
      이번주 출석(임시):<br/>
      🥰 O: <b>${cnt.O}</b> / 😐 △: <b>${cnt["△"]}</b> / 🤬 X: <b>${cnt.X}</b><br/>
      (연동 후 AI 주간요약 결과를 여기에 표시하면 돼!)
    </div>
  `;

  const out = $("weeklyOutput");
  if (out) out.innerHTML = html;
  openModal("주간요약(임시)", "생성 완료! 아래 결과를 확인해줘.");
}
