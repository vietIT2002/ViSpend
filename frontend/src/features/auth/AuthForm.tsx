import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

import {
  IconCash,
  IconChart,
  IconKey,
  IconRepeat,
  IconSparkles,
  IconSpendMark,
} from "../../components/icons";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { cn } from "../../lib/utils";
import { useAuth } from "../../lib/auth";
import { GoogleSignInButton } from "./GoogleSignInButton";

const schema = z.object({
  username: z
    .string()
    .regex(/^[a-z0-9]{3,20}$/, "3-20 characters, lowercase letters and digits only"),
  password: z
    .string()
    .refine(
      (v) =>
        v.length >= 8 &&
        /[A-Z]/.test(v) &&
        /[a-z]/.test(v) &&
        /\d/.test(v) &&
        /[^A-Za-z0-9]/.test(v),
      "At least 8 characters with an uppercase letter, a lowercase letter, a number, and a special character",
    ),
});

type Form = z.infer<typeof schema>;
type AuthMode = "login" | "register";

const categoryRows = [
  ["Food & Drink", "2,100,000", "#b94d47"],
  ["Transport", "640,000", "#5fa56b"],
  ["Bills", "1,250,000", "#8bb56b"],
  ["Shopping", "1,000,000", "#e1a93f"],
  ["Others", "3,460,000", "#7e74c9"],
] as const;

const recentRows = [
  ["Lunch with team", "Food & Drink", "-120,000", "Today", "text-expense"],
  ["Grab ride", "Transport", "-45,000", "Today", "text-expense"],
  ["Electricity bill", "Bills", "-320,000", "May 15", "text-expense"],
  ["Salary", "Income", "+8,800,000", "May 15", "text-brand-dark"],
] as const;

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-4">
      <span
        className={cn(
          "grid shrink-0 place-items-center rounded-lg bg-brand text-white shadow-[0_10px_24px_rgb(60_179_113/0.18)]",
          compact ? "size-10" : "size-12",
        )}
      >
        <IconSpendMark size={compact ? 21 : 23} />
      </span>
      <span className={cn("font-semibold text-ink", compact ? "text-xl" : "text-2xl")}>ViSpend</span>
    </div>
  );
}

function FeatureItem({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof IconChart;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-dark">
        <Icon size={18} />
      </span>
      <div>
        <p className="font-semibold leading-5 text-ink">{title}</p>
        <p className="mt-1 max-w-48 text-sm leading-5 text-muted">{body}</p>
      </div>
    </div>
  );
}

