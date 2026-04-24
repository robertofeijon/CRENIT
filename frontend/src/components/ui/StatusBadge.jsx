export function StatusBadge({ status }) {
  const normalized = String(status || "unknown").toLowerCase();
  return <span className={`status-badge ${normalized}`}>{status || normalized}</span>;
}
