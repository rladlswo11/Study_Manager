// 기존 유지 (연동 전이라 사용하지 않아도 됨)
const API_BASE = "http://127.0.0.1:8000";

async function apiPost(path, body) {
  const res = await fetch(API_BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || "API error");
  }
  return res.json();
}

// 예시: 과목 생성 API(나중에 사용)
async function apiCreateSubject(payload) {
  return apiPost("/subjects", payload);
}
