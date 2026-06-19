import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Eye, EyeOff, IdCard, Languages, Lock, Mail, Phone, ShieldCheck, UserRound } from "lucide-react";
import { useState, type CSSProperties, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { LanguageToggle } from "../../components/ui/language-toggle";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useT } from "../../lib/i18n";
import type { TKey } from "../../lib/i18n/en";
import { cn } from "../../lib/utils";

const strongPassword = (v: string) =>
  v.length >= 8 &&
  /[A-Z]/.test(v) &&
  /[a-z]/.test(v) &&
  /\d/.test(v) &&
  /[^A-Za-z0-9]/.test(v);

// zod messages are i18n keys; they are translated with t() at render time.
const profileSchema = z.object({
  username: z.string().regex(/^[a-z0-9]{3,20}$/, "settings.err.usernameRule"),
  full_name: z.union([z.string().max(80, "settings.err.nameTooLong"), z.literal("")]),
  phone: z.union([
    z.string().regex(/^[0-9+\-\s]{6,20}$/, "settings.err.invalidPhone"),
    z.literal(""),
  ]),
});
type ProfileForm = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    current_password: z.string().min(1, "settings.err.currentRequired"),
    new_password: z.string().refine(strongPassword, "settings.err.weakPassword"),
    confirm: z.string(),
  })
  .refine((d) => d.new_password === d.confirm, {
    message: "settings.err.passwordMismatch",
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
  const t = useT();
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? t("auth.hidePassword") : t("auth.showPassword")}
      className="absolute right-2.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted transition-colors hover:bg-black/[0.04] hover:text-ink"
    >
      {shown ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );
}

function AccountSummary() {
  const { user } = useAuth();
  const t = useT();
  const initial = (user?.username ?? user?.email ?? "?").charAt(0).toUpperCase();
  return (
    <Card className="rise p-5" style={rise(0)}>
      <div className="flex flex-wrap items-center gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-brand text-2xl font-semibold text-white">
          {initial}
        </span>
        <div className="min-w-0">
          <p className="display truncate text-2xl text-ink">{user?.username ?? t("settings.yourAccount")}</p>
          <p className="nums truncate text-sm text-muted">{user?.email ?? t("settings.noEmail")}</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Badge tone={user?.is_verified ? "green" : "neutral"}>
            {user?.is_verified ? t("settings.verified") : t("settings.unverified")}
          </Badge>
          <Badge tone={user?.email ? "blue" : "neutral"}>
            {user?.email ? t("settings.emailLinked") : t("settings.noEmailBadge")}
          </Badge>
        </div>
      </div>
    </Card>
  );
}

