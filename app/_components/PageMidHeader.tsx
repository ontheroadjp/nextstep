export function PageMidHeader({ title, href = "/" }: { title: string; href?: string }) {
  return (
    <section className="page-mid-header">
      <h1>
        <a className="page-mid-header-link" href={href}>
          <i className="fa-solid fa-arrow-circle-left" aria-hidden="true" /> {title}
        </a>
      </h1>
    </section>
  );
}
