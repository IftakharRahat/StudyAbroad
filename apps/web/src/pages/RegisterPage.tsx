import { FormEvent, useState } from "react";
import { UserPlus } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";

export function RegisterPage() {
  const { register, user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await register({
        name,
        email,
        password
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f5ef] px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-ink">Create student account</h1>
        <p className="mt-2 text-sm text-slate-600">Start with authentication, then complete your academic profile.</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Field label="Name">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-moss"
              type="text"
              autoComplete="name"
            />
          </Field>
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
              autoComplete="new-password"
            />
          </Field>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-moss px-4 font-semibold text-white hover:bg-[#275c4e] disabled:opacity-60"
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            <span>{submitting ? "Creating account" : "Create account"}</span>
          </button>
          <p className="text-center text-sm text-slate-600">
            Already registered? <Link className="font-semibold text-moss" to="/login">Sign in</Link>
          </p>
        </form>
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