function ProfileCard() {
  const { user, refreshUser } = useAuth();
  const t = useT();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: {
      username: user?.username ?? "",
      full_name: user?.full_name ?? "",
      phone: user?.phone ?? "",
    },
  });
  const [notice, setNotice] = useState<Notice>(null);

  async function onSubmit(data: ProfileForm) {
    setNotice(null);
    try {
      await api.patch("/auth/me", {
        username: data.username,
        full_name: data.full_name ? data.full_name : null,
        phone: data.phone ? data.phone : null,
      });
      await refreshUser();
      setNotice({ tone: "ok", text: t("settings.profileUpdated") });
    } catch (err) {
      setNotice({
        tone: "error",
        text: err instanceof ApiError ? t(`errors.${err.message}` as TKey) : t("settings.profileUpdateError"),
      });
    }
  }

  return (
    <Card className="rise space-y-5 p-5 sm:p-6" style={rise(1)}>
      <SectionHead icon={UserRound} title={t("settings.profileTitle")} hint={t("settings.profileHint")} />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <IField
          id="full_name"
          label={t("settings.fullName")}
          icon={IdCard}
          placeholder={t("settings.fullNamePlaceholder")}
          error={errors.full_name?.message ? t(errors.full_name.message as TKey) : undefined}
          {...register("full_name")}
        />
        <IField
          id="username"
          label={t("settings.username")}
          icon={UserRound}
          autoComplete="username"
          error={errors.username?.message ? t(errors.username.message as TKey) : undefined}
          {...register("username")}
        />
        <IField
          id="phone"
          label={t("settings.phone")}
          icon={Phone}
          placeholder={t("settings.phonePlaceholder")}
          error={errors.phone?.message ? t(errors.phone.message as TKey) : undefined}
          {...register("phone")}
        />
        <div>
          <Label htmlFor="email">{t("settings.emailFixed")}</Label>
          <div className="relative">
            <Mail
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <Input
              id="email"
              value={user?.email ?? "—"}
              disabled
              readOnly
              className="cursor-not-allowed bg-canvas pl-9 text-muted"
            />
          </div>
        </div>
        <NoticeBar notice={notice} />
        <div className="flex justify-end">
          <Button disabled={isSubmitting}>
            <Check size={16} /> {isSubmitting ? t("common.saving") : t("common.saveChanges")}
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
  const t = useT();
  const [notice, setNotice] = useState<Notice>(null);
  const [show, setShow] = useState({ current: false, next: false, confirm: false });

  const newPw = watch("new_password") ?? "";
  const reqs = [
    { ok: newPw.length >= 8, label: t("settings.req.length") },
    { ok: /[A-Z]/.test(newPw) && /[a-z]/.test(newPw), label: t("settings.req.case") },
    { ok: /\d/.test(newPw), label: t("settings.req.number") },
    { ok: /[^A-Za-z0-9]/.test(newPw), label: t("settings.req.special") },
  ];

  async function onSubmit(data: PasswordForm) {
    setNotice(null);
    try {
      await api.post("/auth/change-password", {
        current_password: data.current_password,
        new_password: data.new_password,
      });
      reset({ current_password: "", new_password: "", confirm: "" });
      setNotice({ tone: "ok", text: t("settings.passwordUpdated") });
    } catch (err) {
      setNotice({
        tone: "error",
        text: err instanceof ApiError ? t(`errors.${err.message}` as TKey) : t("settings.passwordChangeError"),
      });
    }
  }

  return (
    <Card className="rise space-y-5 p-5 sm:p-6" style={rise(2)}>
      <SectionHead icon={ShieldCheck} title={t("settings.passwordTitle")} hint={t("settings.passwordHint")} />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <IField
          id="current_password"
          label={t("settings.currentPassword")}
          icon={Lock}
          type={show.current ? "text" : "password"}
          autoComplete="current-password"
          error={errors.current_password?.message ? t(errors.current_password.message as TKey) : undefined}
          trailing={<EyeToggle shown={show.current} onToggle={() => setShow((s) => ({ ...s, current: !s.current }))} />}
          {...register("current_password")}
        />
        <IField
          id="new_password"
          label={t("settings.newPassword")}
          icon={Lock}
          type={show.next ? "text" : "password"}
          autoComplete="new-password"
          error={errors.new_password?.message ? t(errors.new_password.message as TKey) : undefined}
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
          label={t("settings.confirmPassword")}
          icon={Lock}
          type={show.confirm ? "text" : "password"}
          autoComplete="new-password"
          error={errors.confirm?.message ? t(errors.confirm.message as TKey) : undefined}
          trailing={<EyeToggle shown={show.confirm} onToggle={() => setShow((s) => ({ ...s, confirm: !s.confirm }))} />}
          {...register("confirm")}
        />
        <NoticeBar notice={notice} />
        <div className="flex justify-end">
          <Button disabled={isSubmitting}>
            <ShieldCheck size={16} /> {isSubmitting ? t("common.saving") : t("settings.updatePassword")}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function LanguageCard() {
  const t = useT();
  return (
    <Card className="rise space-y-4 p-5 sm:p-6" style={rise(3)}>
      <SectionHead icon={Languages} title={t("language.label")} hint={t("language.hint")} />
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-ink">{t("language.label")}</span>
        <LanguageToggle />
      </div>
    </Card>
  );
}

export function SettingsPage() {
  const { user } = useAuth();
  const t = useT();
  // Google accounts sign in through Google, so there's no password to change.
  const showPassword = user ? !user.is_google : false;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header className="max-w-2xl space-y-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">{t("settings.account")}</p>
        <h1 className="display text-3xl text-ink sm:text-4xl">{t("settings.title")}</h1>
        <p className="text-sm text-muted">{t("settings.subtitle")}</p>
      </header>
      <AccountSummary />
      <div className={cn("grid items-start gap-5", showPassword && "lg:grid-cols-2")}>
        <ProfileCard />
        {showPassword && <PasswordCard />}
      </div>
      <LanguageCard />
    </div>
  );
}
