import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/** Requires login and `user.role === "admin"`. */
export default function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-slate-500 text-sm">Loading…</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/admin" replace />;

  return children;
}
