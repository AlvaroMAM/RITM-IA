import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { AccessibilityProvider } from "../hooks/useAccessibilitySettings";
import { useDemoSession } from "../hooks/useDemoSession";
import { AccessibilityPage } from "../pages/AccessibilityPage";
import { AssistantPage } from "../pages/AssistantPage";
import { ContentManagementPage } from "../pages/ContentManagementPage";
import { GeneratorPage } from "../pages/GeneratorPage";
import { GeneratedResourcesPage } from "../pages/GeneratedResourcesPage";
import { IndicatorsPage } from "../pages/IndicatorsPage";
import { LoginPage } from "../pages/LoginPage";
import { MaterialPage } from "../pages/MaterialPage";
import { ModulePage } from "../pages/ModulePage";
import { StudentDashboardPage } from "../pages/StudentDashboardPage";
import { TeacherCoursePage } from "../pages/TeacherCoursePage";
import { TeacherCoursesPage } from "../pages/TeacherCoursesPage";
import { TrackingPage } from "../pages/TrackingPage";
import { UnitPage } from "../pages/UnitPage";

function RoutedApp() {
  const { role, user, login, logout } = useDemoSession();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage onLogin={login} />} />

        {role && user ? (
          <Route element={<AppShell role={role} user={user} onLogout={logout} />}>
            <Route path="/docente/inicio" element={<TeacherCoursesPage />} />
            <Route path="/docente/asignaturas" element={<TeacherCoursesPage />} />
            <Route path="/docente/asignaturas/:asignaturaId" element={<TeacherCoursePage />} />
            <Route path="/docente/asignaturas/:asignaturaId/generador" element={<GeneratorPage />} />
            <Route path="/docente/contenidos" element={<ContentManagementPage />} />
            <Route path="/docente/modulos/:moduleId/contenidos" element={<ContentManagementPage />} />
            <Route path="/docente/generador" element={<AssistantPage />} />
            <Route path="/docente/asistente" element={<AssistantPage />} />
            <Route path="/docente/recursos" element={<GeneratedResourcesPage />} />
            <Route path="/docente/seguimiento" element={<TrackingPage />} />
            <Route path="/docente/indicadores" element={<IndicatorsPage />} />
            <Route path="/docente/unidades/:unidadId" element={<UnitPage />} />
            <Route path="/alumno" element={<StudentDashboardPage />} />
            <Route path="/alumno/asistente" element={<AssistantPage />} />
            <Route path="/alumno/modulos" element={<ModulePage />} />
            <Route path="/alumno/modulos/:moduloId" element={<ModulePage />} />
            <Route path="/alumno/materiales/:materialId" element={<MaterialPage />} />
            <Route path="/alumno/unidades/:unidadId" element={<UnitPage />} />
            <Route path="/alumno/unidades/:unidadId/asistente" element={<AssistantPage />} />
            <Route path="/accesibilidad" element={<AccessibilityPage />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}

        <Route path="*" element={<Navigate to={role === "teacher" ? "/docente/asignaturas" : role === "student" ? "/alumno" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export function App() {
  return (
    <AccessibilityProvider>
      <RoutedApp />
    </AccessibilityProvider>
  );
}
