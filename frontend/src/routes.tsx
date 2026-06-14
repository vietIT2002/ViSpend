import { createBrowserRouter, Navigate } from "react-router-dom";

import { App } from "./App";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ForgotPasswordPage } from "./features/auth/ForgotPasswordPage";
import { LoginPage } from "./features/auth/LoginPage";
import { RegisterPage } from "./features/auth/RegisterPage";
import { CategoriesPage } from "./features/categories/CategoriesPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { TransactionsPage } from "./features/transactions/TransactionsPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <App />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "transactions", element: <TransactionsPage /> },
      { path: "categories", element: <CategoriesPage /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
