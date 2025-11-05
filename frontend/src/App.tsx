import { Route, Routes, Navigate } from "react-router-dom";
import LoginPage from "./pages/Login";
import PollsPage from "./pages/Polls";
import ProtectedRoute from "./auth/ProtectedRoute";

/* Application routes */
// - /login is public.
// - /polls is protected and requires authentication.
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/polls" element={<PollsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/polls" replace />} />
    </Routes>
  );
}