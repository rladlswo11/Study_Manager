console.log("script.js 연결됨");
const groupDetailPage = document.getElementById("groupDetailPage");
const backToGroupsBtn = document.getElementById("backToGroupsBtn");
const currentGroupTitle = document.getElementById("currentGroupTitle");

const memberManageBtn = document.getElementById("memberManageBtn");
const planBtn = document.getElementById("planBtn");


// 페이지 요소
const loginPage = document.getElementById("loginPage");
const groupListPage = document.getElementById("groupListPage");

// 버튼/입력/리스트
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

const userInfo = document.getElementById("userInfo");

const groupInput = document.getElementById("groupInput");
const createGroupBtn = document.getElementById("createGroupBtn");
const groupList = document.getElementById("groupList");
//planpage 연결 
const planPage = document.getElementById("planPage");
const backToGroupDetailBtn = document.getElementById("backToGroupDetailBtn");
const planTitle = document.getElementById("planTitle");

const subjectInput = document.getElementById("subjectInput");
const addSubjectBtn = document.getElementById("addSubjectBtn");
const subjectList = document.getElementById("subjectList");

const memberPage = document.getElementById("memberPage");
const memberTitle = document.getElementById("memberTitle");
const backToGroupDetailFromMemberBtn = document.getElementById("backToGroupDetailFromMemberBtn");

const inviteEmailInput = document.getElementById("inviteEmailInput");
const inviteMemberBtn = document.getElementById("inviteMemberBtn");
const memberList = document.getElementById("memberList");

//임시 멤버 저장소 + 렌더 함수 추가
const membersByGroupId = {}; // { [groupId]: [{email: "..."}] }

function getMembers(groupId) {
  if (!membersByGroupId[groupId]) membersByGroupId[groupId] = [];
  return membersByGroupId[groupId];
}

function renderMembers() {
  const members = getMembers(currentGroup.id);
  memberList.innerHTML = "";

  if (members.length === 0) {
    const li = document.createElement("li");
    li.innerHTML = `<span style="font-weight:500; color:#666;">아직 멤버가 없어요. 이메일로 초대해보자!</span>`;
    memberList.appendChild(li);
    return;
  }

  members.forEach((m, idx) => {
    const li = document.createElement("li");

    const left = document.createElement("span");
    left.textContent = m.email;

    const removeBtn = document.createElement("button");
    removeBtn.className = "deleteBtn";
    removeBtn.textContent = "삭제";

    removeBtn.addEventListener("click", () => {
      const ok = confirm(`"${m.email}" 멤버를 목록에서 제거할까?`);
      if (!ok) return;
      members.splice(idx, 1);
      renderMembers();
    });

    li.appendChild(left);
    li.appendChild(removeBtn);
    memberList.appendChild(li);
  });
}

memberManageBtn.addEventListener("click", () => {
  memberTitle.textContent = `👥 ${currentGroup.name} 멤버`;
  showPage("memberPage");
  renderMembers();
});

backToGroupDetailFromMemberBtn.addEventListener("click", () => {
  showPage("groupDetail");
});

function inviteMember() {
  const email = inviteEmailInput.value.trim();

  // 매우 가벼운 이메일 체크
  if (!email || !email.includes("@")) {
    alert("이메일을 올바르게 입력해줘!");
    return;
  }

  const members = getMembers(currentGroup.id);
  const exists = members.some(
    m => m.email.toLowerCase() === email.toLowerCase()
  );
  if (exists) {
    alert("이미 초대/추가된 멤버야!");
    return;
  }

  members.push({ email });
  inviteEmailInput.value = "";
  renderMembers();
}

inviteMemberBtn.addEventListener("click", inviteMember);

inviteEmailInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    inviteMember();
  }
});




// 가짜 로그인 유저
const fakeUser = {
  name: "Seula",
  email: "seula@gmail.com",
};

// (임시) 내가 가진 그룹 목록 - 나중에 서버에서 받아오면 됨
const groups = [];

let currentGroup = null;

// 그룹별로 "내 과목 리스트" 저장 (임시: 메모리)
const myPlansByGroupId = {};



// 화면 전환 함수
function showPage(pageName) {
  loginPage.style.display = "none";
  groupListPage.style.display = "none";
  groupDetailPage.style.display = "none";
  planPage.style.display = "none";
  memberPage.style.display = "none"; 

  if (pageName === "login") loginPage.style.display = "block";
  if (pageName === "groupList") groupListPage.style.display = "block";
  if (pageName === "groupDetail") groupDetailPage.style.display = "block";
  if (pageName === "plan") planPage.style.display = "block"; 
  if (pageName === "member") memberPage.style.display = "block";
}


