export default function DashboardTab() {
  return (
    <section id="tab-dashboard" className="tab">
      <div className="contentHeader">
        <h2>메인 화면</h2>
      </div>
      <div className="summaryGrid">
        <div className="miniCard">
          <div className="miniTitle">출석</div>
          <div id="attendanceSummary" className="miniValue">-</div>
        </div>
        {/* ... 나머지 미니카드 생략 ... */}
      </div>
      <div className="card">
        <h3>출석 확인 달력</h3>
        <div id="calendarGrid" className="calendarGrid"></div>
      </div>
    </section>
  );
}