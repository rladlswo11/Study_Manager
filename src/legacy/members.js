import { $ } from "./dom.js";
import { appState } from "./state.js";
import { getActiveGroup } from "./selectors.js";

function renderMembers() {
  const g = getActiveGroup();
  if (!g) return;

  const me = appState.currentUser;
  const isOwner = g.ownerEmail === me.email;

  $("ownerControls").style.display = isOwner ? "flex" : "none";
  $("memberOwnerHint").style.display = isOwner ? "block" : "none";

  const ul = $("memberList");
  ul.innerHTML = "";
  g.members.forEach(m => {
    const li = document.createElement("li");
    li.className = "listItem";
    const badge = (m.email === g.ownerEmail) ? `<span class="badge">방장</span>` : `<span class="badge" style="background:#f1f5f9;color:#0f172a;">멤버</span>`;
    li.innerHTML = `
      <span>${m.name} <span class="muted small">(${m.email})</span></span>
      ${badge}
    `;
    ul.appendChild(li);
  });
}

export { renderMembers };
