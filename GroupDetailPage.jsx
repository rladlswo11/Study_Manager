import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { appState, saveState } from "../../legacy/state";
import { renderMembers } from "../../legacy/members";
import { renderSubjects, addSubject, generateGoalMock } from "../../legacy/subjects";
import { renderAttendanceSummary, addAttPageItem, saveAttendanceToday } from "../../legacy/attendance";
import { renderCalendar, prevMonth, nextMonth } from "../../legacy/calendar";
import { ensureTimerStarted, syncTimerUI, timerStart, timerStop, timerReset } from "../../legacy/timer";
import { generateWeeklySummaryMock } from "../../legacy/weekly";
import { setActiveSideTab, setActiveSubTab } from "../../legacy/navigation";
import { openModal } from "../../legacy/modal";
import { $ } from "../../legacy/dom";

export default function GroupDetailPage() {
  const navigate = useNavigate();
  const { groupId } = useParams();

  useEffect(() => {
    const g = appState.groups.find(x => String(x.id) === String(groupId));
    if (!g) return navigate("/"); // 없는 그룹이면 메인으로 강제 이동

    // 🌟 [수정 포인트 1] 서버 데이터에 없는 로컬 테스트용 객체를 강제로 만들어줍니다! (에러 방지)
    if (!g.subjectsByEmail) g.subjectsByEmail = {};
    if (!g.attendanceByEmail) g.attendanceByEmail = {};
    
    // ✅ [여기에 추가!] 옛날 코드가 에러를 뿜지 않도록, 멤버 목록이 없으면 빈 배열이라도 쥐어줍니다.
    if (!g.members) g.members = [];

    const meEmail = appState.currentUser?.email || "googleUser";
    if (!g.subjectsByEmail[meEmail]) g.subjectsByEmail[meEmail] = [];
    if (!g.attendanceByEmail[meEmail]) g.attendanceByEmail[meEmail] = {};

    // 로컬 상태 강제 주입
    appState.activeGroupId = g.id;
    saveState(appState);

    const isOwner = g.ownerEmail === meEmail;

    // 텍스트 초기화
    if ($("currentGroupName")) $("currentGroupName").textContent = g.name;
    if ($("currentGroupRole")) $("currentGroupRole").textContent = isOwner ? "내 역할: 방장(오너)" : "내 역할: 멤버";

    // ✅ 기존 legacy 렌더링 함수들 실행
    renderMembers();
    renderSubjects();
    renderAttendanceSummary();
    renderCalendar();
    
    // 타이머 UI 연동
    ensureTimerStarted();
    syncTimerUI();

    // 탭 초기화
    setActiveSideTab("dashboard");
    setActiveSubTab("subjects");
  }, [groupId, navigate]);

  // 커스텀 탭 이동 핸들러
  const handleSideTab = (tab) => {
    setActiveSideTab(tab);
    if (tab === "dashboard") {
      renderAttendanceSummary();
      renderCalendar();
    } else if (tab === "members") {
      renderMembers();
    } else if (tab === "myroom") {
      renderSubjects();
    }
  };

  const handleSubTab = (sub) => {
    setActiveSubTab(sub);
    if (sub === "subjects") renderSubjects();
  };

  return (
    <section id="groupDetailPage" className="page">
      <div className="groupHeader">
        <div className="groupHeaderLeft">
          <div className="groupBrand">
            <div className="groupAppTitle">📚 스터디 관리 서비스</div>
            <div className="groupMeta">
              <div id="currentGroupName" className="groupName"></div>
              <div id="currentGroupRole" className="muted small"></div>
            </div>
          </div>
        </div>

        <div className="timerCard">
          <div className="timerTop">
            <span className="badge">타이머</span>
            <span id="timerStatus" className="muted small">대기</span>
          </div>
          <div id="timerDisplay" className="timerDisplay">00:00:00</div>
          <div className="timerBtns">
            {/* 🌟 [수정 포인트 2] timerStopBtn에 있던 disabled 속성을 지웠습니다! 이제 legacy 로직이 알아서 제어합니다. */}
            <button id="timerStartBtn" className="btn btn-primary" onClick={timerStart}>공부 시작</button>
            <button id="timerStopBtn" className="btn btn-secondary" onClick={timerStop}>완료</button>
            <button id="timerResetBtn" className="btn btn-ghost" onClick={timerReset}>리셋</button>
          </div>
        </div>
      </div>

      <div className="dashboardLayout">
        <aside className="sidebar">
          <button id="backToGroupsBtn" className="btn btn-ghost sideBackBtn" onClick={() => navigate("/")}>
            ← 그룹 목록
          </button>
          <button className="sideBtn active" data-tab="dashboard" onClick={() => handleSideTab("dashboard")}>메인</button>
          <button className="sideBtn" data-tab="members" onClick={() => handleSideTab("members")}>멤버 목록</button>
          <button className="sideBtn" data-tab="myroom" onClick={() => handleSideTab("myroom")}>내 스터디방</button>
          <button className="sideBtn" data-tab="ranking" onClick={() => handleSideTab("ranking")}>랭킹</button>
        </aside>

        <main className="content">
          <section id="tab-dashboard" className="tab">
            <div className="contentHeader">
              <h2>메인 화면</h2>
              <p className="muted">왼쪽 메뉴로 이동해도 타이머는 유지됩니다.</p>
            </div>

            <div className="summaryGrid">
              <div className="miniCard">
                <div className="miniTitle">출석</div>
                <div id="attendanceSummary" className="miniValue">-</div>
                <div className="muted small">이번 달(임시)</div>
              </div>
              <div className="miniCard">
                <div className="miniTitle">벌금</div>
                <div className="miniValue">준비중</div>
                <div className="muted small">연동 후</div>
              </div>
              <div className="miniCard">
                <div className="miniTitle">랭킹</div>
                <div className="miniValue">준비중</div>
                <div className="muted small">연동 후</div>
              </div>
            </div>

            <div className="card">
              <h3>출석 확인 달력</h3>
              <p className="muted small">* 지금은 저장/연동 전이라, 그룹별로 임시 데이터로 표시됩니다.</p>
              <div className="calendarHeader">
                <button id="calPrevBtn" className="btn btn-ghost" onClick={prevMonth}>←</button>
                <div id="calTitle" className="calTitle"></div>
                <button id="calNextBtn" className="btn btn-ghost" onClick={nextMonth}>→</button>
              </div>
              <div id="calendarGrid" className="calendarGrid"></div>
              <div className="legend">
                <span className="legendItem"><span className="dot ok">🥰</span> 출석</span>
                <span className="legendItem"><span className="dot mid">😐</span> 부분</span>
                <span className="legendItem"><span className="dot no">🤬</span> 결석</span>
              </div>
            </div>
          </section>

          <section id="tab-members" className="tab" style={{ display: "none" }}>
            <div className="contentHeader">
              <h2>멤버 목록</h2>
              <p className="muted">방장/멤버 권한에 따라 보이는 기능이 달라요.</p>
            </div>
            <div className="card">
              <div className="rowBetween">
                <h3>멤버</h3>
                <div id="ownerControls" style={{ display: "none" }}>
                  <button id="openInviteModalBtn" className="btn btn-primary" onClick={() => openModal("멤버 초대", "연동 후 초대 기능을 붙일 예정이야!")}>멤버 초대</button>
                  <button id="openFineModalBtn" className="btn btn-secondary" onClick={() => openModal("벌금 관리", "연동 후 벌금 관리 기능을 붙일 예정이야!")}>벌금 관리</button>
                </div>
              </div>
              <ul id="memberList" className="list"></ul>
              <div id="memberOwnerHint" className="hintBox" style={{ display: "none" }}>
                <div className="hintTitle">방장 기능(임시)</div>
                <div className="muted small">초대/벌금 관리는 지금은 버튼만 있습니다. 연동 후 실제 기능을 붙이면 됩니다.</div>
              </div>
            </div>
          </section>

          <section id="tab-myroom" className="tab" style={{ display: "none" }}>
            <div className="contentHeader">
              <h2>내 스터디방</h2>
              <p className="muted">과목 설정 / 출석 등록 / 주간요약</p>
            </div>
            <div className="subTabs">
              <button className="subBtn active" data-sub="subjects" onClick={() => handleSubTab("subjects")}>과목 설정</button>
              <button className="subBtn" data-sub="attendance" onClick={() => handleSubTab("attendance")}>출석 등록</button>
              <button className="subBtn" data-sub="weekly" onClick={() => handleSubTab("weekly")}>주간요약</button>
            </div>

            <div id="sub-subjects" className="subPanel">
              <div className="card">
                <h3>과목 설정</h3>
                <p className="muted small">과목 이름/페이지/중요도/난이도/시간/기간 입력 → AI가 오늘 목표 자동 설정(연동 전이라 UI만).</p>
                <div className="formRow">
                  <label>오늘 목표 공부 시간(분)</label>
                  <input id="dailyGoalMinutes" type="number" min={0} placeholder="예) 120" />
                </div>
                <div className="grid2">
                  <div className="formRow"><label>과목 이름</label><input id="subjectName" type="text" placeholder="예) 수학" /></div>
                  <div className="formRow"><label>총 페이지 수</label><input id="subjectTotalPages" type="number" min={0} placeholder="예) 120" /></div>
                  <div className="formRow"><label>중요도(1~5)</label><input id="subjectImportance" type="number" min={1} max={5} placeholder="예) 4" /></div>
                  <div className="formRow"><label>난이도(1~5)</label><input id="subjectDifficulty" type="number" min={1} max={5} placeholder="예) 3" /></div>
                  <div className="formRow"><label>기간(일)</label><input id="subjectPeriodDays" type="number" min={1} placeholder="예) 14" /></div>
                </div>
                <div className="rowBetween">
                  <button id="addSubjectBtn" className="btn btn-primary" onClick={addSubject}>과목 추가</button>
                  <button id="generateGoalBtn" className="btn btn-secondary" onClick={generateGoalMock}>목표 자동설정(임시)</button>
                </div>
                <hr className="sep" />
                <h4>오늘 과목 목록</h4>
                <ul id="subjectList" className="list"></ul>
                <div className="hintBox">
                  <div className="hintTitle">목표 표시(임시)</div>
                  <div id="goalOutput" className="muted small">과목을 추가한 뒤 “목표 자동설정(임시)”을 눌러보세요.</div>
                </div>
              </div>
            </div>

            <div id="sub-attendance" className="subPanel" style={{ display: "none" }}>
              <div className="card">
                <h3>출석 등록</h3>
                <p className="muted small">공부 후 입력: 목표/실제 시간, 목표/실제 페이지 → O/△/X 판정(연동 전이라 임시 저장).</p>
                <div className="grid2">
                  <div className="formRow"><label>오늘 목표 공부 시간(분)</label><input id="attGoalMinutes" type="number" min={0} placeholder="예) 120" /></div>
                  <div className="formRow"><label>오늘 실제 공부 시간(분)</label><input id="attActualMinutes" type="number" min={0} placeholder="예) 110" /></div>
                </div>
                <div className="formRow">
                  <label>과목별 목표/실제 페이지</label>
                  <div className="grid3">
                    <div className="formRow"><label>과목</label><input id="attSubjectName" type="text" placeholder="예) 수학" /></div>
                    <div className="formRow"><label>목표 페이지</label><input id="attGoalPages" type="number" min={0} placeholder="예) 10" /></div>
                    <div className="formRow"><label>실제 페이지</label><input id="attActualPages" type="number" min={0} placeholder="예) 12" /></div>
                  </div>
                  <div className="rowBetween" style={{ marginTop: 8 }}>
                    <button id="addAttPageBtn" className="btn btn-secondary" onClick={addAttPageItem}>과목 추가</button>
                    <div className="muted small">추가하면 아래 목록에 쌓여요.</div>
                  </div>
                  <ul id="attPageList" className="list"></ul>
                </div>
                <div className="rowBetween">
                  <button id="saveAttendanceBtn" className="btn btn-primary" onClick={saveAttendanceToday}>오늘 출석 등록</button>
                  <div className="muted small">등록하면 메인 달력에 표시돼요.</div>
                </div>
                <div className="hintBox">
                  <div className="hintTitle">판정 규칙</div>
                  <div className="muted small">
                    분량 다 채우면 <b>O</b><br />
                    시간 다 채웠지만 분량 다 못 채우면 <b>△</b><br />
                    시간도 다 못 채우면 <b>X</b>
                  </div>
                </div>
              </div>
            </div>

            <div id="sub-weekly" className="subPanel" style={{ display: "none" }}>
              <div className="card">
                <h3>주간요약</h3>
                <p className="muted small">일주일에 한 번 생성(연동 후). 지금은 버튼만 동작합니다.</p>
                <button id="weeklySummaryBtn" className="btn btn-primary" onClick={generateWeeklySummaryMock}>주간요약 생성</button>
                <div className="hintBox">
                  <div className="hintTitle">결과(임시)</div>
                  <div id="weeklyOutput" className="muted small">아직 생성된 주간요약이 없어요.</div>
                </div>
              </div>
            </div>
          </section>

          <section id="tab-ranking" className="tab" style={{ display: "none" }}>
            <div className="contentHeader">
              <h2>랭킹</h2>
              <p className="muted">벌금 순위 / 공부 순위 (연동 전이라 UI만)</p>
            </div>
            <div className="grid2">
              <div className="card">
                <h3>벌금 순위</h3>
                <div className="muted small">준비중</div>
                <ul className="list">
                  <li className="listItem"><span>1위</span><span className="muted">-</span></li>
                  <li className="listItem"><span>2위</span><span className="muted">-</span></li>
                  <li className="listItem"><span>3위</span><span className="muted">-</span></li>
                </ul>
              </div>
              <div className="card">
                <h3>공부 순위</h3>
                <div className="muted small">기준(출석/공부량)은 추후 결정</div>
                <ul className="list">
                  <li className="listItem"><span>1위</span><span className="muted">-</span></li>
                  <li className="listItem"><span>2위</span><span className="muted">-</span></li>
                  <li className="listItem"><span>3위</span><span className="muted">-</span></li>
                </ul>
              </div>
            </div>
          </section>
        </main>
      </div>
    </section>
  );
}