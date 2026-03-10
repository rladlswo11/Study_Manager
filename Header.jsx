import React from "react";
import { useNavigate } from "react-router-dom";

export default function Header() {
  const navigate = useNavigate();

  const handleLogout = () => {
    // 1. 토큰 삭제
    localStorage.removeItem("accessToken");
    
    // 2. 로그인 페이지로 이동
    navigate("/login");
    
    // 3. 상태 초기화를 위해 페이지 새로고침
    window.location.reload();
  };

  return (
    <header id="globalHeader" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 20px" }}>
      <h1 
        className="appTitle" 
        onClick={() => navigate("/")} 
        style={{ cursor: "pointer", margin: 0 }}
      >
        📚 스터디 관리 서비스
      </h1>

      {/* 기존에 존재하던 로그아웃 버튼의 위치 */}
      <div className="user-menu">
        <button 
          className="btn btn-ghost" // 기존에 쓰던 클래스명이 있다면 유지하세요
          onClick={handleLogout}
          style={{
            cursor: "pointer",
            padding: "5px 10px",
            fontSize: "14px"
          }}
        >
          로그아웃
        </button>
      </div>
    </header>
  );
}