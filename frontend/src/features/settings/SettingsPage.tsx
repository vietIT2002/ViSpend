import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Eye, EyeOff } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useForm, type FieldPath, type FieldValues, type UseFormSetError } from "react-hook-form";
import { z } from "zod";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardHeader } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { FieldError, FieldHint, Label } from "../../components/ui/label";
import { LanguageToggle } from "../../components/ui/language-toggle";
import { PageHeader } from "../../components/ui/page-header";
import { InlineAlert } from "../../components/ui/states";
import { useToast } from "../../components/ui/toast";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useErrorText, useT } from "../../lib/i18n";
import type { TKey } from "../../lib/i18n/en";
import { useUnsavedChangesGuard } from "../../lib/use-unsaved-changes";
import { cn } from "../../lib/utils";

const strongPassword = (v: string) =>
  v.length >= 8 && /[A-Z]/.test(v) && /[a-z]/.test(v) && /\d/.test(v) && /[^A-Za-z0-9]/.test(v);

// zod messages are i18n keys; they are translated with t() at render time.
const profileSchema = z.object({
  username: z.string().regex(/^[a-z0-9]{3,20}$/, "settings.err.usernameRule"),
  full_name: z.union([z.string().max(80, "settings.err.nameTooLong"), z.literal("")]),
  phone: z.union([z.string().regex(/^[0-9+\-\s]{6,20}$/, "settings.err.invalidPhone"), z.literal("")]),
});
type ProfileForm = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    current_password: z.string().min(1, "settings.err.currentRequired"),
    new_password: z.string().refine(strongPassword, "settings.err.weakPassword"),
    confirm: z.string().min(1, "settings.err.confirmRequired"),
  })
  .refine((d) => d.new_password === d.confirm, {
    message: "settings.err.passwordMismatch",
    path: ["confirm"],
  });
type PasswordForm = z.infer<typeof passwordSchema>;

/** Server codes that belong to one field are shown under that field. */
const FIELD_ERRORS: Record<string, string> = {
  username_taken: "username",
  current_password_incorrect: "current_password",
};

function useServerErrorHandler<T extends FieldValues>(setError: UseFormSetError<T>) {
  const errText = useErrorText();
  return (err: unknown, fallback: TKey): string | null => {
    const field = err instanceof ApiError ? FIELD_ERRORS[err.message] : undefined;
    if (field) {
      setError(field as FieldPath<T>, { type: "server", message: errText(err) }, { shouldFocus: true });
      return null;
    }
    return errText(err, fallback);
  };
}

function Field({
  id,
  label,
  required,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      {children}
      {error ? <FieldError id={`${id}-error`} message={error} /> : hint && <FieldHint id={`${id}-hint`}>{hint}</FieldHint>}
    </div>
  );
}

/** aria wiring for a field rendered by <Field>. */
const describe = (id: string, error?: unknown, hint?: boolean) => ({
  id,
  "aria-invalid": error ? true : undefined,
  "aria-describedby": error ? `${id}-error` : hint ? `${id}-hint` : undefined,
});

function FormFooter({ dirty, submitting, onReset, submitLabel }: { dirty: boolean; submitting: boolean; onReset: () => void; submitLabel: string }) {
  const t = useT();
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
      <span role="status" className="mr-auto text-sm text-muted">
        {dirty ? t("unsaved.indicator") : ""}
      </span>
      {dirty && (
        <Button type="button" variant="secondary" onClick={onReset} disabled={submitting}>
          {t("common.cancel")}
        </Button>
      )}
      <Button type="submit" loading={submitting}>
        {submitLabel}
      </Button>
    </div>
  );
}

