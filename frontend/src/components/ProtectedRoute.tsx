import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../lib/auth";
import { useT } from "../lib/i18n";
import { Skeleton } from "./ui/skeleton";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { loading, token } = useAuth();
  const t = useT();
  if (loading) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-canvas px-4">
        <div className="w-full max-w-sm rounded-md border border-line bg-surface p-5" aria-busy="true">
          <Skeleton className="mb-4 h-1.5 w-1/2" />
          <p role="status" className="text-base font-semibold text-ink">
            {t("auth.sessionChecking")}
          </p>
          <p className="mt-1 text-sm text-muted">{t("auth.sessionCheckingBody")}</p>
        </div>
      </main>
    );
  }
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
