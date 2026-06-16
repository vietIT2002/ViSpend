import { lazy, Suspense } from "react";
import type { ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";

import { App } from "./App";
import { ProtectedRoute } from "./components/ProtectedRoute";

// Route-level code splitting: each page is its own chunk, loaded only when
// navigated to. This keeps heavy dependencies (e.g. Recharts on the dashboard)
// out of the initial bundle so the login page loads fast.
const LoginPage = lazy(() =>
  import("./features/auth/LoginPage").then((m) => ({ default: m.LoginPage })),
);
const RegisterPage = lazy(() =>
  import("./features/auth/RegisterPage").then((m) => ({ default: m.RegisterPage })),
);
const ForgotPasswordPage = lazy(() =>
  import("./features/auth/ForgotPasswordPage").then((m) => ({ default: m.ForgotPasswordPage })),
);
const DashboardPage = lazy(() =>
  import("./features/dashboard/DashboardPage").then((m) => ({ default: m.DashboardPage })),
);
const TransactionsPage = lazy(() =>
  import("./features/transactions/TransactionsPage").then((m) => ({ default: m.TransactionsPage })),
);
const CategoriesPage = lazy(() =>
  import("./features/categories/CategoriesPage").then((m) => ({ default: m.CategoriesPage })),
);
const SettingsPage = lazy(() =>
  import("./features/settings/SettingsPage").then((m) => ({ default: m.SettingsPage })),
);

function withSuspense(element: ReactNode) {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted">Loading…</div>}>{element}</Suspense>
  );
}

export const router = createBrowserRouter([
  { path: "/login", element: withSuspense(<LoginPage />) },
  { path: "/register", element: withSuspense(<RegisterPage />) },
  { path: "/forgot-password", element: withSuspense(<ForgotPasswordPage />) },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <App />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: withSuspense(<DashboardPage />) },
      { path: "transactions", element: withSuspense(<TransactionsPage />) },
      { path: "categories", element: withSuspense(<CategoriesPage />) },
      { path: "settings", element: withSuspense(<SettingsPage />) },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
