import { $ } from "./dom.js";

function showPage(pageId) {
  const pages = ["loginPage", "groupListPage", "groupDetailPage"];
  
  pages.forEach(p => {
    const el = $(p);
    // 👇 화면에 요소가 없으면 그냥 다음으로 넘어가게(return) 방어 코드 추가!
    if (!el) return; 
    
    el.style.display = (p === pageId) ? "block" : "none";
  });

  // ✅ 그룹 화면에서는 글로벌 헤더(맨 위 큰 타이틀) 숨기기 (여긴 이미 잘 되어있네!)
  const gh = document.getElementById("globalHeader");
  if (gh) gh.style.display = (pageId === "groupDetailPage") ? "none" : "block";
}

function setActiveSideTab(tabName) {
  document.querySelectorAll(".sideBtn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });

  const tabs = ["dashboard", "members", "myroom", "ranking"];
  tabs.forEach(t => {
    const el = document.getElementById(`tab-${t}`);
    if (el) el.style.display = (t === tabName) ? "block" : "none";
  });
}

function setActiveSubTab(sub) {
  document.querySelectorAll(".subBtn").forEach(b => b.classList.toggle("active", b.dataset.sub === sub));
  ["subjects", "attendance", "weekly"].forEach(s => {
    const el = document.getElementById(`sub-${s}`);
    if (el) el.style.display = (s === sub) ? "block" : "none";
  });
}

export { showPage, setActiveSideTab, setActiveSubTab };