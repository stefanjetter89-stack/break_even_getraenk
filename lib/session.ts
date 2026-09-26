const TEAM_ID_KEY = "aida_team_id";
const MEMBER_ID_KEY = "aida_member_id";

export interface Session {
  teamId: string;
  memberId: string;
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const teamId = window.localStorage.getItem(TEAM_ID_KEY);
  const memberId = window.localStorage.getItem(MEMBER_ID_KEY);
  if (!teamId || !memberId) return null;
  return { teamId, memberId };
}

export function setSession(session: Session) {
  window.localStorage.setItem(TEAM_ID_KEY, session.teamId);
  window.localStorage.setItem(MEMBER_ID_KEY, session.memberId);
}

export function clearSession() {
  window.localStorage.removeItem(TEAM_ID_KEY);
  window.localStorage.removeItem(MEMBER_ID_KEY);
}
