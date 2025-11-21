import { Route, Routes, Navigate } from "react-router-dom";
import ProtectedRoute from "./auth/ProtectedRoute";

import LoginPage from "./pages/Login";
import PollsPage from "./pages/Polls";
import PollDetailPage from "./pages/PollDetail";
import PollDetailNewPage from "./pages/PollDetailNew";
import PollAddPage from "./pages/PollAdd";

/* Application routes */
// - /login is public.
// - All other routes are protected and requires authentication.
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/polls" element={<PollsPage />} />
        <Route path="/polls/:id" element={<PollDetailPage />} />
        <Route path="/polls-new/:id" element={<PollDetailNewPage />} />
        <Route path="/polls/new" element={<PollAddPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/polls" replace />} />
    </Routes>
  );
}