function PasswordInput({ shown, onToggle, ...props }: { shown: boolean; onToggle: () => void } & React.ComponentProps<"input">) {
  const t = useT();
  return (
    <div className="relative">
      <Input type={shown ? "text" : "password"} className="pr-11" {...props} />
      <button
        type="button"
        onClick={onToggle}
        aria-label={shown ? t("auth.hidePassword") : t("auth.showPassword")}
        aria-pressed={shown}
        className="absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded text-muted transition-colors hover:bg-black/[0.05] hover:text-ink"
      >
        {shown ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
      </button>
    </div>
  );
}

function AccountSummary() {
  const { user } = useAuth();
  const t = useT();
  const initial = (user?.full_name ?? user?.username ?? user?.email ?? "?").charAt(0).toUpperCase();
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-base font-semibold text-brand"
          aria-hidden="true"
        >
          {initial}
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-ink">
            {user?.full_name || user?.username || t("settings.yourAccount")}
          </p>
          <p className="truncate text-sm text-muted">
            {user?.username && <span className="nums">@{user.username}</span>}
            {user?.username && " · "}
            {user?.email ? (
              <a href={`mailto:${user.email}`} className="hover:underline">
                {user.email}
              </a>
            ) : (
              t("settings.noEmail")
            )}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Badge tone={user?.is_verified ? "success" : "warning"}>
            {user?.is_verified ? t("settings.verified") : t("settings.unverified")}
          </Badge>
          {user?.is_google && <Badge tone="neutral">{t("settings.googleAccount")}</Badge>}
        </div>
      </div>
    </Card>
  );
}

function ProfileCard({ onDirtyChange }: { onDirtyChange: (dirty: boolean) => void }) {
  const { user, refreshUser } = useAuth();
  const t = useT();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    mode: "onTouched",
    values: { username: user?.username ?? "", full_name: user?.full_name ?? "", phone: user?.phone ?? "" },
  });
  const handleServerError = useServerErrorHandler(setError);
  const [formError, setFormError] = useState<string | null>(null);
  // Schema messages are i18n keys; server messages are already translated (t returns them unchanged).
  const msg = (m?: string) => (m ? t(m as TKey) : undefined);

  useEffect(() => onDirtyChange(isDirty), [isDirty, onDirtyChange]);

  async function onSubmit(data: ProfileForm) {
    setFormError(null);
    try {
      await api.patch("/auth/me", {
        username: data.username,
        full_name: data.full_name ? data.full_name : null,
        phone: data.phone ? data.phone : null,
      });
      await refreshUser();
      toast(t("settings.profileUpdated"));
    } catch (err) {
      setFormError(handleServerError(err, "settings.profileUpdateError"));
    }
  }

  return (
    <Card>
      <CardHeader title={t("settings.profileTitle")} description={t("settings.profileHint")} />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 p-4">
        <Field id="full_name" label={t("settings.fullName")} error={msg(errors.full_name?.message)}>
          <Input
            autoComplete="name"
            placeholder={t("settings.fullNamePlaceholder")}
            className="sm:max-w-md"
            {...describe("full_name", errors.full_name)}
            {...register("full_name")}
          />
        </Field>
        <Field
          id="username"
          label={t("settings.username")}
          required
          error={msg(errors.username?.message)}
          hint={t("settings.err.usernameRule")}
        >
          <Input
            autoComplete="username"
            aria-required="true"
            className="sm:max-w-xs"
            {...describe("username", errors.username, true)}
            {...register("username")}
          />
        </Field>
        <Field id="phone" label={t("settings.phone")} error={msg(errors.phone?.message)}>
          <Input
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder={t("settings.phonePlaceholder")}
            className="nums sm:max-w-xs"
            {...describe("phone", errors.phone)}
            {...register("phone")}
          />
        </Field>
        <Field id="email" label={t("settings.email")} hint={t("settings.emailFixedHint")}>
          <Input type="email" value={user?.email ?? "—"} readOnly disabled className="sm:max-w-md" {...describe("email", null, true)} />
        </Field>
        {formError && <InlineAlert tone="error">{formError}</InlineAlert>}
        <FormFooter dirty={isDirty} submitting={isSubmitting} onReset={() => reset()} submitLabel={t("common.saveChanges")} />
      </form>
    </Card>
  );
}

