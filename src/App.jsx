import React, { useEffect, useState } from "react";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import "./App.css";

// Legacy 연결
import { init } from "./script"; 
import { apiGetMyStudies } from "./api";
import { appState, saveState } from "./legacy/state.js";

// Components
import Header from "./components/Layout/Header";
import LoginPage from "./components/Auth/LoginPage";
import GroupListPage from "./components/Study/GroupListPage";
import GroupDetailPage from "./components/Study/GroupDetailPage";
import Modal from "./components/Common/Modal";

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoaded, setIsLoaded] = useState(false); // 로딩 깜빡임 방지용

  // 1. 초기 레거시 DOM 세팅
  useEffect(() => {
    init(); 
  }, []);

  // 2. 로그인 상태 및 데이터 로드 감지
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    
    const loadData = async () => {
      if (token) {
        try {
          const studies = await apiGetMyStudies();
          appState.groups = studies;
          saveState(appState);
        } catch (e) {
          console.error("스터디 목록 불러오기 실패:", e);
        }
      } else {
        // 토큰이 없고 현재 로그인 페이지도 아니면 튕겨냄
        if (location.pathname !== "/login") {
          navigate("/login");
        }
      }
      setIsLoaded(true); // 데이터가 다 불러와지면 화면 표시
    };

    loadData();
  }, [location.pathname, navigate]);

  if (!isLoaded) return <div>Loading...</div>; // 로딩 처리

  return (
    <>
      {/* 상세 페이지가 아닐 때만 헤더 표시 */}
      {!location.pathname.startsWith("/group/") && <Header />}
      
      <main>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<GroupListPage />} />
          <Route path="/group/:groupId" element={<GroupDetailPage />} />
          {/* 알 수 없는 주소는 무조건 홈으로 */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      
      <Modal />
    </>
  );
}