// 그룹 리스트 렌더링
function renderGroups() {
  groupList.innerHTML = "";

  groups.forEach((g, index) => {
    const li = document.createElement("li");

    const left = document.createElement("span");
    left.textContent = g.name;

    // 오른쪽 버튼 영역(선택/삭제)
    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.gap = "8px";

    const enterBtn = document.createElement("button");
    enterBtn.textContent = "선택";
    enterBtn.className = "btn btn-ghost";

    enterBtn.addEventListener("click", () => {
      currentGroup = g;
      currentGroupTitle.textContent = `📘 ${currentGroup.name}`;
      showPage("groupDetail");
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "삭제";
    deleteBtn.className = "deleteBtn";

    deleteBtn.addEventListener("click", () => {
      const ok = confirm(`"${g.name}" 그룹을 삭제할까?`);
      if (!ok) return;

      // groups에서 제거
      groups.splice(index, 1);

      // (임시) 해당 그룹의 데이터들 제거
      delete myPlansByGroupId[g.id];
      delete membersByGroupId[g.id];

      // 혹시 현재 선택된 그룹이 삭제된 그룹이면 초기화
      if (currentGroup && currentGroup.id === g.id) {
        currentGroup = null;
        showPage("groupList");
      }

      renderGroups();
    });

    actions.appendChild(enterBtn);
    actions.appendChild(deleteBtn);

    li.appendChild(left);
    li.appendChild(actions);
    groupList.appendChild(li);
  });
}


// 로그인 처리
loginBtn.addEventListener("click", () => {
  userInfo.textContent = `👤 ${fakeUser.name} (${fakeUser.email})`;
  showPage("groupList");
});

// 로그아웃 처리(임시)
logoutBtn.addEventListener("click", () => {
  showPage("login");
});

// 그룹 생성
function createGroup() {
  const name = groupInput.value.trim();
  if (name === "") return;

  // 간단한 id 생성
  const id = Date.now();
  groups.push({ id, name });

  groupInput.value = "";
  renderGroups();
}

createGroupBtn.addEventListener("click", createGroup);

groupInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") createGroup();
});

// 시작 화면
showPage("login");

//그룹 목록으로 돌아가기 버튼
backToGroupsBtn.addEventListener("click", () => {
  currentGroup = null;
  showPage("groupList");
});


//멈버관리 버튼
memberManageBtn.addEventListener("click", () => {
  memberTitle.textContent = `👥 ${currentGroup.name} 멤버`;
  showPage("member");
});

planBtn.addEventListener("click", async () => {
  console.log("✅ planBtn 클릭됨");
  if (!currentGroup) return;

  planTitle.textContent = `📅 ${fakeUser.name}의 계획 · ${currentGroup.name}`;
  planTitle.textContent = `📅 ${fakeUser.name}의 계획 · ${currentGroup.name}`;
myPlansByGroupId[currentGroup.id] = myPlansByGroupId[currentGroup.id] || [];
renderSubjects();
showPage("plan");


});




//그룹 내부로 돌아가기 버튼
backToGroupDetailBtn.addEventListener("click", () => {
  showPage("groupDetail");
});


//과목 렌더링 추가 삭제
function renderSubjects() {
  subjectList.innerHTML = "";
  if (!currentGroup) return;

  const gid = currentGroup.id;
  const subjects = myPlansByGroupId[gid] || [];

  subjects.forEach((text, idx) => {
    const li = document.createElement("li");

    const span = document.createElement("span");
    span.textContent = text;

    const del = document.createElement("button");
    del.textContent = "삭제";
    del.className = "deleteBtn";
    del.addEventListener("click", () => {
      subjects.splice(idx, 1);   // ✅ 프론트에서만 삭제
      renderSubjects();
    });

    li.appendChild(span);
    li.appendChild(del);
    subjectList.appendChild(li);
  });
}


async function addSubject() {
  const text = subjectInput.value.trim();
  if (text === "" || !currentGroup) return;

  const gid = currentGroup.id;

  // 1) 프론트에 먼저 추가(바로 화면에 보이게)
  myPlansByGroupId[gid] = myPlansByGroupId[gid] || [];
  myPlansByGroupId[gid].push(text);

  subjectInput.value = "";
  renderSubjects();

  // 2) 서버에도 저장 시도 (실패해도 화면은 유지)
  try {
    await apiCreateSubject(gid, text);
  } catch (e) {
    console.error(e);
    alert("서버 저장은 실패했어(지금은 프론트에만 저장돼). 나중에 연동 완성하면 해결돼!");
  }
}



addSubjectBtn.addEventListener("click", addSubject);

subjectInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addSubject();
});

