import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../lib/auth";
import { useT } from "../lib/i18n";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { loading, token } = useAuth();
  const t = useT();
  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6fbf7] bg-[linear-gradient(rgba(15,23,42,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.045)_1px,transparent_1px)] bg-[length:72px_72px] px-6 py-10">
        <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center">
          <div className="rounded-lg border border-slate-200/80 bg-white/85 p-5 shadow-sm backdrop-blur">
            <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-emerald-100">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-emerald-500" />
            </div>
            <p className="text-base font-semibold text-slate-900">{t("auth.sessionChecking")}</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">{t("auth.sessionCheckingBody")}</p>
          </div>
        </div>
      </main>
    );
  }
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
