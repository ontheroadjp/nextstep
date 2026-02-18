import type { Dispatch, SetStateAction } from "react";

import type { AuthProvider } from "../_hooks/useClientAuth";
import { t, type AppLocale } from "../_lib/i18n";

type AccessSettingsFooterProps = {
  locale: AppLocale;
  authProvider: AuthProvider;
  setAuthProvider: Dispatch<SetStateAction<AuthProvider>>;
  loginEmail: string;
  setLoginEmail: Dispatch<SetStateAction<string>>;
  loginPassword: string;
  setLoginPassword: Dispatch<SetStateAction<string>>;
  onLogin: () => void;
  onLogout: () => void;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  authError: string | null;
  tzOffset: string;
  setTzOffset: Dispatch<SetStateAction<string>>;
  onRefresh: () => void;
  canFetch: boolean;
};

export function AccessSettingsFooter({
  locale,
  authProvider,
  setAuthProvider,
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  onLogin,
  onLogout,
  isAuthenticated,
  isAuthLoading,
  authError,
  tzOffset,
  setTzOffset,
  onRefresh,
  canFetch,
}: AccessSettingsFooterProps) {
  return (
    <footer className="footer-panel">
      <div className="panel">
        {!isAuthenticated && (
          <>
            <label>
              {t(locale, "login_method")}
              <select value={authProvider} onChange={(e) => setAuthProvider(e.target.value as AuthProvider)}>
                <option value="password">Email / Password</option>
              </select>
            </label>
            <label>
              {t(locale, "email")}
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="email@example.com"
                autoComplete="username"
              />
            </label>
            <label>
              {t(locale, "password")}
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="password"
                autoComplete="current-password"
              />
            </label>
          </>
        )}
        <label>
          {t(locale, "tz_offset")}
          <input value={tzOffset} onChange={(e) => setTzOffset(e.target.value)} placeholder="540" />
        </label>
        <div className="actions">
          <button onClick={onRefresh} disabled={!canFetch}>
            {t(locale, "refresh")}
          </button>
          {!isAuthenticated && (
            <button onClick={onLogin} disabled={isAuthLoading || !loginEmail.trim() || !loginPassword}>
              {isAuthLoading ? t(locale, "logging_in") : t(locale, "login")}
            </button>
          )}
          {isAuthenticated && <button onClick={onLogout}>{t(locale, "logout")}</button>}
          {authError && <span className="error">{authError}</span>}
        </div>
      </div>
    </footer>
  );
}
