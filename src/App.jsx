import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import StudentDashboard from "./pages/StudentDashboard.jsx";
import AdminPanel from "./pages/AdminPanel.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import { getSession } from "./api.js";

function Protected({ role, children }) {
  const session = getSession();
  if (!session) return <Navigate to="/login" replace />;
  if (role && session.role !== role) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/dashboard" element={<Protected role="student"><StudentDashboard /></Protected>} />
      <Route path="/admin" element={<Protected role="admin"><AdminPanel /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
