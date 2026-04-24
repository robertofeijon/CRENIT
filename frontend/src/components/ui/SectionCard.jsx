export function SectionCard({ title, action, children, className = "" }) {
  return (
    <section className={`section-card ${className}`.trim()}>
      <div className="section-card-head">
        <h2>{title}</h2>
        {action || null}
      </div>
      {children}
    </section>
  );
}
