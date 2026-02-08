import Link from "next/link";

export function PageMidHeader({ title, href = "/" }: { title: string; href?: string }) {
  return (
    <section className="page-mid-header">
      <h1>
        <Link className="page-mid-header-link" href={href}>
          <i className="fa-solid fa-arrow-circle-left" aria-hidden="true" /> {title}
        </Link>
      </h1>
    </section>
  );
}
