export default function Timer() {
  return (
    <div className="timerCard">
      <div className="timerTop">
        <span className="badge">타이머</span>
        <span id="timerStatus" className="muted small">대기</span>
      </div>
      <div id="timerDisplay" className="timerDisplay">00:00:00</div>
      <div className="timerBtns">
        <button id="timerStartBtn" className="btn btn-primary">공부 시작</button>
        <button id="timerStopBtn" className="btn btn-secondary" disabled>완료</button>
        <button id="timerResetBtn" className="btn btn-ghost">리셋</button>
      </div>
    </div>
  );
}