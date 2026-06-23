import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

export default function AdminWorkspaceCard({
  title,
  desc,
  href,
  icon: Icon,
}: {
  title: string;
  desc: string;
  href: string;
  icon: LucideIcon;
}) {
  return (
    <Link href={href} className="group admin-workspace-card">
      <Icon className="h-5 w-5 text-[#C0392B]" aria-hidden />
      <p className="mt-3 font-semibold text-[var(--rc-text)] group-hover:text-[#C0392B]">{title}</p>
      <p className="mt-2 text-sm text-[var(--rc-text-secondary)]">{desc}</p>
    </Link>
  );
}
