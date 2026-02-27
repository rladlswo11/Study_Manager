import { $ } from "./dom.js";

function showPage(pageId) {
  const pages = ["loginPage", "groupListPage", "groupDetailPage"];
  pages.forEach(p => {
    $(p).style.display = (p === pageId) ? "block" : "none";
  });

  // ✅ 그룹 화면에서는 글로벌 헤더(맨 위 큰 타이틀) 숨기기
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