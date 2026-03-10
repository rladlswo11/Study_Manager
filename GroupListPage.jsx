import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { appState, saveState } from "../../legacy/state";
import { apiCreateStudy, apiGetMyStudies, apiDeleteStudy, apiCreateInviteLink, apiJoinStudy } from "../../api";
import { openModal } from "../../legacy/modal";
import { renderUserInfo } from "../../legacy/auth";
import { $ } from "../../legacy/dom";

export default function GroupListPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState(appState.groups || []);
  const [groupName, setGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const me = appState.currentUser;

  // 1. 서버에서 데이터 가져오기
  const refreshGroups = async () => {
    try {
      const raw = await apiGetMyStudies();

      // ✅ 백엔드가 주는 진짜 데이터를 콘솔에서 확인해보자!
      console.log("백엔드에서 온 스터디 목록 데이터:", raw);
      
      const list = Array.isArray(raw) ? raw : (raw?.studies || raw?.items || [raw]);
      const meEmail = me?.email || "googleUser";
      
      const formattedGroups = list.filter(s => s && s.id != null && s.name).map((s) => ({
        id: s.id,
        name: s.name,
        role: s.role, // ✅ 백엔드가 주는 'owner' 또는 'member' 역할 저장
        // (참고: 백엔드에서 전체 멤버 수를 뜻하는 member_count 같은 필드가 있다면 그걸 쓰고, 없으면 일단 1명으로 표시해둘게!)
        memberCount: s.member_count || 1, 
      }));

      appState.groups = formattedGroups;
      setGroups(formattedGroups);
      saveState(appState);
    } catch (e) {
      console.error("그룹 목록 로드 실패:", e);
    }
  };

  useEffect(() => {
    renderUserInfo(); // 상단 유저 정보 DOM 업데이트
    refreshGroups();
  }, []);

  // 2. 방 생성
  const handleCreateGroup = async () => {
    if (!groupName.trim()) return openModal("알림", "새 스터디 방 이름을 입력해줘!");
    try {
      await apiCreateStudy({ name: groupName.trim(), description: "", fine_per_absence: 1000 });
      setGroupName("");
      openModal("성공", "스터디 방이 생성됐어!");
      await refreshGroups();
    } catch (e) {
      openModal("방 생성 실패", e?.message || String(e));
    }
  };

  // 3. 링크 생성
  const handleCreateInvite = async (groupId) => {
    try {
      const data = await apiCreateInviteLink(groupId);
      const token = data?.token ?? data?.invite_token ?? data?.invite?.token;
      const url = data?.url ?? data?.invite_url;
      const linkText = url || (token ? `study://join?token=${token}` : JSON.stringify(data));
      
      const inviteLinkEl = $("inviteLink");
      const inviteBoxEl = $("inviteBox");
      if (inviteLinkEl) inviteLinkEl.value = linkText;
      if (inviteBoxEl) inviteBoxEl.style.display = "block";
      openModal("초대 링크", linkText);
    } catch (e) {
      openModal("초대 링크 생성 실패", e?.message || String(e));
    }
  };

  // 4. 들어가기
  const handleEnterGroup = (group) => {
    // ✅ 복잡한 이메일 검사 대신 백엔드가 준 role 값으로 확인!
    const isOwner = group.role === "owner";
    const isMember = group.role === "member";

    // 만약 둘 다 아니라면 (비정상적인 접근)
    if (!isOwner && !isMember) {
      return openModal("입장 불가", "이 방은 링크로 참여한 멤버만 입장할 수 있어.");
    }
    
    appState.activeGroupId = group.id;
    saveState(appState);
    navigate(`/group/${group.id}`);
  };

  // 5. 삭제
  const handleDeleteGroup = async (groupId, gName) => {
    if (!window.confirm(`정말 "${gName}" 그룹을 삭제할까?`)) return;
    try {
      await apiDeleteStudy(groupId);
      const newGroups = groups.filter(x => x.id !== groupId);
      appState.groups = newGroups;
      setGroups(newGroups);
      saveState(appState);
      openModal("삭제 완료", "그룹이 삭제됐어!");
    } catch (e) {
      openModal("삭제 실패", e?.message || String(e));
    }
  };

  // 6. 링크(또는 토큰)로 참여 - 진짜 백엔드 연동!
  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      return openModal("알림", "초대 링크나 코드를 입력해줘!");
    }

    try {
      // 1. 입력된 값에서 토큰(문자열)만 쏙 빼내기
      let tokenToSend = inviteCode.trim();
      
      // 만약 "study://join?token=어쩌구" 형태라면
      if (tokenToSend.includes("token=")) {
        tokenToSend = tokenToSend.split("token=").pop().split("&")[0];
      } 
      // 만약 "http://도메인/invites/어쩌구" 형태라면
      else if (tokenToSend.includes("/invites/")) {
        tokenToSend = tokenToSend.split("/").pop();
      }

      // 2. 백엔드 API 호출! (POST /invites/{token}/accept)
      await apiJoinStudy(tokenToSend);

      // 3. 성공 처리
      openModal("참여 성공!", "스터디 방에 성공적으로 참여했어.");
      setInviteCode(""); // 입력창 비우기
      await refreshGroups(); // 방 목록 다시 불러와서 화면 갱신!

    } catch (e) {
      // 4. 실패 처리
      openModal("참여 실패", e?.message || "초대 코드가 유효하지 않거나 이미 참여한 방이야.");
    }
  };

  return (
    <section id="groupListPage" className="page">
      <div className="topbar">
        <p id="userInfo" className="user"></p>
      </div>

      <div className="grid2">
        {/* 방 생성 카드 */}
        <div className="card">
          <h2>스터디 그룹 목록</h2>
          <div className="inputRow">
            <input 
              id="groupInput" type="text" placeholder="새 스터디 방 이름" 
              value={groupName} onChange={(e) => setGroupName(e.target.value)} 
              onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
            />
            <button id="createGroupBtn" className="btn btn-primary" onClick={handleCreateGroup}>
              방 생성
            </button>
          </div>

          <div id="inviteBox" className="inviteBox" style={{ display: "none" }}>
            <div className="inviteRow">
              <span className="badge">초대 링크</span>
              <input id="inviteLink" type="text" readOnly />
              <button id="copyInviteBtn" className="btn btn-secondary" onClick={() => {
                navigator.clipboard?.writeText($("inviteLink").value);
                openModal("초대 링크", "복사했어! 조원에게 붙여넣어서 공유하면 돼.");
              }}>복사</button>
            </div>
            <p className="muted small">* 조원은 이 링크로만 참여할 수 있어요(연동 전이라 UI만 동작).</p>
          </div>
          <hr className="sep" />

          <ul id="groupList" className="list" style={{ listStyle: 'none', padding: 0 }}>
            {groups.length === 0 ? (
              <li className="listItem"><span className="muted">아직 스터디 방이 없어요.</span></li>
            ) : (
              groups.map((g) => {
                // ✅ 기존 복잡한 이메일 비교 대신, 명확한 role 값으로 판단!
                const isOwner = g.role === "owner";
                const isMember = g.role === "member" || g.role === "owner"; // owner도 당연히 참여자(member)니까 포함

                return (
                  <li key={g.id} className="listItem" style={{ marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <div className="left">
                        <div style={{ fontWeight: 900, fontSize: '1.1rem' }}>{g.name}</div>
                        <div className="muted small" style={{ fontSize: '0.85rem', color: '#666' }}>
                          {/* ✅ role에 맞춰서 방장/멤버 글자가 제대로 뜰 거야! */}
                          {isOwner ? "방장" : "멤버"} · 멤버 {g.memberCount}명 · {isMember ? "참여됨" : "미참여"}
                        </div>
                      </div>
                      <div className="right" style={{ display: "flex", gap: "8px" }}>
                        <button className="btn btn-primary" disabled={!isMember} onClick={() => handleEnterGroup(g)}>들어가기</button>
                        <button className="btn btn-secondary" onClick={() => handleCreateInvite(g.id)}>링크</button>
                        {isOwner && <button className="btn btn-ghost" onClick={() => handleDeleteGroup(g.id, g.name)}>삭제</button>}
                      </div>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>

        {/* 링크 참여 카드 */}
        <div className="card">
          <h2>링크로 참여</h2>
          <p className="muted">방장이 공유한 초대 링크를 붙여넣고 참여하세요.</p>
          <div className="inputRow">
            <input 
              id="inviteInput" type="text" placeholder="예) study://join?groupId=..." 
              value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} 
              onKeyDown={(e) => e.key === "Enter" && handleJoin()} 
            />
            <button id="joinByLinkBtn" className="btn btn-primary" onClick={handleJoin}>참여</button>
          </div>
          <div className="hintBox">
            <div className="hintTitle">테스트 팁</div>
            <div className="muted small">방을 생성하면 초대 링크가 생성됩니다. 복사해서 여기에 붙여넣어보세요.</div>
          </div>
        </div>
      </div>
    </section>
  );
}