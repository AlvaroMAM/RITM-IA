import { useCallback, useEffect, useState } from "react";
import { api, type ApiUser } from "../api/client";
import type { Role } from "../types";

export const SESSION_KEY = "ritm-ia-session";

export type Session = {
  role: Role;
  user: ApiUser;
};

export function readSession(): Session | null {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as Session;
    return parsed?.role === "teacher" || parsed?.role === "student" ? parsed : null;
  } catch {
    return null;
  }
}

export function useDemoSession() {
  const [session, setSession] = useState<Session | null>(() => readSession());
  const role = session?.role ?? null;

  useEffect(() => {
    if (session) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
    window.dispatchEvent(new Event("ritm-ia-session-changed"));
  }, [session]);

  const login = useCallback(async (username: string, password: string) => {
    const user = await api.login(username, password);
    setSession({ role: user.role, user });
    return user;
  }, []);

  const logout = useCallback(() => {
    setSession(null);
  }, []);

  return { role, user: session?.user ?? null, login, logout };
}
