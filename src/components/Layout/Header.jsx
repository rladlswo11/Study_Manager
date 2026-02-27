import React from "react";
import { useNavigate } from "react-router-dom";

export default function Header() {
  const navigate = useNavigate();
  return (
    <header id="globalHeader">
      <h1 
        className="appTitle" 
        onClick={() => navigate("/")} 
        style={{ cursor: "pointer" }}
      >
        📚 스터디 관리 서비스
      </h1>
    </header>
  );
}