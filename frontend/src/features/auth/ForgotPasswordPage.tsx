import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { IconSpendMark } from "../../components/icons";
import { api, ApiError } from "../../lib/api";

type Step = "request" | "reset" | "done";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
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
        setError("If that email exists, a reset link has been sent.");
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not start password reset.");
    } finally {
      setBusy(false);
    }
  }

  async function submitReset() {
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: password });
      setStep("done");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not reset password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-[100dvh] place-items-center bg-canvas px-4">
      <div className="w-full max-w-sm rise">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 grid size-11 place-items-center rounded-lg bg-brand text-white">
            <IconSpendMark size={23} />
          </span>
          <h1 className="display text-3xl text-ink">Reset password</h1>
          <p className="mt-1 text-sm text-muted">
            {step === "request" && "Enter your email to start."}
            {step === "reset" && "Choose a new password."}
            {step === "done" && "You're all set."}
          </p>
        </div>

        <Card className="p-6">
          {step === "request" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
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
                {busy ? "Please wait..." : "Continue"}
              </Button>
            </div>
          )}

          {step === "reset" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="new-password">New password</Label>
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
                {busy ? "Saving..." : "Set new password"}
              </Button>
            </div>
          )}

          {step === "done" && (
            <div className="space-y-4 text-center">
              <p className="text-sm text-charcoal">
                Your password has been updated. You can sign in now.
              </p>
              <Button className="w-full" onClick={() => navigate("/login")}>
                Back to sign in
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
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
