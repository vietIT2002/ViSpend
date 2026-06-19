import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../lib/auth";
import { useT } from "../lib/i18n";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { loading, token } = useAuth();
  const t = useT();
  if (loading) {
    return <div className="p-6 text-sm text-slate-500">{t("common.loading")}</div>;
  }
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
