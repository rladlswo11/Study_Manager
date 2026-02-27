const API_BASE = "https://liveliest-plutocratically-jacqueline.ngrok-free.dev";
export { API_BASE };

function getToken() {
  return localStorage.getItem("accessToken"); // 너가 저장한 키
}

export function apiCreateInviteLink(studyId) {
  return apiFetch(`/studies/${studyId}/invites`, { method: "POST" });
}

export async function apiFetch(path, { method = "GET", body } = {}) {
  const headers = { 
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  };
  
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = API_BASE.replace(/\/$/, "") + path;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const ct = res.headers.get("content-type") || "";
    const data = ct.includes("application/json") ? await res.json() : await res.text();
    const msg = typeof data === "string" ? data : (data.detail ? JSON.stringify(data.detail) : JSON.stringify(data));
    throw new Error(msg || `API error (${res.status})`);
  }


  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

export function apiCreateStudy({ name, description, fine_per_absence }) {
  return apiFetch("/studies/", {
    method: "POST",
    body: { name, description, fine_per_absence },
  });
}

export function apiGetMyStudies() {
  return apiFetch("/studies/list", {
    method: "GET",
  });
}

export function apiDeleteStudy(studyId) {
  return apiFetch(`/studies/${encodeURIComponent(studyId)}/delete`, {
    method: "DELETE",
  });
}

