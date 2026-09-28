import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { resetAuthScopedClientState } from "../lib/resetAuthScopedClientState";

function identityKey(user) {
  if (!user) return "";
  const role = String(user.role || "").trim().toLowerCase();
  const owner = user.owner_id != null && user.owner_id !== "" ? String(user.owner_id) : "";
  return `${user.id}:${role}:${owner}`;
}

/**
 * Clears session-sensitive React Query data and in-memory report/list filters when the
 * authenticated user identity changes (logout or a different account logs in).
 */
export function useAuthScopedCacheReset() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const prevKeyRef = useRef(undefined);

  useEffect(() => {
    if (loading) return;
    const key = identityKey(user);
    if (prevKeyRef.current !== undefined && prevKeyRef.current !== key) {
      resetAuthScopedClientState(queryClient);
    }
    prevKeyRef.current = key;
  }, [user, loading, queryClient]);
}
