import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

/* ProtectedRoute component */
// Protect routes by checking auth state.
// If the user is not authenticated, redirect to /login.
export default function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}