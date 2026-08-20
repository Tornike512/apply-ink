"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-sand bg-surface px-3.5 py-2.5 text-sm text-espresso outline-none transition-colors placeholder:text-espresso/35 focus:border-terracotta";
const buttonClass =
  "mt-2 w-full rounded-xl bg-sienna px-5 py-3 text-sm font-bold text-cream transition-colors hover:bg-espresso disabled:cursor-wait disabled:opacity-60";

async function errorMessage(response: Response, fallback: string): Promise<string> {
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  return data.error ?? fallback;
}

export function LoginForm({ nextPath = "/dashboard/jobs" }: { nextPath?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json", "x-apply-ink": "1" },
        body: JSON.stringify({ email: data.get("email"), password: data.get("password") }),
      });
      if (!response.ok) throw new Error(await errorMessage(response, "Could not log in."));
      router.replace(nextPath);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not log in.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <label className="text-sm font-medium text-espresso">Email
        <input name="email" type="email" autoComplete="email" required className={inputClass} />
      </label>
      <label className="text-sm font-medium text-espresso">Password
        <input name="password" type="password" autoComplete="current-password" required className={inputClass} />
      </label>
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-xs font-semibold text-sienna hover:text-espresso">Forgot password?</Link>
      </div>
      {error && <p role="alert" className="text-sm text-sienna">{error}</p>}
      <button type="submit" disabled={pending} className={buttonClass}>{pending ? "Logging in..." : "Log in"}</button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [resetPath, setResetPath] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setMessage(null);
    setResetPath(null);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json", "x-apply-ink": "1" },
        body: JSON.stringify({ email: data.get("email") }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string; message?: string; resetPath?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not start recovery.");
      setMessage(result.message ?? "Check your email for the reset link.");
      setResetPath(result.resetPath ?? null);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Could not start recovery.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <label className="text-sm font-medium text-espresso">Account email
        <input name="email" type="email" autoComplete="email" required className={inputClass} />
      </label>
      {message && <p aria-live="polite" className="text-sm leading-6 text-espresso/65">{message}</p>}
      {resetPath && <Link href={resetPath} className="rounded-xl border border-success/30 bg-success/8 px-4 py-3 text-center text-sm font-bold text-success">Open local reset link</Link>}
      <button type="submit" disabled={pending} className={buttonClass}>{pending ? "Preparing link..." : "Reset password"}</button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "");
    const confirmation = String(data.get("confirmation") ?? "");
    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json", "x-apply-ink": "1" },
        body: JSON.stringify({ token, password }),
      });
      if (!response.ok) throw new Error(await errorMessage(response, "Could not reset the password."));
      router.replace("/login?reset=1");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not reset the password.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <label className="text-sm font-medium text-espresso">New password
        <input name="password" type="password" autoComplete="new-password" minLength={10} required className={inputClass} />
      </label>
      <label className="text-sm font-medium text-espresso">Confirm password
        <input name="confirmation" type="password" autoComplete="new-password" minLength={10} required className={inputClass} />
      </label>
      <p className="text-xs leading-5 text-espresso/50">Use at least 10 characters with a letter and a number.</p>
      {error && <p role="alert" className="text-sm text-sienna">{error}</p>}
      <button type="submit" disabled={pending || !token} className={buttonClass}>{pending ? "Saving password..." : "Save new password"}</button>
    </form>
  );
}
