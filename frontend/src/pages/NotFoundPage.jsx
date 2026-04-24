import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="auth-page">
      <section className="auth-card">
        <h1>Page Not Found</h1>
        <p className="subtitle">The page you are looking for does not exist.</p>
        <Link to="/tenant/welcome" className="button-link">Back to Tenant Home</Link>
      </section>
    </div>
  );
}
