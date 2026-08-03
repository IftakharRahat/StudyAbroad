import { FormEvent, useState } from "react";
import { LogIn } from "lucide-react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../state/AuthContext";

export function LoginPage() {
  const { login, user } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("student@example.com");
  const [password, setPassword] = useState("Student@123");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    const destination = (location.state as { from?: Location } | null)?.from?.pathname ?? "/";
    return <Navigate to={destination} replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login({
        email,
        password
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to continue your study abroad planning.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Email">
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-moss"
            type="email"
            autoComplete="email"
          />
        </Field>
        <Field label="Password">
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-moss"
            type="password"
            autoComplete="current-password"
          />
        </Field>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-moss px-4 font-semibold text-white hover:bg-[#275c4e] disabled:opacity-60"
        >
          <LogIn className="h-4 w-4" aria-hidden="true" />
          <span>{submitting ? "Signing in" : "Sign in"}</span>
        </button>
        <p className="text-center text-sm text-slate-600">
          Need an account? <Link className="font-semibold text-moss" to="/register">Register</Link>
        </p>
      </form>
    </AuthShell>
  );
}

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f5ef] px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-ink">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
