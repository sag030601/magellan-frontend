import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isAssignedPrincipalUser } from "../lib/principalUser";

/** Hides a module from role `user` accounts that have a Principal assigned. */
export default function PrincipalModuleRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-slate-500 text-sm">Loading…</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (isAssignedPrincipalUser(user)) return <Navigate to="/admin" replace />;

  return children;
}
