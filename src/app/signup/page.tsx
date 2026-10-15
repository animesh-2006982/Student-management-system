"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Signup() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");

    if (!name.trim() || !email.trim() || !password) {
      setError("Please fill all fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    const { error: signupError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          name: name.trim(),
        },
      },
    });

    if (signupError) {
      setError(signupError.message);
      return;
    }

    setDone(true);

    setTimeout(() => {
      router.push("/login");
    }, 800);
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand-mark">S</span>

          <div>
            <strong>STUDENTFLOW</strong>
            <small>Student Management</small>
          </div>
        </div>

        <p className="auth-kicker">GET STARTED</p>

        <h1>Create account</h1>

        <p className="auth-subtitle">
          Set up your administration workspace.
        </p>

        <form onSubmit={submit}>
          <label>
            Administrator name

            <input
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
            />
          </label>

          <label>
            Email

            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              autoComplete="email"
            />
          </label>

          <label>
            Password

            <input
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              autoComplete="new-password"
            />
          </label>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className={`auth-button ${done ? "done" : ""}`}
            disabled={done}
          >
            {done ? "Account created ✓" : "Create Account"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{" "}
          <a href="/login">Sign in</a>
        </p>
      </section>
    </main>
  );
}