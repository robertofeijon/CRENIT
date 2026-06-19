type TimelineEvent = {
  event_type: string;
  message: string;
  created_at: string;
};

type Props = {
  timeline: TimelineEvent[];
  className?: string;
};

export default function DisputeTimeline({ timeline, className = '' }: Props) {
  if (!timeline?.length) {
    return <p className={`text-sm text-slate-500 ${className}`}>No timeline events yet.</p>;
  }

  return (
    <ul className={`space-y-3 ${className}`}>
      {timeline.map((ev, i) => (
        <li key={`${ev.created_at}-${i}`} className="relative rounded-xl border border-slate-100 bg-white p-4 pl-5">
          <span className="absolute left-0 top-4 h-full w-1 rounded-full bg-[#C0392B]/30" aria-hidden />
          <p className="text-xs font-semibold uppercase tracking-wide text-[#C0392B]">{ev.event_type.replace(/_/g, ' ')}</p>
          <p className="mt-1 text-sm text-[#1A1A1A]">{ev.message}</p>
          <p className="mt-1 text-xs text-slate-400">{new Date(ev.created_at).toLocaleString()}</p>
        </li>
      ))}
    </ul>
  );
}
