import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { appState, saveState } from "../../legacy/state";
import { apiCreateStudy, apiGetMyStudies, apiDeleteStudy, apiCreateInviteLink } from "../../api";
import { openModal } from "../../legacy/modal";
import { joinByLink } from "../../legacy/invite";
import { doLogout, renderUserInfo } from "../../legacy/auth";
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
      const list = Array.isArray(raw) ? raw : (raw?.studies || raw?.items || [raw]);
      const meEmail = me?.email || "googleUser";
      
      const formattedGroups = list.filter(s => s && s.id != null && s.name).map((s) => ({
        id: s.id,
        name: s.name,
        ownerEmail: s.ownerEmail || s.owner_email || meEmail,
        members: s.members || [{ email: meEmail }],
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
    const isOwner = group.ownerEmail === me?.email;
    const isMember = group.members?.some(m => m.email === me?.email);

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

  // 6. 링크로 참여
  const handleJoin = () => {
    const input = $("inviteInput");
    if (input) input.value = inviteCode;
    joinByLink();
    refreshGroups();
  };

  const handleLogout = () => {
    doLogout();
    navigate('/login');
  };

  return (
    <section id="groupListPage" className="page">
      <div className="topbar">
        <p id="userInfo" className="user"></p>
        <button id="logoutBtn" className="btn btn-ghost" onClick={handleLogout}>
          로그아웃
        </button>
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
                const isOwner = g.ownerEmail === me?.email;
                const isMember = g.members?.some(m => m.email === me?.email);

                return (
                  <li key={g.id} className="listItem" style={{ marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <div className="left">
                        <div style={{ fontWeight: 900, fontSize: '1.1rem' }}>{g.name}</div>
                        <div className="muted small" style={{ fontSize: '0.85rem', color: '#666' }}>
                          {isOwner ? "방장" : "멤버"} · 멤버 {g.members?.length || 0}명 · {isMember ? "참여됨" : "미참여"}
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