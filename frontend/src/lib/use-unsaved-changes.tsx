import { useEffect } from "react";
import { useBlocker } from "react-router-dom";

import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { useT } from "./i18n";

/**
 * Warns before unsaved changes are lost: the browser's own prompt on reload or
 * tab close, and a "Leave without saving?" dialog on in-app navigation.
 * Render the returned element once on the page.
 */
export function useUnsavedChangesGuard(when: boolean) {
  const t = useT();
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => when && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (!when) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [when]);

  return (
    <ConfirmDialog
      open={blocker.state === "blocked"}
      title={t("unsaved.leaveTitle")}
      confirmLabel={t("unsaved.leave")}
      cancelLabel={t("unsaved.stay")}
      onConfirm={() => blocker.proceed?.()}
      onClose={() => blocker.state === "blocked" && blocker.reset?.()}
    >
      <p>{t("unsaved.leaveBody")}</p>
    </ConfirmDialog>
  );
}

/** Dev-only: `?state=empty|error|loading` forces a list's state, so every state can be checked. */
export function forcedState(search: URLSearchParams): "empty" | "error" | "loading" | null {
  if (!import.meta.env.DEV) return null;
  const s = search.get("state");
  return s === "empty" || s === "error" || s === "loading" ? s : null;
}
