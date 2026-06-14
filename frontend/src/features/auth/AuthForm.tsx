import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

import { IconSpendMark } from "../../components/icons";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { useAuth } from "../../lib/auth";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "At least 6 characters"),
});

type Form = z.infer<typeof schema>;

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const {
    register: field,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Form) {
    setError(null);
    try {
      if (mode === "login") {
        await login(values.email, values.password);
      } else {
        await register(values.email, values.password);
      }
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <main className="grid min-h-[100dvh] bg-canvas px-4 py-6 sm:px-6 lg:grid-cols-[1fr_460px] lg:gap-8 lg:p-8">
      <section className="relative hidden overflow-hidden rounded-xl border border-line bg-surface p-8 lg:grid lg:grid-rows-[auto_1fr_auto]">
        <div>
          <span className="grid size-11 place-items-center rounded-lg bg-brand text-white">
            <IconSpendMark size={23} />
          </span>
          <h1 className="display mt-8 max-w-xl text-5xl text-ink">Personal finance without the noise.</h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-muted">
            Vispend helps you record daily cash flow, review category spend, and understand month-to-month changes.
          </p>
        </div>

        <div className="my-10 grid content-center">
          <div className="max-w-3xl rounded-xl border border-line bg-canvas p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_0.85fr]">
              <div className="rounded-lg border border-line bg-surface p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">This month</p>
                    <p className="nums mt-2 text-3xl font-medium text-ink">8.450.000 VND</p>
                  </div>
                  <span className="rounded-md bg-brand-soft px-2 py-1 text-xs font-medium text-brand-dark">+12%</span>
                </div>
                <div className="mt-6 flex h-40 items-end gap-3 border-b border-line pb-2">
                  {[
                    ["Food", 66, "#9f2f2d"],
                    ["Bills", 42, "#956400"],
                    ["Salary", 92, "#3cb371"],
                    ["Shopping", 55, "#1f6c9f"],
                    ["Net", 74, "#1a1a18"],
                  ].map(([label, height, color]) => (
                    <div key={label} className="flex flex-1 flex-col items-center gap-2">
                      <div
                        className="w-full rounded-t-md"
                        style={{ height: `${height}%`, backgroundColor: String(color) }}
                      />
                      <span className="text-[10px] text-muted">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-lg border border-line bg-surface p-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Top categories</p>
                  <div className="mt-4 space-y-3">
                    {[
                      ["Food & Drink", "2.100.000", "w-[82%]", "bg-expense"],
                      ["Transport", "640.000", "w-[34%]", "bg-brand"],
                      ["Bills", "1.250.000", "w-[54%]", "bg-warn"],
                    ].map(([name, amount, width, color]) => (
                      <div key={name}>
                        <div className="flex justify-between gap-2 text-xs">
                          <span className="truncate text-ink">{name}</span>
                          <span className="nums text-muted">{amount}</span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-black/[0.06]">
                          <div className={`h-full rounded-full ${width} ${color}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-line bg-surface p-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Recent entry</p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-ink">Lunch with team</p>
                      <p className="text-xs text-muted">Food & Drink</p>
                    </div>
                    <p className="nums text-sm font-medium text-expense">-120.000</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid max-w-xl grid-cols-3 gap-3">
          {[
            ["Fast entry", "< 10 sec"],
            ["Default currency", "VND"],
            ["Private data", "JWT auth"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-line bg-canvas p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">{label}</p>
              <p className="nums mt-2 text-lg font-medium text-ink">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid place-items-center">
        <div className="w-full max-w-sm rise">
          <div className="mb-8 text-center lg:text-left">
            <span className="mx-auto mb-4 grid size-11 place-items-center rounded-lg bg-brand text-white lg:mx-0">
              <IconSpendMark size={23} />
            </span>
            <h1 className="display text-3xl text-ink">
              {mode === "login" ? "Welcome back" : "Start tracking"}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {mode === "login"
                ? "Sign in to see where your money goes."
                : "Create an account to record your spending."}
            </p>
          </div>

          <Card className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" {...field("email")} />
                {errors.email && (
                  <p className="mt-1.5 text-xs text-pastel-red-ink">{errors.email.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  {...field("password")}
                />
                {errors.password && (
                  <p className="mt-1.5 text-xs text-pastel-red-ink">{errors.password.message}</p>
                )}
                {mode === "login" && (
                  <div className="mt-1.5 text-right">
                    <Link
                      to="/forgot-password"
                      className="text-xs text-muted underline-offset-4 hover:text-ink hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                )}
              </div>
              {error && (
                <div className="rounded-md border border-pastel-red-ink/20 bg-pastel-red px-3 py-2 text-xs text-pastel-red-ink">
                  {error}
                </div>
              )}
              <Button className="w-full" disabled={isSubmitting}>
                {isSubmitting
                  ? "Please wait..."
                  : mode === "login"
                    ? "Sign in"
                    : "Create account"}
              </Button>
            </form>
          </Card>

          <p className="mt-5 text-center text-sm text-muted">
            {mode === "login" ? (
              <>
                New to Vispend?{" "}
                <Link className="font-medium text-ink underline underline-offset-4" to="/register">
                  Create an account
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link className="font-medium text-ink underline underline-offset-4" to="/login">
                  Sign in
                </Link>
              </>
            )}
          </p>
        </div>
      </section>
    </main>
  );
}
