"use client";

import Link from "next/link";
import { PageHero } from "./_components/PageHero";
import { useClientAuth } from "./_hooks/useClientAuth";

export default function HomePage() {
  const { isAuthenticated } = useClientAuth();

  return (
    <main>
      <PageHero
        eyebrow="Nextstep"
        title="Welcome"
        lead="公開版をご利用いただくにはログインしてください。"
      />

      <section className="grid">
        <div className="panel">
          <h2 className="with-icon">
            <span className="title-icon">
              <i className="fa-solid fa-right-to-bracket" aria-hidden />
            </span>
            ログインが必要です
          </h2>
          <p className="muted">
            {isAuthenticated
              ? "ログイン済みです。ダッシュボードへ進んでください。"
              : "ログインページから認証してください。"}
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
