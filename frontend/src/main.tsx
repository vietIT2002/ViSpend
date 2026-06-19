import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import { AuthProvider } from "./lib/auth";
import { LanguageProvider } from "./lib/i18n";
import { queryClient, QueryProvider } from "./lib/queryClient";
import { router } from "./routes";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
          <RouterProvider router={router} />
        </LanguageProvider>
      </AuthProvider>
    </QueryProvider>
  </StrictMode>,
);
