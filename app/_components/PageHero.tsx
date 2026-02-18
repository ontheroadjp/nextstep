import type { ReactNode } from "react";

export function PageHero({
  eyebrow,
  title,
  lead,
  rightSlot,
}: {
  eyebrow: string;
  title: ReactNode;
  lead: string;
  rightSlot?: ReactNode;
}) {
  return (
    <div className="hero page">
      {rightSlot ? <div className="hero-top-right">{rightSlot}</div> : null}
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="lead">{lead}</p>
      </div>
    </div>
  );
}
