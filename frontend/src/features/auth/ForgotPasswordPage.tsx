import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { LanguageToggle } from "../../components/ui/language-toggle";
import { IconSpendMark } from "../../components/icons";
import { api } from "../../lib/api";
import { useErrorText, useT } from "../../lib/i18n";

type Step = "request" | "reset" | "done";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const t = useT();
  const errText = useErrorText();
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function requestReset() {
    setError(null);
    setBusy(true);
    try {
      // Dev: the backend returns the reset token directly (no email yet).
      // In production this token is emailed; the UI would open with it in the URL.
      const res = await api.post<{ detail: string; reset_token?: string }>(
        "/auth/forgot-password",
        { email },
      );
      if (res.reset_token) {
        setToken(res.reset_token);
        setStep("reset");
      } else {
        setError(t("forgot.emailSent"));
      }
    } catch (e) {
      setError(errText(e, "forgot.couldNotStart"));
    } finally {
      setBusy(false);
    }
  }

  async function submitReset() {
    setError(null);
    if (password.length < 6) {
      setError(t("forgot.passwordTooShort"));
      return;
    }
    setBusy(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: password });
      setStep("done");
    } catch (e) {
      setError(errText(e, "forgot.couldNotReset"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-[100dvh] place-items-center bg-canvas px-4">
      <div className="w-full max-w-sm rise">
        <div className="mb-3 flex justify-end">
          <LanguageToggle />
        </div>
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 grid size-11 place-items-center rounded-lg bg-brand text-white">
            <IconSpendMark size={23} />
          </span>
          <h1 className="display text-3xl text-ink">{t("forgot.title")}</h1>
          <p className="mt-1 text-sm text-muted">
            {step === "request" && t("forgot.requestHint")}
            {step === "reset" && t("forgot.resetHint")}
            {step === "done" && t("forgot.doneHint")}
          </p>
        </div>

        <Card className="p-6">
          {step === "request" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">{t("forgot.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && requestReset()}
                />
              </div>
              <Button className="w-full" disabled={busy || !email} onClick={requestReset}>
                {busy ? t("common.pleaseWait") : t("common.continue")}
              </Button>
            </div>
          )}

          {step === "reset" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="new-password">{t("forgot.newPassword")}</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitReset()}
                />
              </div>
              <Button className="w-full" disabled={busy} onClick={submitReset}>
                {busy ? t("common.saving") : t("forgot.setNewPassword")}
              </Button>
            </div>
          )}

          {step === "done" && (
            <div className="space-y-4 text-center">
              <p className="text-sm text-charcoal">{t("forgot.doneMessage")}</p>
              <Button className="w-full" onClick={() => navigate("/login")}>
                {t("forgot.backToSignIn")}
              </Button>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-md border border-pastel-red-ink/20 bg-pastel-red px-3 py-2 text-xs text-pastel-red-ink">
              {error}
            </p>
          )}
        </Card>

        <p className="mt-5 text-center text-sm text-muted">
          <Link className="font-medium text-ink underline underline-offset-4" to="/login">
            {t("forgot.backToSignIn")}
          </Link>
        </p>
      </div>
    </main>
  );
}
