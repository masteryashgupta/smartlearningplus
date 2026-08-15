import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import StudentDashboard from "./pages/StudentDashboard.jsx";
import AdminPanel from "./pages/AdminPanel.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import VerifyEmail from "./pages/VerifyEmail.jsx";
import Disclaimer from "./pages/Disclaimer.jsx";
import Terms from "./pages/Terms.jsx";
import Privacy from "./pages/Privacy.jsx";
import PastePage from "./pages/PastePage.jsx";
import PasteView from "./pages/PasteView.jsx";
import { getSession } from "./api.js";

function AdminRoute() {
  const session = getSession();
  if (session && session.role === "admin") {
    return <AdminPanel />;
  }
  return <Login adminOnly={true} />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Home />} />
      <Route path="/admin" element={<AdminRoute />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/disclaimer" element={<Disclaimer />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/paste" element={<PastePage />} />
      <Route path="/:slug" element={<PasteView />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
