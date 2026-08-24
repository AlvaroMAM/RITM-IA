import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import type { ApiUser } from "../../api/client";
import type { Role } from "../../types";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { MobileNavigation } from "./MobileNavigation";
import { Icon } from "../ui/Icon";

export function AppShell({ role, user, onLogout }: { role: Role; user: ApiUser; onLogout: () => void }) {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("ritm-ia-sidebar-collapsed") === "true");

  useEffect(() => {
    localStorage.setItem("ritm-ia-sidebar-collapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const handleLogout = () => {
    onLogout();
    navigate("/login");
  };

  return (
    <div className="route-shell lg:h-screen lg:overflow-hidden">
      <Sidebar role={role} user={user} onLogout={handleLogout} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((current) => !current)} />
      {sidebarCollapsed ? (
        <button
          className="button-secondary fixed left-4 top-2 z-50 hidden h-12 w-12 rounded-full p-0 shadow-soft lg:inline-flex"
          type="button"
          aria-label="Mostrar menu lateral"
          onClick={() => setSidebarCollapsed(false)}
        >
          <Icon name="menu" />
        </button>
      ) : null}
      <div
        className={`min-h-screen transition-[padding] duration-200 lg:h-screen lg:overflow-hidden ${
          sidebarCollapsed ? "lg:pl-0" : "lg:pl-sidebar"
        }`}
      >
        <TopBar role={role} user={user} sidebarCollapsed={sidebarCollapsed} />
        <div className="lg:h-[calc(100vh-4rem)] lg:overflow-y-auto">
          <main className="mx-auto w-full max-w-[1800px] px-4 py-6 pb-24 md:px-8 lg:pb-10">
            <Outlet context={{ role, user }} />
          </main>
        </div>
        <MobileNavigation role={role} />
      </div>
    </div>
  );
}
