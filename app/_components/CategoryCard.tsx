import type { ReactNode } from "react";
import Link from "next/link";
import { t, type AppLocale } from "../_lib/i18n";

type ViewStatus = "idle" | "loading" | "error" | "ready";

type CategoryCardProps = {
  locale: AppLocale;
  title: string;
  href?: string;
  status?: ViewStatus;
  detail?: string;
  showDetail?: boolean;
  icon?: ReactNode;
};

export function CategoryCard({
  locale,
  title,
  href,
  status = "ready",
  detail,
  showDetail = false,
  icon,
}: CategoryCardProps) {
  const body = (
    <div className="view-card">
      <div className="view-header">
        <h2 className="with-icon">
          {icon && <span className="title-icon">{icon}</span>}
          {title}
        </h2>
        <span className="badge">{status === "loading" ? "…" : "-"}</span>
      </div>
      {status === "error" && <p className="error">{detail ?? t(locale, "failed_to_load")}</p>}
      {status === "loading" && <p className="muted">{t(locale, "loading")}</p>}
      {status === "idle" && <p className="muted">{t(locale, "no_data_yet")}</p>}
      {showDetail && status === "ready" && <p className="detail">{detail}</p>}
    </div>
  );

  return href ? <Link className="card-link" href={href}>{body}</Link> : body;
}
