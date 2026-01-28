const BASE_URL = "http://127.0.0.1:8000";

async function apiPost(path, data) {
  const res = await fetch(BASE_URL + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${path} 실패: ${res.status} ${text}`);
  }
  return await res.json();
}

// ✅ 과목(개인 계획) 추가: POST /subjects/{study_id}
async function apiCreateSubject(studyId, name) {
  return await apiPost(`/subjects/${studyId}`, { name });
}
