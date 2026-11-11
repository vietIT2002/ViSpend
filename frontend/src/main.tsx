import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import { ToastProvider } from "./components/ui/toast";
import { ApiWarmup } from "./lib/ApiWarmup";
import { AuthProvider } from "./lib/auth";
import { LanguageProvider } from "./lib/i18n";
import { queryClient, QueryProvider } from "./lib/queryClient";
import { router } from "./routes";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryProvider client={queryClient}>
      <ApiWarmup />
      <AuthProvider>
        <LanguageProvider>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </LanguageProvider>
      </AuthProvider>
    </QueryProvider>
  </StrictMode>,
);
