import { $ } from "./dom.js";

function openModal(title, bodyHtml) {
  $("modalTitle").textContent = title;
  $("modalBody").innerHTML = bodyHtml;
  $("modalOverlay").style.display = "flex";
}

function closeModal() {
  $("modalOverlay").style.display = "none";
}

export { openModal, closeModal };
