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
  const [isLoaded, setIsLoaded] = useState(false);

  // 1. 초기 레거시 DOM 세팅
  useEffect(() => {
    init(); 
  }, []);

  // 2. 로그인 상태 및 데이터 로드 감지
  useEffect(() => {
    // [추가된 부분] URL에서 토큰 파싱 (백엔드에서 리다이렉트 해줬을 때)
    const searchParams = new URLSearchParams(location.search);
    const urlToken = searchParams.get("token") || searchParams.get("access_token");

    if (urlToken) {
      // 토큰을 찾았으면 저장
      localStorage.setItem("accessToken", urlToken);
      
      // 주소창에서 토큰 지우기 (깔끔하게 보이도록)
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // 저장된 토큰 가져오기
    const token = localStorage.getItem("accessToken");
    
    const loadData = async () => {
      if (token) {
        try {
          const studies = await apiGetMyStudies();
          // studies가 배열인지 확인 후 저장
          const studyList = Array.isArray(studies) ? studies : (studies.studies || []);
          
          appState.groups = studyList;
          saveState(appState);
        } catch (e) {
          console.error("스터디 목록 불러오기 실패:", e);
          // 토큰이 만료되었거나 잘못된 경우 로그인 페이지로 보낼 수도 있음
          if (e.message.includes("401") || e.message.includes("403")) {
             localStorage.removeItem("accessToken");
             navigate("/login");
          }
        }
      } else {
        // 토큰이 없고 현재 로그인 페이지도 아니면 튕겨냄
        if (location.pathname !== "/login") {
          navigate("/login");
        }
      }
      setIsLoaded(true);
    };

    loadData();
  }, [location.search, location.pathname, navigate]); // location.search 의존성 추가

  if (!isLoaded) return <div>Loading...</div>;

  return (
    <>
      {!location.pathname.startsWith("/group/") && <Header />}
      
      <main>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<GroupListPage />} />
          <Route path="/group/:groupId" element={<GroupDetailPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      
      <Modal />
    </>
  );
}