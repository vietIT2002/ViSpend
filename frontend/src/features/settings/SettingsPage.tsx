import { zodResolver } from "@hookform/resolvers/zod";
import { AtSign, Check, Eye, EyeOff, Lock, ShieldCheck, UserRound } from "lucide-react";
import { useState, type CSSProperties, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { cn } from "../../lib/utils";

const strongPassword = (v: string) =>
  v.length >= 8 &&
  /[A-Z]/.test(v) &&
  /[a-z]/.test(v) &&
  /\d/.test(v) &&
  /[^A-Za-z0-9]/.test(v);

const profileSchema = z.object({
  username: z
    .string()
    .regex(/^[a-z0-9]{3,20}$/, "3-20 characters, lowercase letters and digits only"),
  email: z.union([z.string().email("Enter a valid email address"), z.literal("")]),
});
type ProfileForm = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    current_password: z.string().min(1, "Enter your current password"),
    new_password: z.string().refine(strongPassword, "Does not meet the requirements below"),
    confirm: z.string(),
  })
  .refine((d) => d.new_password === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });
type PasswordForm = z.infer<typeof passwordSchema>;

const rise = (i: number) => ({ "--i": i }) as CSSProperties;

type Notice = { tone: "ok" | "error"; text: string } | null;

function NoticeBar({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return (
    <p
      className={cn(
        "rounded-md px-3.5 py-2.5 text-sm",
        notice.tone === "ok"
          ? "bg-brand-soft text-brand-dark"
          : "bg-pastel-red text-pastel-red-ink",
      )}
    >
      {notice.text}
    </p>
  );
}

function SectionHead({
  icon: Icon,
  title,
  hint,
}: {
  icon: typeof UserRound;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-dark">
        <Icon size={18} strokeWidth={2} />
      </span>
      <div>
        <h2 className="font-medium text-ink">{title}</h2>
        <p className="mt-0.5 text-sm text-muted">{hint}</p>
      </div>
    </div>
  );
}

function IField({
  id,
  label,
  icon: Icon,
  error,
  trailing,
  ...props
}: {
  id: string;
  label: string;
  icon: typeof UserRound;
  error?: string;
  trailing?: ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Icon
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <Input id={id} className={cn("pl-9", trailing && "pr-10")} {...props} />
        {trailing}
      </div>
      {error && <p className="mt-1 text-xs text-expense">{error}</p>}
    </div>
  );
}

function EyeToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? "Hide password" : "Show password"}
      className="absolute right-2.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted transition-colors hover:bg-black/[0.04] hover:text-ink"
    >
      {shown ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );
}

function AccountSummary() {
  const { user } = useAuth();
  const initial = (user?.username ?? user?.email ?? "?").charAt(0).toUpperCase();
  return (
    <Card className="rise p-5" style={rise(0)}>
      <div className="flex flex-wrap items-center gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-brand text-2xl font-semibold text-white">
          {initial}
        </span>
        <div className="min-w-0">
          <p className="display truncate text-2xl text-ink">{user?.username ?? "Your account"}</p>
          <p className="nums truncate text-sm text-muted">{user?.email ?? "No email linked"}</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Badge tone={user?.is_verified ? "green" : "neutral"}>
            {user?.is_verified ? "Verified" : "Unverified"}
          </Badge>
          <Badge tone={user?.email ? "blue" : "neutral"}>{user?.email ? "Email linked" : "No email"}</Badge>
        </div>
      </div>
    </Card>
  );
}

