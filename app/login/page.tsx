"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LocaleSwitcher } from "../_components/LocaleSwitcher";
import { PageHero } from "../_components/PageHero";
import { useClientAuth } from "../_hooks/useClientAuth";
import { useLocale } from "../_hooks/useLocale";
import { t } from "../_lib/i18n";

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
  const { locale, setLocale } = useLocale();
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
        lead={t(locale, "hero_public_lead")}
        rightSlot={<LocaleSwitcher locale={locale} setLocale={setLocale} />}
      />

      <section className="grid">
        <div className="panel">
          {!isAuthenticated ? (
            <>
              <label>
                {t(locale, "login_method")}
                <select
                  value={authProvider}
                  onChange={(e) => setAuthProvider(e.target.value as typeof authProvider)}
                >
                  <option value="password">Email / Password</option>
                </select>
              </label>
              <label>
                {t(locale, "email")}
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  autoComplete="username"
                />
              </label>
              <label>
                {t(locale, "password")}
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="password"
                  autoComplete="current-password"
                />
              </label>
              <label>
                {t(locale, "tz_offset")}
                <input
                  value={tzOffset}
                  onChange={(e) => setTzOffset(e.target.value)}
                  placeholder="540"
                />
              </label>
              <div className="actions">
                <button onClick={handleLogin} disabled={isAuthLoading || !email.trim() || !password}>
                  {isAuthLoading ? t(locale, "logging_in") : t(locale, "login")}
                </button>
                <Link className="pill-link" href="/top">
                  {t(locale, "back")}
                </Link>
              </div>
              {authError && <p className="error">{authError}</p>}
            </>
          ) : (
            <>
              <p className="muted">{t(locale, "already_logged_in_dashboard")}</p>
              <div className="actions">
                <button onClick={() => router.push("/top")}>{t(locale, "go_to_dashboard")}</button>
                <button onClick={logout}>{t(locale, "logout")}</button>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
