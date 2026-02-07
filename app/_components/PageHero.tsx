import type { ReactNode } from "react";

export function PageHero({ eyebrow, title, lead }: { eyebrow: string; title: ReactNode; lead: string }) {
  return (
    <div className="hero page">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="lead">{lead}</p>
      </div>
    </div>
  );
}