function ProfileCard() {
  const { user, refreshUser } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: { username: user?.username ?? "", email: user?.email ?? "" },
  });
  const [notice, setNotice] = useState<Notice>(null);

  async function onSubmit(data: ProfileForm) {
    setNotice(null);
    try {
      await api.patch("/auth/me", { username: data.username, email: data.email ? data.email : null });
      await refreshUser();
      setNotice({ tone: "ok", text: "Profile updated." });
    } catch (err) {
      setNotice({ tone: "error", text: err instanceof ApiError ? err.message : "Could not update profile." });
    }
  }

  return (
    <Card className="rise space-y-5 p-5 sm:p-6" style={rise(1)}>
      <SectionHead icon={UserRound} title="Personal information" hint="Update your username and contact email." />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <IField
          id="username"
          label="Username"
          icon={UserRound}
          autoComplete="username"
          error={errors.username?.message}
          {...register("username")}
        />
        <IField
          id="email"
          label="Email (optional)"
          icon={AtSign}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email")}
        />
        <p className="-mt-2 text-xs text-muted">Used for Google sign-in and password reset.</p>
        <NoticeBar notice={notice} />
        <div className="flex justify-end">
          <Button disabled={isSubmitting}>
            <Check size={16} /> {isSubmitting ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function PasswordCard() {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });
  const [notice, setNotice] = useState<Notice>(null);
  const [show, setShow] = useState({ current: false, next: false, confirm: false });

  const newPw = watch("new_password") ?? "";
  const reqs = [
    { ok: newPw.length >= 8, label: "8+ characters" },
    { ok: /[A-Z]/.test(newPw) && /[a-z]/.test(newPw), label: "Upper & lowercase" },
    { ok: /\d/.test(newPw), label: "A number" },
    { ok: /[^A-Za-z0-9]/.test(newPw), label: "A special character" },
  ];

  async function onSubmit(data: PasswordForm) {
    setNotice(null);
    try {
      await api.post("/auth/change-password", {
        current_password: data.current_password,
        new_password: data.new_password,
      });
      reset({ current_password: "", new_password: "", confirm: "" });
      setNotice({ tone: "ok", text: "Password updated." });
    } catch (err) {
      setNotice({ tone: "error", text: err instanceof ApiError ? err.message : "Could not change password." });
    }
  }

  return (
    <Card className="rise space-y-5 p-5 sm:p-6" style={rise(2)}>
      <SectionHead icon={ShieldCheck} title="Change password" hint="Use a strong password you don't use elsewhere." />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <IField
          id="current_password"
          label="Current password"
          icon={Lock}
          type={show.current ? "text" : "password"}
          autoComplete="current-password"
          error={errors.current_password?.message}
          trailing={<EyeToggle shown={show.current} onToggle={() => setShow((s) => ({ ...s, current: !s.current }))} />}
          {...register("current_password")}
        />
        <IField
          id="new_password"
          label="New password"
          icon={Lock}
          type={show.next ? "text" : "password"}
          autoComplete="new-password"
          error={errors.new_password?.message}
          trailing={<EyeToggle shown={show.next} onToggle={() => setShow((s) => ({ ...s, next: !s.next }))} />}
          {...register("new_password")}
        />

        <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {reqs.map((r) => (
            <li
              key={r.label}
              className={cn("flex items-center gap-2 text-xs", r.ok ? "text-brand-dark" : "text-muted")}
            >
              <span
                className={cn(
                  "grid size-4 shrink-0 place-items-center rounded-full transition-colors",
                  r.ok ? "bg-brand text-white" : "bg-black/[0.06] text-transparent",
                )}
              >
                <Check size={11} strokeWidth={3} />
              </span>
              {r.label}
            </li>
          ))}
        </ul>

        <IField
          id="confirm"
          label="Confirm new password"
          icon={Lock}
          type={show.confirm ? "text" : "password"}
          autoComplete="new-password"
          error={errors.confirm?.message}
          trailing={<EyeToggle shown={show.confirm} onToggle={() => setShow((s) => ({ ...s, confirm: !s.confirm }))} />}
          {...register("confirm")}
        />
        <NoticeBar notice={notice} />
        <div className="flex justify-end">
          <Button disabled={isSubmitting}>
            <ShieldCheck size={16} /> {isSubmitting ? "Saving..." : "Update password"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function SettingsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header className="max-w-2xl space-y-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Account</p>
        <h1 className="display text-3xl text-ink sm:text-4xl">Settings</h1>
        <p className="text-sm text-muted">Manage your account details and security.</p>
      </header>
      <AccountSummary />
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <ProfileCard />
        <PasswordCard />
      </div>
    </div>
  );
}
