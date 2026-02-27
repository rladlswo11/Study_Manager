import { appState } from "./state.js";

export function getActiveGroup() {
  const gid = appState.activeGroupId;
  if (!gid) return null;
  return appState.groups.find((g) => g.id === gid) || null;
}
