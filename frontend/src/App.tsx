import { Navigate, Route, Routes} from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import AppShell from "@/components/layout/AppShell";
import Login from "@/pages/Login";
import FirstAccess from "@/pages/FirstAccess";
import Dashboard from "@/pages/Dashboard";
import Labs from "@/pages/Labs";
import LabAgenda from "@/pages/LabAgenda";
import EquipmentPage from "@/pages/Equipment";
import Reservations from "@/pages/Reservations";
import Admin from "@/pages/Admin";

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/primeiro-acesso" element={<FirstAccess />} />
        <Route path="/cadastro" element={<Navigate to="/primeiro-acesso" replace />} />
        <Route element={<AppShell />}>
          <Route path="/painel" element={<Dashboard />} />
          <Route path="/laboratorios" element={<Labs />} />
          <Route path="/laboratorios/:labId/agenda" element={<LabAgenda />} />
          <Route path="/equipamentos" element={<EquipmentPage />} />
          <Route path="/reservas" element={<Reservations />} />
          <Route path="/admin" element={<Admin />} />
        </Route>
        <Route path="*" element={<Navigate to="/painel" replace />} />
      </Routes>
      <Toaster richColors />
    </>
  );
}
