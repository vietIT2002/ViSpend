import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";

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
    new_password: z
      .string()
      .refine(
        strongPassword,
        "At least 8 characters with an uppercase letter, a lowercase letter, a number, and a special character",
      ),
    confirm: z.string(),
  })
  .refine((d) => d.new_password === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });
type PasswordForm = z.infer<typeof passwordSchema>;

function Notice({ tone, children }: { tone: "ok" | "error"; children: string }) {
  return (
    <p
      className={
        tone === "ok"
          ? "rounded-lg border border-brand/20 bg-brand-soft px-4 py-3 text-sm text-brand-dark"
          : "rounded-lg border border-pastel-red-ink/20 bg-pastel-red px-4 py-3 text-sm text-pastel-red-ink"
      }
    >
      {children}
    </p>
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
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  async function onSubmit(data: ProfileForm) {
    setNotice(null);
    try {
      await api.patch("/auth/me", {
        username: data.username,
        email: data.email ? data.email : null,
      });
      await refreshUser();
      setNotice({ tone: "ok", text: "Profile updated." });
    } catch (err) {
      setNotice({ tone: "error", text: err instanceof ApiError ? err.message : "Could not update profile." });
    }
  }

  return (
    <Card className="rise space-y-4 p-5">
      <div>
        <h2 className="font-medium text-ink">Personal information</h2>
        <p className="mt-1 text-sm text-muted">Update your username and contact email.</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="username">Username</Label>
          <Input id="username" autoComplete="username" {...register("username")} />
          {errors.username && <p className="mt-1 text-xs text-expense">{errors.username.message}</p>}
        </div>
        <div>
          <Label htmlFor="email">Email (optional)</Label>
          <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" {...register("email")} />
          {errors.email && <p className="mt-1 text-xs text-expense">{errors.email.message}</p>}
          <p className="mt-1 text-xs text-muted">Used for Google sign-in and password reset.</p>
        </div>
        {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
        <div className="flex justify-end">
          <Button disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save changes"}</Button>
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
    formState: { errors, isSubmitting },
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

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
    <Card className="rise space-y-4 p-5">
      <div>
        <h2 className="font-medium text-ink">Change password</h2>
        <p className="mt-1 text-sm text-muted">Pick a strong password you don&apos;t use elsewhere.</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="current_password">Current password</Label>
          <Input id="current_password" type="password" autoComplete="current-password" {...register("current_password")} />
          {errors.current_password && (
            <p className="mt-1 text-xs text-expense">{errors.current_password.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="new_password">New password</Label>
          <Input id="new_password" type="password" autoComplete="new-password" {...register("new_password")} />
          {errors.new_password && <p className="mt-1 text-xs text-expense">{errors.new_password.message}</p>}
        </div>
        <div>
          <Label htmlFor="confirm">Confirm new password</Label>
          <Input id="confirm" type="password" autoComplete="new-password" {...register("confirm")} />
          {errors.confirm && <p className="mt-1 text-xs text-expense">{errors.confirm.message}</p>}
        </div>
        {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
        <div className="flex justify-end">
          <Button disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Update password"}</Button>
        </div>
      </form>
    </Card>
  );
}

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <header className="max-w-2xl space-y-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Account</p>
        <h1 className="display text-3xl text-ink sm:text-4xl">Settings</h1>
        <p className="text-sm text-muted">Manage your account details and security.</p>
      </header>
      <div className="grid gap-4 lg:grid-cols-2">
        <ProfileCard />
        <PasswordCard />
      </div>
    </div>
  );
}
