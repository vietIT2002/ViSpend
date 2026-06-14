import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../lib/auth";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { loading, token } = useAuth();
  if (loading) {
    return <div className="p-6 text-sm text-slate-500">Loading</div>;
  }
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
