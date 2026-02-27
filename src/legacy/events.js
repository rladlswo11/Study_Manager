import { API_BASE, apiCreateStudy } from "../api.js";
import { $ } from "./dom.js";
import { openModal, closeModal } from "./modal.js";
import { appState, saveState } from "./state.js";
import { doLogout } from "./auth.js";
import { joinByLink } from "./invite.js";
import { renderGroupList, refreshGroupListFromServer } from "./groups.js";
import { showPage, setActiveSideTab, setActiveSubTab } from "./navigation.js";
import { renderAttendanceSummary } from "./attendance.js";
import { renderCalendar, prevMonth, nextMonth } from "./calendar.js";
import { renderMembers } from "./members.js";
import { renderSubjects, addSubject, generateGoalMock } from "./subjects.js";
import { addAttPageItem, saveAttendanceToday } from "./attendance.js";
import { timerStart, timerStop, timerReset } from "./timer.js";
import { generateWeeklySummaryMock } from "./weekly.js";

let __eventsBound = false;

export function bindEvents() {
  if (__eventsBound) return;
  __eventsBound = true;

  // 모달 닫기
  $("modalCloseBtn")?.addEventListener("click", closeModal);
  $("modalOkBtn")?.addEventListener("click", closeModal);

  // 구글 로그인 버튼 (백엔드 엔드포인트로 이동)
  $("googleLoginBtn")?.addEventListener("click", () => {
    window.location.href = `${API_BASE}/auth/google/login`;
  });

  $("logoutBtn")?.addEventListener("click", doLogout);

  // 그룹 생성
  $("createGroupBtn")?.addEventListener("click", async () => {
    const name = $("groupInput")?.value?.trim();
    if (!name) return openModal("알림", "새 스터디 방 이름을 입력해줘!");

    try {
      await apiCreateStudy({
        name,
        description: "",
        fine_per_absence: 1000,
      });

      if ($("groupInput")) $("groupInput").value = "";
      openModal("성공", "스터디 방이 생성됐어!");
      await refreshGroupListFromServer();
    } catch (e) {
      openModal("방 생성 실패", e?.message || String(e));
      console.error(e);
    }
  });

  // 그룹 생성: Enter
  $("groupInput")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") $("createGroupBtn")?.click();
  });

  // 링크 참여: Enter
  $("inviteInput")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") joinByLink();
  });

  // 사이드 탭 이동
  document.querySelectorAll(".sideBtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      setActiveSideTab(btn.dataset.tab);

      if (btn.dataset.tab === "dashboard") {
        renderAttendanceSummary();
        renderCalendar();
      }
      if (btn.dataset.tab === "members") renderMembers();
      if (btn.dataset.tab === "myroom") renderSubjects();
    });
  });

  // 그룹 목록으로 돌아가기
  $("backToGroupsBtn")?.addEventListener("click", () => {
    appState.activeGroupId = null;
    saveState(appState);
    showPage("groupListPage");
    renderGroupList();
  });

  // 방장 기능 모달(임시)
  $("openInviteModalBtn")?.addEventListener("click", () => {
    openModal("멤버 초대", "연동 후 초대 기능을 붙일 예정이야!");
  });
  $("openFineModalBtn")?.addEventListener("click", () => {
    openModal("벌금 관리", "연동 후 벌금 관리 기능을 붙일 예정이야!");
  });

  // 서브탭 이동(내 스터디방)
  document.querySelectorAll(".subBtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      setActiveSubTab(btn.dataset.sub);
      if (btn.dataset.sub === "subjects") renderSubjects();
    });
  });

  // 과목 추가
  $("addSubjectBtn")?.addEventListener("click", addSubject);

  // 목표 자동설정(임시)
  $("generateGoalBtn")?.addEventListener("click", generateGoalMock);

  // 출석 과목 추가
  $("addAttPageBtn")?.addEventListener("click", addAttPageItem);

  // 오늘 출석 등록
  $("saveAttendanceBtn")?.addEventListener("click", saveAttendanceToday);

  // 주간요약
  $("weeklySummaryBtn")?.addEventListener("click", generateWeeklySummaryMock);

  // 캘린더 월 이동
  $("calPrevBtn")?.addEventListener("click", prevMonth);
  $("calNextBtn")?.addEventListener("click", nextMonth);

  // 타이머 버튼
  $("timerStartBtn")?.addEventListener("click", timerStart);
  $("timerStopBtn")?.addEventListener("click", timerStop);
  $("timerResetBtn")?.addEventListener("click", timerReset);
}