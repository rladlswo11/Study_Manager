export default function SideBar() {
  return (
    <aside className="sidebar">
      <button id="backToGroupsBtn" className="btn btn-ghost sideBackBtn">
        ← 그룹 목록
      </button>
      <button className="sideBtn active" data-tab="dashboard">메인</button>
      <button className="sideBtn" data-tab="members">멤버 목록</button>
      <button className="sideBtn" data-tab="myroom">내 스터디방</button>
      <button className="sideBtn" data-tab="ranking">랭킹</button>
    </aside>
  );
}