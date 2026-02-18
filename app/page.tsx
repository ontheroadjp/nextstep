"use client";

import Link from "next/link";
import { LocaleSwitcher } from "./_components/LocaleSwitcher";
import { PageHero } from "./_components/PageHero";
import { useClientAuth } from "./_hooks/useClientAuth";
import { useLocale } from "./_hooks/useLocale";
import { t } from "./_lib/i18n";

export default function HomePage() {
  const { isAuthenticated } = useClientAuth();
  const { locale, setLocale } = useLocale();

  return (
    <main>
      <PageHero
        eyebrow="Nextstep"
        title="Welcome"
        lead={t(locale, "hero_public_lead")}
        rightSlot={<LocaleSwitcher locale={locale} setLocale={setLocale} />}
      />

      <section className="grid">
        <div className="panel">
          <h2 className="with-icon">
            <span className="title-icon">
              <i className="fa-solid fa-right-to-bracket" aria-hidden />
            </span>
            {t(locale, "home_login_required")}
          </h2>
          <p className="muted">
            {isAuthenticated
              ? t(locale, "home_authenticated")
              : t(locale, "home_unauthenticated")}
          </p>
          <div className="actions">
            {!isAuthenticated ? (
              <Link className="pill-link" href="/login">
                Login
              </Link>
            ) : (
              <Link className="pill-link" href="/top">
                Go to Top
              </Link>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