function PasswordCard({ onDirtyChange }: { onDirtyChange: (dirty: boolean) => void }) {
  const t = useT();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    mode: "onTouched",
    defaultValues: { current_password: "", new_password: "", confirm: "" },
  });
  const handleServerError = useServerErrorHandler(setError);
  const [formError, setFormError] = useState<string | null>(null);
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const msg = (m?: string) => (m ? t(m as TKey) : undefined);

  useEffect(() => onDirtyChange(isDirty), [isDirty, onDirtyChange]);

  const newPw = watch("new_password") ?? "";
  const reqs = [
    { ok: newPw.length >= 8, label: t("settings.req.length") },
    { ok: /[A-Z]/.test(newPw) && /[a-z]/.test(newPw), label: t("settings.req.case") },
    { ok: /\d/.test(newPw), label: t("settings.req.number") },
    { ok: /[^A-Za-z0-9]/.test(newPw), label: t("settings.req.special") },
  ];

  async function onSubmit(data: PasswordForm) {
    setFormError(null);
    try {
      await api.post("/auth/change-password", {
        current_password: data.current_password,
        new_password: data.new_password,
      });
      reset({ current_password: "", new_password: "", confirm: "" });
      toast(t("settings.passwordUpdated"));
    } catch (err) {
      setFormError(handleServerError(err, "settings.passwordChangeError"));
    }
  }

  return (
    <Card>
      <CardHeader title={t("settings.passwordTitle")} description={t("settings.passwordHint")} />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 p-4">
        <Field id="current_password" label={t("settings.currentPassword")} required error={msg(errors.current_password?.message)}>
          <div className="sm:max-w-sm">
            <PasswordInput
              shown={show.current}
              onToggle={() => setShow((s) => ({ ...s, current: !s.current }))}
              autoComplete="current-password"
              aria-required="true"
              {...describe("current_password", errors.current_password)}
              {...register("current_password")}
            />
          </div>
        </Field>
        <Field id="new_password" label={t("settings.newPassword")} required error={msg(errors.new_password?.message)}>
          <div className="sm:max-w-sm">
            <PasswordInput
              shown={show.next}
              onToggle={() => setShow((s) => ({ ...s, next: !s.next }))}
              autoComplete="new-password"
              aria-required="true"
              {...describe("new_password", errors.new_password)}
              aria-describedby={cn(errors.new_password && "new_password-error", "password-reqs")}
              {...register("new_password")}
            />
          </div>
          <ul id="password-reqs" className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-2 sm:max-w-sm">
            {reqs.map((r) => (
              <li key={r.label} className={cn("flex items-center gap-2 text-sm", r.ok ? "text-pastel-green-ink" : "text-muted")}>
                <span
                  className={cn(
                    "grid size-4 shrink-0 place-items-center rounded-full",
                    r.ok ? "bg-brand text-white" : "border border-line-strong text-transparent",
                  )}
                  aria-hidden="true"
                >
                  <Check size={11} strokeWidth={3} />
                </span>
                {r.label}
                <span className="sr-only">{r.ok ? t("settings.req.met") : t("settings.req.notMet")}</span>
              </li>
            ))}
          </ul>
        </Field>
        <Field id="confirm" label={t("settings.confirmPassword")} required error={msg(errors.confirm?.message)}>
          <div className="sm:max-w-sm">
            <PasswordInput
              shown={show.confirm}
              onToggle={() => setShow((s) => ({ ...s, confirm: !s.confirm }))}
              autoComplete="new-password"
              aria-required="true"
              {...describe("confirm", errors.confirm)}
              {...register("confirm")}
            />
          </div>
        </Field>
        {formError && <InlineAlert tone="error">{formError}</InlineAlert>}
        <FormFooter
          dirty={isDirty}
          submitting={isSubmitting}
          onReset={() => reset({ current_password: "", new_password: "", confirm: "" })}
          submitLabel={t("settings.updatePassword")}
        />
      </form>
    </Card>
  );
}

function LanguageCard() {
  const t = useT();
  return (
    <Card>
      <CardHeader title={t("language.label")} description={t("language.hint")} />
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <span className="text-sm text-charcoal">{t("language.appliesNow")}</span>
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
  const [profileDirty, setProfileDirty] = useState(false);
  const [passwordDirty, setPasswordDirty] = useState(false);
  const leaveDialog = useUnsavedChangesGuard(profileDirty || passwordDirty);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title={t("settings.title")} />
      <AccountSummary />
      <ProfileCard onDirtyChange={setProfileDirty} />
      {showPassword && <PasswordCard onDirtyChange={setPasswordDirty} />}
      <LanguageCard />
      {leaveDialog}
    </div>
  );
}
