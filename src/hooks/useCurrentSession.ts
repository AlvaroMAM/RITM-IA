import { useEffect, useState } from "react";
import { readSession, type Session } from "./useDemoSession";

export function useCurrentSession() {
  const [session, setSession] = useState<Session | null>(() => readSession());

  useEffect(() => {
    const reload = () => setSession(readSession());
    window.addEventListener("storage", reload);
    window.addEventListener("ritm-ia-session-changed", reload);
    return () => {
      window.removeEventListener("storage", reload);
      window.removeEventListener("ritm-ia-session-changed", reload);
    };
  }, []);

  return session;
}
