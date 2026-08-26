import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import AdminPanel from "./pages/AdminPanel.jsx";
import Disclaimer from "./pages/Disclaimer.jsx";
import Terms from "./pages/Terms.jsx";
import Privacy from "./pages/Privacy.jsx";
import PastePage from "./pages/PastePage.jsx";
import PasteView from "./pages/PasteView.jsx";
import ToolsPage from "./pages/ToolsPage.jsx";
import WheelPage from "./pages/WheelPage.jsx";
import { getSession } from "./api.js";

function AdminRoute() {
  const session = getSession();
  if (session && session.role === "admin") {
    return <AdminPanel />;
  }
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/admin" element={<AdminRoute />} />
      <Route path="/disclaimer" element={<Disclaimer />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/tools" element={<ToolsPage />} />
      <Route path="/paste" element={<PastePage />} />
      <Route path="/wheel" element={<WheelPage />} />
      <Route path="/wheel/:id" element={<WheelPage />} />
      
      {/* Legacy redirects */}
      <Route path="/dashboard" element={<Navigate to="/" replace />} />
      <Route path="/verify-email" element={<Navigate to="/" replace />} />
      <Route path="/reset-password" element={<Navigate to="/" replace />} />
      <Route path="/index.html" element={<Navigate to="/" replace />} />
      
      {/* Dynamic paste slug view */}
      <Route path="/:slug" element={<PasteView />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