function OverviewPreview() {
  return (
    <div className="w-full max-w-[540px] rounded-lg border border-line bg-white/88 p-3 shadow-[0_18px_52px_rgb(47_52_55/0.10)] backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-ink">Overview</h2>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-2 rounded-md border border-line bg-surface px-2.5 text-xs font-semibold text-charcoal"
        >
          This month
          <span className="text-muted">v</span>
        </button>
      </div>

      <div className="rounded-lg border border-line bg-surface p-3">
        <div className="grid gap-3 md:grid-cols-[0.9fr_1fr] md:items-center">
          <div>
            <p className="text-xs font-semibold text-charcoal">Total balance</p>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <p className="nums text-2xl font-semibold leading-none text-ink">8,450,000</p>
              <p className="nums text-sm font-semibold text-ink">VND</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-brand-soft px-2 py-1 text-xs font-semibold text-brand-dark">+12%</span>
            <svg viewBox="0 0 220 72" className="h-16 min-w-0 flex-1" aria-hidden="true">
              <defs>
                <linearGradient id="balance-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#3cb371" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#3cb371" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M2 56 C22 44 25 22 47 31 C64 38 65 53 83 43 C103 31 106 8 126 15 C145 21 145 44 164 36 C184 28 188 10 207 18 C216 22 219 23 222 22 L222 72 L2 72 Z"
                fill="url(#balance-fill)"
              />
              <path
                d="M2 56 C22 44 25 22 47 31 C64 38 65 53 83 43 C103 31 106 8 126 15 C145 21 145 44 164 36 C184 28 188 10 207 18 C216 22 219 23 222 22"
                fill="none"
                stroke="#4d9b61"
                strokeLinecap="round"
                strokeWidth="4"
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_0.92fr]">
        <div className="rounded-lg border border-line bg-surface p-3">
          <p className="text-xs font-semibold text-charcoal">Spending by category</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[104px_1fr] sm:items-center">
            <div className="relative mx-auto grid size-24 place-items-center rounded-full bg-[conic-gradient(#b94d47_0_25%,#e1a93f_25%_42%,#5fa56b_42%_62%,#6d89d8_62%_78%,#7e74c9_78%_100%)]">
              <div className="grid size-16 place-items-center rounded-full bg-white text-center shadow-[inset_0_0_0_1px_rgb(234_234_234)]">
                <p className="nums text-xs font-semibold leading-3 text-ink">
                  8,450,000
                  <br />
                  VND
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              {categoryRows.map(([name, amount, color]) => (
                <div key={name} className="grid grid-cols-[minmax(0,1fr)_66px] items-center gap-2">
                  <span className="flex min-w-0 items-center gap-2 text-xs text-charcoal">
                    <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
                    <span className="truncate">{name}</span>
                  </span>
                  <span className="nums text-right text-[11px] text-muted">{amount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-line bg-surface p-3">
          <p className="text-xs font-semibold text-charcoal">Recent transactions</p>
          <div className="mt-3 space-y-2">
            {recentRows.map(([title, category, amount, date, tone]) => (
              <div key={title} className="grid grid-cols-[24px_minmax(0,1fr)_68px] items-center gap-2">
                <span className="grid size-6 place-items-center rounded-full bg-brand-soft text-brand-dark">
                  <IconCash size={12} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-ink">{title}</span>
                  <span className="block truncate text-[11px] text-muted">{category}</span>
                </span>
                <span className="text-right">
                  <span className={cn("nums block text-xs font-semibold", tone)}>{amount}</span>
                  <span className="block text-[10px] text-muted">{date}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function HealthStrip() {
  return (
    <div className="grid gap-4 rounded-lg bg-[#123d2a] p-4 text-white shadow-[0_18px_52px_rgb(18_61_42/0.18)] md:grid-cols-[1.05fr_0.8fr_1fr_1fr] md:divide-x md:divide-white/12">
      <div className="flex gap-3 md:pr-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-brand-dark">
          <IconSparkles size={20} />
        </span>
        <div>
          <p className="text-xs text-white/78">Financial health</p>
          <p className="mt-1 text-xl font-semibold text-[#8bd79e]">Good</p>
          <p className="mt-1 text-xs leading-4 text-white/70">You're on the right track. Keep going.</p>
        </div>
      </div>
      <div className="md:px-4">
        <p className="text-xs text-white/78">Monthly savings rate</p>
        <p className="nums mt-2 text-2xl font-semibold">28%</p>
        <p className="mt-1 text-xs text-[#8bd79e]">Good</p>
      </div>
      <div className="md:px-4">
        <p className="text-xs text-white/78">Average daily spend</p>
        <p className="nums mt-2 text-2xl font-semibold">281,667 <span className="text-sm">VND</span></p>
        <p className="mt-1 text-xs text-[#8bd79e]">-8% vs last month</p>
      </div>
      <div className="md:pl-4">
        <p className="text-xs text-white/78">Top spending category</p>
        <p className="mt-2 text-xl font-semibold">Food & Drink</p>
        <p className="mt-1 text-xs text-[#e6c45f]">25% of total</p>
      </div>
    </div>
  );
}

function BottomBenefit({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof IconChart;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-dark">
        <Icon size={19} />
      </span>
      <div>
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="mt-1 text-xs leading-4 text-muted">{body}</p>
      </div>
    </div>
  );
}

export function AuthForm({ mode }: { mode: AuthMode }) {
  const navigate = useNavigate();
  const { login, loginWithGoogle, register } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register: field,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const isLogin = mode === "login";

  async function onSubmit(values: Form) {
    setError(null);
    try {
      if (isLogin) {
        await login(values.username, values.password);
      } else {
        await register(values.username, values.password);
      }
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  const handleGoogleCredential = useCallback(
    async (credential: string) => {
      setError(null);
      setGoogleBusy(true);
      try {
        await loginWithGoogle(credential);
        navigate("/");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not sign in with Google.");
      } finally {
        setGoogleBusy(false);
      }
    },
    [loginWithGoogle, navigate],
  );

  const handleGoogleError = useCallback((message: string) => {
    setError(message);
  }, []);

  return (
    <main className="min-h-[100dvh] bg-[#f7f9f7] p-2 text-charcoal">
      <div className="grid min-h-[calc(100dvh-1rem)] gap-3 xl:grid-cols-[minmax(0,1fr)_440px] 2xl:grid-cols-[minmax(0,1fr)_480px]">
        <section className="relative hidden overflow-hidden rounded-lg border border-line bg-white p-6 xl:block 2xl:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_84%_10%,rgb(255_224_120/0.34),transparent_22rem),radial-gradient(circle_at_86%_22%,rgb(60_179_113/0.22),transparent_33rem),radial-gradient(circle_at_2%_96%,rgb(60_179_113/0.16),transparent_26rem)]" />
          <div className="relative z-10 grid min-h-full grid-rows-[auto_minmax(0,1fr)_auto]">
            <BrandMark />

            <div className="mt-6 grid min-h-0 gap-6 xl:grid-cols-[310px_minmax(0,1fr)] xl:items-center 2xl:grid-cols-[350px_minmax(0,1fr)]">
              <div>
                <h1 className="display max-w-2xl text-4xl leading-[1.05] text-ink 2xl:text-5xl">
                  Understand your money.
                  <span className="block text-brand-dark">Spend smarter.</span>
                </h1>
                <p className="mt-4 max-w-sm text-base leading-7 text-muted">
                  Track, analyze and take control of your finances all in one beautiful dashboard.
                </p>

                <div className="mt-7 space-y-4 2xl:space-y-5">
                  <FeatureItem
                    icon={IconChart}
                    title="Track everything"
                    body="See where your money goes, in real time."
                  />
                  <FeatureItem
                    icon={IconSparkles}
                    title="Smart insights"
                    body="Understand your habits and find opportunities."
                  />
                  <FeatureItem
                    icon={IconRepeat}
                    title="Better decisions"
                    body="Set goals and build a stronger future."
                  />
                </div>
              </div>

              <div className="min-w-0">
                <OverviewPreview />
              </div>
            </div>

            <div className="relative z-10 mt-5 space-y-4 2xl:mt-6">
              <HealthStrip />
              <div className="grid gap-4 rounded-lg border border-line bg-white/86 p-4 shadow-[0_18px_50px_rgb(47_52_55/0.06)] md:grid-cols-3">
                <BottomBenefit icon={IconKey} title="Your data is secure" body="Bank-level encryption to protect your privacy." />
                <BottomBenefit icon={IconRepeat} title="Real-time syncing" body="Always up-to-date across all your devices." />
                <BottomBenefit icon={IconChart} title="Export anytime" body="Download your data whenever you need." />
              </div>
            </div>
          </div>
        </section>

        <section className="grid rounded-lg border border-line bg-white px-5 py-6 sm:px-8 xl:px-10">
          <div className="mx-auto flex w-full max-w-[390px] flex-col justify-center">
            <BrandMark compact />

            <div className="mt-10">
              <h1 className="display text-4xl text-ink">{isLogin ? "Welcome back" : "Create account"}</h1>
              <p className="mt-3 text-base text-muted">
                {isLogin ? "Sign in to continue to your account" : "Create your ViSpend account"}
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
              <div>
                <Label htmlFor="username" className="mb-3 text-base font-medium normal-case tracking-normal text-ink">
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  autoComplete="username"
                  placeholder="Enter your username"
                  className="h-[52px] rounded-lg px-5 text-base"
                  {...field("username")}
                />
                {errors.username && <p className="mt-2 text-sm text-pastel-red-ink">{errors.username.message}</p>}
              </div>

              <div>
                <Label htmlFor="password" className="mb-3 text-base font-medium normal-case tracking-normal text-ink">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    placeholder="Enter your password"
                    className="h-[52px] rounded-lg px-5 pr-12 text-base"
                    {...field("password")}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-4 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted transition-colors hover:bg-black/[0.04] hover:text-ink"
                  >
                    {showPassword ? <EyeOff size={19} strokeWidth={1.8} /> : <Eye size={19} strokeWidth={1.8} />}
                  </button>
                </div>
                {errors.password && <p className="mt-2 text-sm text-pastel-red-ink">{errors.password.message}</p>}
                {isLogin && (
                  <div className="mt-4 text-right">
                    <Link to="/forgot-password" className="text-base font-medium text-brand-dark hover:text-ink">
                      Forgot password?
                    </Link>
                  </div>
                )}
              </div>

              {error && (
                <div className="rounded-lg border border-pastel-red-ink/20 bg-pastel-red px-4 py-3 text-sm text-pastel-red-ink">
                  {error}
                </div>
              )}

              <Button className="h-[52px] w-full rounded-lg text-base" disabled={isSubmitting}>
                {isSubmitting ? "Please wait..." : isLogin ? "Sign in" : "Create account"}
              </Button>
            </form>

            <div className="mt-8">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                <span className="h-px bg-line" />
                <span className="text-sm text-muted">{isLogin ? "or continue with" : "or sign up with"}</span>
                <span className="h-px bg-line" />
              </div>

              <div className="mt-5">
                <GoogleSignInButton
                  disabled={googleBusy || isSubmitting}
                  onCredential={handleGoogleCredential}
                  onError={handleGoogleError}
                />
              </div>
            </div>

            <p className="mt-8 text-center text-base text-muted">
              {isLogin ? (
                <>
                  New to ViSpend?{" "}
                  <Link className="font-medium text-brand-dark hover:text-ink" to="/register">
                    Create an account
                  </Link>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <Link className="font-medium text-brand-dark hover:text-ink" to="/login">
                    Sign in
                  </Link>
                </>
              )}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
