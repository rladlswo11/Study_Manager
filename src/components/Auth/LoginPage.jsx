import React from "react";
import { API_BASE } from "../../api";

export default function LoginPage() {
  const handleGoogleLogin = () => {
    // 백엔드 구글 로그인 엔드포인트로 이동
    window.location.href = `${API_BASE}/auth/google/login`;
  };

  return (
    <section id="loginPage" className="page">
      <div className="card">
        <h2>로그인</h2>
        <div>
          <button id="googleLoginBtn" className="btn btn-primary" onClick={handleGoogleLogin}>
            Google로 로그인
          </button>
        </div>
      </div>
    </section>
  );
}