"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHero } from "../_components/PageHero";
import { useClientAuth } from "../_hooks/useClientAuth";

export default function LoginPage() {
  const router = useRouter();
  const {
    authProvider,
    setAuthProvider,
    isAuthenticated,
    isAuthLoading,
    authError,
    login,
    logout,
    tzOffset,
    setTzOffset,
  } = useClientAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    const ok = await login(email, password);
    if (ok) {
      setPassword("");
      router.push("/top");
    }
  };

  return (
    <main>
      <PageHero
        eyebrow="Welcome"
        title="Login"
        lead="公開版をご利用いただくにはログインしてください。"
      />

      <section className="grid">
        <div className="panel">
          {!isAuthenticated ? (
            <>
              <label>
                Login Method
                <select
                  value={authProvider}
                  onChange={(e) => setAuthProvider(e.target.value as typeof authProvider)}
                >
                  <option value="password">Email / Password</option>
                </select>
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  autoComplete="username"
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="password"
                  autoComplete="current-password"
                />
              </label>
              <label>
                TZ Offset (minutes)
                <input
                  value={tzOffset}
                  onChange={(e) => setTzOffset(e.target.value)}
                  placeholder="540"
                />
              </label>
              <div className="actions">
                <button onClick={handleLogin} disabled={isAuthLoading || !email.trim() || !password}>
                  {isAuthLoading ? "Logging in..." : "Login"}
                </button>
                <Link className="pill-link" href="/top">
                  Back
                </Link>
              </div>
              {authError && <p className="error">{authError}</p>}
            </>
          ) : (
            <>
              <p className="muted">ログイン済みです。ダッシュボードへ移動できます。</p>
              <div className="actions">
                <button onClick={() => router.push("/top")}>Go to Dashboard</button>
                <button onClick={logout}>Logout</button>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
