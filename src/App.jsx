import { useEffect } from "react";
import "./App.css";
import { init } from "./script"; // ✅ script.js에서 export init 필요
import { apiGetMyStudies } from "./api";
import { useLocation } from "react-router-dom";
import { showPage } from "./legacy/navigation.js";
import { appState, saveState } from "./legacy/state.js";

export default function App() {
  const location = useLocation();

  useEffect(() => {
    init(); // ✅ 기존 DOM 기반 로직 실행
  }, []);

  useEffect(() => {
    const match = location.pathname.match(/^\/studies\/([^/]+)$/);
    if (match) showPage("groupDetailPage");
  }, [location.pathname]);

  async function loadMyStudies() {
    try {
      const studies = await apiGetMyStudies();

      appState.groups = studies;
      saveState(appState);

    } catch (e) {
    console.error("스터디 목록 불러오기 실패:", e);
    }
  }

  // ✅ 2. 로그인 상태일 때 자동 실행
  useEffect(() => {
    const token = localStorage.getItem("accessToken");

    if (token) {
      loadMyStudies();
    }
  }, []);

  
  return (
    <>
      <header id="globalHeader">
        <h1 className="appTitle">📚 스터디 관리 서비스</h1>
      </header>

      {/* 로그인 화면 */}
      <section id="loginPage" className="page">
        <div className="card">
          <h2>로그인</h2>

          <div>
            <button id="googleLoginBtn" className="btn btn-primary">
              Google로 로그인
            </button>
          </div>

        </div>
      </section>

      {/* 스터디 그룹 목록 화면 */}
      <section id="groupListPage" className="page" style={{ display: "none" }}>
        <div className="topbar">
          <p id="userInfo" className="user"></p>
          <button id="logoutBtn" className="btn btn-ghost">
            로그아웃
          </button>
        </div>

        <div className="grid2">
          {/* 그룹 생성 */}
          <div className="card">
            <h2>스터디 그룹 목록</h2>

            <div className="inputRow">
              <input id="groupInput" type="text" placeholder="새 스터디 방 이름" />
              <button id="createGroupBtn" className="btn btn-primary">
                방 생성
              </button>
            </div>

            <div id="inviteBox" className="inviteBox" style={{ display: "none" }}>
              <div className="inviteRow">
                <span className="badge">초대 링크</span>
                <input id="inviteLink" type="text" readOnly />
                <button id="copyInviteBtn" className="btn btn-secondary">
                  복사
                </button>
              </div>
              <p className="muted small">
                * 조원은 이 링크로만 참여할 수 있어요(연동 전이라 UI만 동작).
              </p>
            </div>

            <hr className="sep" />

            <ul id="groupList" className="list"></ul>
          </div>

          {/* 링크로 참여 */}
          <div className="card">
            <h2>링크로 참여</h2>
            <p className="muted">방장이 공유한 초대 링크를 붙여넣고 참여하세요.</p>

            <div className="inputRow">
              <input id="inviteInput" type="text" placeholder="예) study://join?groupId=..." />
              <button id="joinByLinkBtn" className="btn btn-primary">
                참여
              </button>
            </div>

            <div className="hintBox">
              <div className="hintTitle">테스트 팁</div>
              <div className="muted small">
                방을 생성하면 초대 링크가 생성됩니다. 복사해서 여기에 붙여넣어보세요.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 그룹 내부(대시보드) */}
      <section id="groupDetailPage" className="page" style={{ display: "none" }}>
        {/* 그룹 상단바: 타이머 고정 */}
        <div className="groupHeader">
          {/* 왼쪽: 타이틀 + 그룹명 + 내역할 */}
          <div className="groupHeaderLeft">
            <div className="groupBrand">
              <div className="groupAppTitle">📚 스터디 관리 서비스</div>

              <div className="groupMeta">
                <div id="currentGroupName" className="groupName"></div>
                <div id="currentGroupRole" className="muted small"></div>
              </div>
            </div>
          </div>

          {/* 오른쪽: 타이머 */}
          <div className="timerCard">
            <div className="timerTop">
              <span className="badge">타이머</span>
              <span id="timerStatus" className="muted small">
                대기
              </span>
            </div>
            <div id="timerDisplay" className="timerDisplay">
              00:00:00
            </div>
            <div className="timerBtns">
              <button id="timerStartBtn" className="btn btn-primary">
                공부 시작
              </button>
              <button id="timerStopBtn" className="btn btn-secondary" disabled>
                완료
              </button>
              <button id="timerResetBtn" className="btn btn-ghost">
                리셋
              </button>
            </div>
          </div>
        </div>

        <div className="dashboardLayout">
          {/* 좌측 사이드 */}
          <aside className="sidebar">
            <button id="backToGroupsBtn" className="btn btn-ghost sideBackBtn">
              ← 그룹 목록
            </button>
            <button className="sideBtn active" data-tab="dashboard">
              메인
            </button>
            <button className="sideBtn" data-tab="members">
              멤버 목록
            </button>
            <button className="sideBtn" data-tab="myroom">
              내 스터디방
            </button>
            <button className="sideBtn" data-tab="ranking">
              랭킹
            </button>
          </aside>

          {/* 중앙 콘텐츠 */}
          <main className="content">
            {/* 탭: 메인 */}
            <section id="tab-dashboard" className="tab">
              <div className="contentHeader">
                <h2>메인 화면</h2>
                <p className="muted">왼쪽 메뉴로 이동해도 타이머는 유지됩니다.</p>
              </div>

              <div className="summaryGrid">
                <div className="miniCard">
                  <div className="miniTitle">출석</div>
                  <div id="attendanceSummary" className="miniValue">
                    -
                  </div>
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
                <p className="muted small">
                  * 지금은 저장/연동 전이라, 그룹별로 임시 데이터로 표시됩니다.
                </p>
                <div className="calendarHeader">
                  <button id="calPrevBtn" className="btn btn-ghost">
                    ←
                  </button>
                  <div id="calTitle" className="calTitle"></div>
                  <button id="calNextBtn" className="btn btn-ghost">
                    →
                  </button>
                </div>
                <div id="calendarGrid" className="calendarGrid"></div>
                <div className="legend">
                  <span className="legendItem">
                    <span className="dot ok">🥰</span> 출석
                  </span>
                  <span className="legendItem">
                    <span className="dot mid">😐</span> 부분
                  </span>
                  <span className="legendItem">
                    <span className="dot no">🤬</span> 결석
                  </span>
                </div>
              </div>
            </section>

            {/* 탭: 멤버 목록 */}
            <section id="tab-members" className="tab" style={{ display: "none" }}>
              <div className="contentHeader">
                <h2>멤버 목록</h2>
                <p className="muted">방장/멤버 권한에 따라 보이는 기능이 달라요.</p>
              </div>

              <div className="card">
                <div className="rowBetween">
                  <h3>멤버</h3>
                  <div id="ownerControls" style={{ display: "none" }}>
                    <button id="openInviteModalBtn" className="btn btn-primary">
                      멤버 초대
                    </button>
                    <button id="openFineModalBtn" className="btn btn-secondary">
                      벌금 관리
                    </button>
                  </div>
                </div>

                <ul id="memberList" className="list"></ul>

                <div id="memberOwnerHint" className="hintBox" style={{ display: "none" }}>
                  <div className="hintTitle">방장 기능(임시)</div>
                  <div className="muted small">
                    초대/벌금 관리는 지금은 버튼만 있습니다. 연동 후 실제 기능을 붙이면 됩니다.
                  </div>
                </div>
              </div>
            </section>

            {/* 탭: 내 스터디방 */}
            <section id="tab-myroom" className="tab" style={{ display: "none" }}>
              <div className="contentHeader">
                <h2>내 스터디방</h2>
                <p className="muted">과목 설정 / 출석 등록 / 주간요약</p>
              </div>

              <div className="subTabs">
                <button className="subBtn active" data-sub="subjects">
                  과목 설정
                </button>
                <button className="subBtn" data-sub="attendance">
                  출석 등록
                </button>
                <button className="subBtn" data-sub="weekly">
                  주간요약
                </button>
              </div>

              {/* 과목 설정 */}
              <div id="sub-subjects" className="subPanel">
                <div className="card">
                  <h3>과목 설정</h3>
                  <p className="muted small">
                    과목 이름/페이지/중요도/난이도/시간/기간 입력 → AI가 오늘 목표 자동 설정(연동 전이라 UI만).
                  </p>

                  <div className="formRow">
                    <label>오늘 목표 공부 시간(분)</label>
                    <input id="dailyGoalMinutes" type="number" min={0} placeholder="예) 120" />
                  </div>

                  <div className="grid2">
                    <div className="formRow">
                      <label>과목 이름</label>
                      <input id="subjectName" type="text" placeholder="예) 수학" />
                    </div>
                    <div className="formRow">
                      <label>총 페이지 수</label>
                      <input
                        id="subjectTotalPages"
                        type="number"
                        min={0}
                        placeholder="예) 120"
                      />
                    </div>
                    <div className="formRow">
                      <label>중요도(1~5)</label>
                      <input
                        id="subjectImportance"
                        type="number"
                        min={1}
                        max={5}
                        placeholder="예) 4"
                      />
                    </div>
                    <div className="formRow">
                      <label>난이도(1~5)</label>
                      <input
                        id="subjectDifficulty"
                        type="number"
                        min={1}
                        max={5}
                        placeholder="예) 3"
                      />
                    </div>
                    <div className="formRow">
                      <label>기간(일)</label>
                      <input id="subjectPeriodDays" type="number" min={1} placeholder="예) 14" />
                    </div>
                  </div>

                  <div className="rowBetween">
                    <button id="addSubjectBtn" className="btn btn-primary">
                      과목 추가
                    </button>
                    <button id="generateGoalBtn" className="btn btn-secondary">
                      목표 자동설정(임시)
                    </button>
                  </div>

                  <hr className="sep" />

                  <h4>오늘 과목 목록</h4>
                  <ul id="subjectList" className="list"></ul>

                  <div className="hintBox">
                    <div className="hintTitle">목표 표시(임시)</div>
                    <div id="goalOutput" className="muted small">
                      과목을 추가한 뒤 “목표 자동설정(임시)”을 눌러보세요.
                    </div>
                  </div>
                </div>
              </div>

              {/* 출석 등록 */}
              <div id="sub-attendance" className="subPanel" style={{ display: "none" }}>
                <div className="card">
                  <h3>출석 등록</h3>
                  <p className="muted small">
                    공부 후 입력: 목표/실제 시간, 목표/실제 페이지 → O/△/X 판정(연동 전이라 임시 저장).
                  </p>

                  <div className="grid2">
                    <div className="formRow">
                      <label>오늘 목표 공부 시간(분)</label>
                      <input id="attGoalMinutes" type="number" min={0} placeholder="예) 120" />
                    </div>
                    <div className="formRow">
                      <label>오늘 실제 공부 시간(분)</label>
                      <input
                        id="attActualMinutes"
                        type="number"
                        min={0}
                        placeholder="예) 110"
                      />
                    </div>
                  </div>

                  <div className="formRow">
                    <label>과목별 목표/실제 페이지</label>

                    <div className="grid3">
                      <div className="formRow">
                        <label>과목</label>
                        <input id="attSubjectName" type="text" placeholder="예) 수학" />
                      </div>

                      <div className="formRow">
                        <label>목표 페이지</label>
                        <input id="attGoalPages" type="number" min={0} placeholder="예) 10" />
                      </div>

                      <div className="formRow">
                        <label>실제 페이지</label>
                        <input
                          id="attActualPages"
                          type="number"
                          min={0}
                          placeholder="예) 12"
                        />
                      </div>
                    </div>

                    <div className="rowBetween" style={{ marginTop: 8 }}>
                      <button id="addAttPageBtn" className="btn btn-secondary">
                        과목 추가
                      </button>
                      <div className="muted small">추가하면 아래 목록에 쌓여요.</div>
                    </div>

                    <ul id="attPageList" className="list"></ul>
                  </div>

                  <div className="rowBetween">
                    <button id="saveAttendanceBtn" className="btn btn-primary">
                      오늘 출석 등록
                    </button>
                    <div className="muted small">등록하면 메인 달력에 표시돼요.</div>
                  </div>

                  <div className="hintBox">
                    <div className="hintTitle">판정 규칙</div>
                    <div className="muted small">
                      분량 다 채우면 <b>O</b>
                      <br />
                      시간 다 채웠지만 분량 다 못 채우면 <b>△</b>
                      <br />
                      시간도 다 못 채우면 <b>X</b>
                    </div>
                  </div>
                </div>
              </div>

              {/* 주간요약 */}
              <div id="sub-weekly" className="subPanel" style={{ display: "none" }}>
                <div className="card">
                  <h3>주간요약</h3>
                  <p className="muted small">
                    일주일에 한 번 생성(연동 후). 지금은 버튼만 동작합니다.
                  </p>

                  <button id="weeklySummaryBtn" className="btn btn-primary">
                    주간요약 생성
                  </button>

                  <div className="hintBox">
                    <div className="hintTitle">결과(임시)</div>
                    <div id="weeklyOutput" className="muted small">
                      아직 생성된 주간요약이 없어요.
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 탭: 랭킹 */}
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
                    <li className="listItem">
                      <span>1위</span>
                      <span className="muted">-</span>
                    </li>
                    <li className="listItem">
                      <span>2위</span>
                      <span className="muted">-</span>
                    </li>
                    <li className="listItem">
                      <span>3위</span>
                      <span className="muted">-</span>
                    </li>
                  </ul>
                </div>

                <div className="card">
                  <h3>공부 순위</h3>
                  <div className="muted small">기준(출석/공부량)은 추후 결정</div>
                  <ul className="list">
                    <li className="listItem">
                      <span>1위</span>
                      <span className="muted">-</span>
                    </li>
                    <li className="listItem">
                      <span>2위</span>
                      <span className="muted">-</span>
                    </li>
                    <li className="listItem">
                      <span>3위</span>
                      <span className="muted">-</span>
                    </li>
                  </ul>
                </div>
              </div>
            </section>
          </main>
        </div>
      </section>

      {/* 간단 모달(임시) */}
      <div id="modalOverlay" className="modalOverlay" style={{ display: "none" }}>
        <div className="modal">
          <div className="rowBetween">
            <h3 id="modalTitle">알림</h3>
            <button id="modalCloseBtn" className="btn btn-ghost">
              닫기
            </button>
          </div>
          <div id="modalBody" className="muted"></div>
          <div className="modalActions">
            <button id="modalOkBtn" className="btn btn-primary">
              확인
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
