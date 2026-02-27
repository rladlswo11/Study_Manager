import React from "react";
import { closeModal } from "../../legacy/modal";

export default function Modal() {
  return (
    <div id="modalOverlay" className="modalOverlay" style={{ display: "none" }}>
      <div className="modal">
        <div className="rowBetween">
          <h3 id="modalTitle">알림</h3>
          <button id="modalCloseBtn" className="btn btn-ghost" onClick={closeModal}>
            닫기
          </button>
        </div>
        <div id="modalBody" className="muted"></div>
        <div className="modalActions">
          <button id="modalOkBtn" className="btn btn-primary" onClick={closeModal}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
}